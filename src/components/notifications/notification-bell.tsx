'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCircle2,
  MessageSquare,
  AtSign,
  UserPlus,
  ShieldAlert,
  X,
  Trash2,
  Sparkles,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'comment'
  | 'mention'
  | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read: boolean;
  created_at: string;
}

const TYPE_STYLES: Record<NotificationType, { icon: typeof Bell; iconClass: string; bgClass: string }> = {
  task_assigned: {
    icon: UserPlus,
    iconClass: 'text-sky-500 dark:text-sky-300',
    bgClass: 'bg-sky-500/10 dark:bg-sky-500/15',
  },
  task_completed: {
    icon: CheckCircle2,
    iconClass: 'text-status-success dark:text-emerald-300',
    bgClass: 'bg-status-success/10 dark:bg-status-success/15',
  },
  comment: {
    icon: MessageSquare,
    iconClass: 'text-primary dark:text-primary/70',
    bgClass: 'bg-primary/10 dark:bg-primary/15',
  },
  mention: {
    icon: AtSign,
    iconClass: 'text-amber-500 text-status-warning',
    bgClass: 'bg-status-warning/10 dark:bg-status-warning/15',
  },
  system: {
    icon: ShieldAlert,
    iconClass: 'text-rose-500 dark:text-rose-300',
    bgClass: 'bg-rose-500/10 dark:bg-rose-500/15',
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function formatRelativeTime(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = date.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60, unit: 'second' },
    { amount: 60, unit: 'minute' },
    { amount: 24, unit: 'hour' },
    { amount: 7, unit: 'day' },
    { amount: 4.34524, unit: 'week' },
    { amount: 12, unit: 'month' },
    { amount: Number.POSITIVE_INFINITY, unit: 'year' },
  ];

  let duration = diffSeconds;
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return rtf.format(Math.round(duration), 'year');
}

function formatDateLabel(date: Date) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfThatDay = new Date(date);
  startOfThatDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startOfToday.getTime() - startOfThatDay.getTime()) / DAY_MS);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDateKey(date: Date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day.toISOString();
}

