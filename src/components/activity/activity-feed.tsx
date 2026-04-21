'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityLog } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { formatRelative } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { isToday, isYesterday, isThisWeek } from 'date-fns';

const PAGE_SIZE = 30;

const ENTITY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'task', label: 'Tasks' },
  { id: 'project', label: 'Projects' },
  { id: 'document', label: 'Documents' },
];

const ACTION_META = {
  created: {
    label: 'Created',
    ring: 'border-emerald-500/40 bg-status-success/10',
    dot: 'bg-status-success',
  },
  completed: {
    label: 'Completed',
    ring: 'border-purple-500/40 bg-purple-500/10',
    dot: 'bg-purple-400',
  },
  updated: {
    label: 'Updated',
    ring: 'border-blue-500/40 bg-blue-500/10',
    dot: 'bg-blue-400',
  },
  deleted: {
    label: 'Deleted',
    ring: 'border-destructive/20 bg-destructive/10',
    dot: 'bg-red-400',
  },
  default: {
    label: 'Updated',
    ring: 'border-border/20 bg-accent',
    dot: 'bg-muted-foreground',
  },
};

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Older'];

const getActionMeta = (action: string | null) => {
  const normalized = (action || '').toLowerCase();
  if (normalized.includes('create')) return ACTION_META.created;
  if (normalized.includes('complete')) return ACTION_META.completed;
  if (normalized.includes('update')) return ACTION_META.updated;
  if (normalized.includes('delete') || normalized.includes('remove')) return ACTION_META.deleted;
  return ACTION_META.default;
};

const toLabel = (value: string | null | undefined) => {
  if (!value) return 'Item';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDetails = (details: ActivityLog['details']) => {
  if (!details) return null;
  if (typeof details === 'string') return details;
  try {
    const text = JSON.stringify(details);
    return text.length > 160 ? `${text.slice(0, 160)}…` : text;
  } catch {
    return null;
  }
};

interface ActivityFeedProps {
  highlightId?: string | null;
}

export function ActivityFeed({ highlightId }: ActivityFeedProps) {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [entityFilter, setEntityFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(async (pageIndex: number, replace = false) => {
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(pageIndex * PAGE_SIZE));
    const res = await fetch(`/api/activity?${params.toString()}`);
    const data = await res.json();
    const safeData = Array.isArray(data) ? data : [];

    setActivity((prev) => (replace ? safeData : [...prev, ...safeData]));
    setHasMore(safeData.length === PAGE_SIZE);
    return safeData;
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPage(0, true)
      .then(() => setPage(0))
      .finally(() => setLoading(false));
  }, [fetchPage]);

  useEffect(() => {
    const channel = supabase
      .channel('activity-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, () => {
        fetchPage(0, true).then(() => setPage(0));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    fetchPage(nextPage, false)
      .then(() => setPage(nextPage))
      .finally(() => setLoadingMore(false));
  }, [fetchPage, hasMore, loading, loadingMore, page]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '160px' }
    );
    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore]);

  const filteredActivity = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return activity.filter((entry) => {
      if (entityFilter !== 'all' && entry.entity_type !== entityFilter) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        entry.action,
        entry.entity_name,
        entry.entity_type,
        typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details || ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [activity, entityFilter, query]);

  const groupedActivity = useMemo(() => {
    const groups: Record<string, ActivityLog[]> = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Older: [],
    };

    filteredActivity.forEach((entry) => {
      const date = new Date(entry.created_at);
      if (isToday(date)) {
        groups.Today.push(entry);
      } else if (isYesterday(date)) {
        groups.Yesterday.push(entry);
      } else if (isThisWeek(date)) {
        groups['This Week'].push(entry);
      } else {
        groups.Older.push(entry);
      }
    });

    return groups;
  }, [filteredActivity]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/20 bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {ENTITY_FILTERS.map((filter) => {
              const isActive = entityFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setEntityFilter(filter.id)}
                  className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-widest transition-colors ${
                    isActive
                      ? 'border-border/20 bg-secondary text-foreground'
                      : 'border-border/20 text-muted-foreground hover:bg-secondary transition-colors duration-150'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search activity"
              className="h-9 border-border/20 bg-background pl-9 text-[13px] text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/20 bg-card p-5">
        {loading && (
          <div className="flex items-center justify-center py-16 text-[13px] text-muted-foreground">
            Loading activity…
          </div>
        )}

        {!loading && filteredActivity.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[13px] text-muted-foreground">No activity logged yet.</p>
            <p className="text-[11px] text-muted-foreground mt-2">
              Actions across tasks, projects, and documents will appear here.
            </p>
          </div>
        )}

        {!loading && filteredActivity.length > 0 && (
          <div className="space-y-8">
            {GROUP_ORDER.map((group) => {
              const entries = groupedActivity[group];
              if (!entries || entries.length === 0) return null;

              return (
                <div key={group} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border/20 pb-2">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {group}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {entries.map((entry) => {
                      const meta = getActionMeta(entry.action);
                      const entityLabel = toLabel(entry.entity_type);
                      const entityName = entry.entity_name || 'Untitled';
                      const detailText = formatDetails(entry.details);
                      const isHighlighted = highlightId && entry.id === highlightId;

                      return (
                        <div
                          key={entry.id}
                          className={`flex gap-4 rounded-xl border p-5 transition-colors ${
                            isHighlighted
                              ? 'border-emerald-500/40 bg-status-success/10'
                              : 'border-border/20 bg-card hover:bg-secondary transition-colors duration-150'
                          }`}
                        >
                          <div
                            className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full border ${meta.ring}`}
                          >
                            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {meta.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {formatRelative(entry.created_at)}
                              </span>
                            </div>
                            <p className="text-[13px] text-foreground">
                              {meta.label} {entityLabel.toLowerCase()}{' '}
                              <span className="font-semibold">{entityName}</span>
                            </p>
                            {detailText && (
                              <p className="text-[11px] text-muted-foreground break-words">{detailText}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="flex flex-col items-center gap-3 pt-2">
              {hasMore && (
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="border-border/20 bg-transparent text-[13px] text-foreground transition-colors hover:bg-secondary"
                >
                  {loadingMore ? 'Loading more…' : 'Load more activity'}
                </Button>
              )}
              {!hasMore && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  You're all caught up
                </span>
              )}
              <div ref={loadMoreRef} className="h-1 w-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