function groupNotifications(notifications: NotificationItem[]) {
  const grouped = notifications.reduce<Record<string, NotificationItem[]>>((acc, notification) => {
    const date = new Date(notification.created_at);
    const key = getDateKey(date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(notification);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([key, items]) => ({
      key,
      label: formatDateLabel(new Date(key)),
      items,
    }));
}

function getEntityLink(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) return '/changelog?tab=activity';
  switch (entityType) {
    case 'task':
      return `/board?taskId=${encodeURIComponent(entityId)}`;
    case 'project':
      return `/projects/${encodeURIComponent(entityId)}`;
    case 'document':
      return `/documents?doc=${encodeURIComponent(entityId)}`;
    case 'agent':
      return `/agents?agent=${encodeURIComponent(entityId)}`;
    default:
      return '/changelog?tab=activity';
  }
}

function showNotificationToast(notification: NotificationItem) {
  const styles = TYPE_STYLES[notification.type as NotificationType] ?? TYPE_STYLES.system;
  const Icon = styles.icon;

  toast(notification.title, {
    description: notification.description ?? undefined,
    icon: <Icon className={cn('h-4 w-4', styles.iconClass)} />,
    duration: 5000,
    action: notification.entity_type && notification.entity_id
      ? {
          label: 'View',
          onClick: () => {
            window.location.href = getEntityLink(notification.entity_type, notification.entity_id);
          },
        }
      : undefined,
  });
}

type NotificationPreferences = Record<NotificationType, boolean>;

const DEFAULT_PREFERENCES: NotificationPreferences = {
  task_assigned: true,
  task_completed: true,
  comment: true,
  mention: true,
  system: true,
};

function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem('notification-preferences');
    return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function saveNotificationPreferences(prefs: NotificationPreferences) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('notification-preferences', JSON.stringify(prefs));
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [clearingAll, setClearingAll] = useState(false);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => getNotificationPreferences());
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = (await res.json()) as NotificationItem[];
      setNotifications(data ?? []);
      // Track known IDs so we don't toast on initial load
      knownIdsRef.current = new Set((data ?? []).map((n: NotificationItem) => n.id));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Polling fallback (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotification = payload.new as NotificationItem;
          setNotifications((prev) => [newNotification, ...prev]);

          // Show toast only for genuinely new notifications
          if (!knownIdsRef.current.has(newNotification.id)) {
            showNotificationToast(newNotification);
          }
          knownIdsRef.current.add(newNotification.id);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          const updated = payload.new as NotificationItem;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          knownIdsRef.current.delete(deletedId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const togglePreference = useCallback((type: NotificationType) => {
    setPreferences((prev) => {
      const updated = { ...prev, [type]: !prev[type] };
      saveNotificationPreferences(updated);
      return updated;
    });
  }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => preferences[n.type as NotificationType] ?? true);
  }, [notifications, preferences]);

  const unreadCount = filteredNotifications.filter((notification) => !notification.read).length;
  const grouped = useMemo(() => groupNotifications(filteredNotifications), [filteredNotifications]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((notification) => !notification.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: unreadIds, read: true }),
    });
  }, [notifications]);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true }),
    });
  }, []);

  const dismissNotification = useCallback(async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissing((prev) => new Set(prev).add(id));

    setTimeout(async () => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    }, 300);
  }, []);

  const clearAllNotifications = useCallback(async () => {
    const allIds = notifications.map((n) => n.id);
    if (allIds.length === 0) return;

    setClearAllDialogOpen(false);
    setClearingAll(true);

    setTimeout(async () => {
      setNotifications([]);
      setClearingAll(false);

      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: allIds }),
      });
    }, 300);
  }, [notifications]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip open={open ? false : undefined}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className="h-9 w-9 relative flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.95] transition-all duration-150"
              aria-label="Notifications"
            >
          <Bell size={16} />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground shadow animate-in zoom-in-50">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[12px]">Notifications</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        sideOffset={12}
        className="w-[360px] border border-border/20 bg-background p-0 text-foreground shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border/20 px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold">
              {showPreferences ? 'Notification Preferences' : 'Notifications'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {showPreferences 
                ? 'Choose which notifications to receive' 
                : unreadCount === 0 ? 'All caught up' : `${unreadCount} unread`
              }
            </p>
          </div>
          <div className="flex items-center gap-1">
            {!showPreferences && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors duration-150"
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Mark all read
                </Button>
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setClearAllDialogOpen(true)}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-150"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Clear all
                  </Button>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPreferences(!showPreferences)}
              className="h-7 w-7"
            >
              {showPreferences ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-3 py-3">
          {showPreferences ? (
            <div className="space-y-3">
              {(Object.keys(TYPE_STYLES) as NotificationType[]).map((type) => {
                const styles = TYPE_STYLES[type];
                const Icon = styles.icon;
                const typeLabels: Record<NotificationType, { title: string; description: string }> = {
                  task_assigned: { title: 'Task Assigned', description: 'When a task is assigned to you' },
                  task_completed: { title: 'Task Completed', description: 'When a task is marked as done' },
                  comment: { title: 'Comments', description: 'New comments on tasks you follow' },
                  mention: { title: 'Mentions', description: 'When someone mentions you' },
                  system: { title: 'System', description: 'Important system notifications' },
                };
                const label = typeLabels[type];
                const enabled = preferences[type];
                return (
                  <button
                    key={type}
                    onClick={() => togglePreference(type)}
                    className={cn(
                      'w-full flex items-start gap-3 rounded-xl border p-3 transition-all text-left',
                      enabled
                        ? 'border-border/20 bg-card hover:bg-secondary'
                        : 'border-transparent bg-muted/30 opacity-60 hover:opacity-80'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity',
                        styles.bgClass,
                        !enabled && 'opacity-40'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', styles.iconClass)} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-[13px] font-medium', enabled ? 'text-foreground' : 'text-muted-foreground')}>
                        {label.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {label.description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'mt-1 h-5 w-9 shrink-0 rounded-full transition-colors relative',
                        enabled ? 'bg-primary' : 'bg-border'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform',
                          enabled ? 'left-[18px]' : 'left-0.5'
                        )}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              {isLoading && notifications.length === 0 ? (
                <div className="rounded-xl border border-border/20 bg-card px-4 py-6 text-center text-[13px] text-muted-foreground">
                  Loading notifications…
                </div>
              ) : null}

                  {!isLoading && filteredNotifications.length === 0 ? (
                <div className="rounded-xl border border-border/20 bg-card px-4 py-8 text-center">
                  <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-[13px] font-medium text-foreground">All caught up!</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    No notifications to show. Enjoy the peace.
                  </p>
                </div>
              ) : null}

              {grouped.map((group) => (
            <div key={group.key} className="mb-4 last:mb-0">
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.items.map((notification) => {
                  const styles = TYPE_STYLES[notification.type as NotificationType] ?? TYPE_STYLES.system;
                  const Icon = styles.icon;
                  const href = getEntityLink(notification.entity_type, notification.entity_id);
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        'transition-all duration-300 ease-out',
                        (dismissing.has(notification.id) || clearingAll)
                          ? 'opacity-0 scale-95 max-h-0 overflow-hidden mb-0'
                          : 'opacity-100 scale-100 max-h-40'
                      )}
                    >
                      <Link
                        href={href}
                        onClick={() => {
                          if (!notification.read) {
                            void markNotificationRead(notification.id);
                          }
                          setOpen(false);
                        }}
                        className={cn(
                          'group/notif flex items-start gap-3 rounded-xl border p-3 transition-colors duration-150 relative',
                          'hover:bg-secondary',
                          !notification.read
                            ? 'border-border/20 bg-card shadow-sm'
                            : 'border-transparent bg-muted/30 opacity-75'
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                            styles.bgClass
                          )}
                        >
                          <Icon className={cn('h-4 w-4', styles.iconClass)} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  'text-[13px] truncate text-foreground',
                                  !notification.read ? 'font-semibold' : 'font-normal'
                                )}
                              >
                                {notification.title}
                              </p>
                              {notification.description ? (
                                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                                  {notification.description}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                {formatRelativeTime(notification.created_at)}
                              </span>
                              <button
                                onClick={(e) => dismissNotification(e, notification.id)}
                                className="opacity-0 group-hover/notif:opacity-100 transition-all duration-150 h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                aria-label="Dismiss notification"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                        {!notification.read ? (
                          <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary group-hover/notif:hidden" />
                        ) : null}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
              ))}
            </>
          )}
        </div>
      </PopoverContent>

      <ConfirmDeleteDialog
        open={clearAllDialogOpen}
        onConfirm={clearAllNotifications}
        onCancel={() => setClearAllDialogOpen(false)}
        title="Clear all notifications?"
        description="This will permanently delete all notifications. This action cannot be undone."
      />
    </Popover>
  );
}
