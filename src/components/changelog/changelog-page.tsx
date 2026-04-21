'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Plus,
  Undo2,
  Package,
  Search,
  GitCommit,
  Sparkles,
  X,
  Activity,
  Check,
  ChevronDown,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { ChangelogSkeleton } from '@/components/ui/skeleton-loaders';
import { toast } from 'sonner';

const ChangelogDescriptionEditor = dynamic(
  () => import('@/components/changelog/changelog-description-editor').then((mod) => mod.ChangelogDescriptionEditor),
  { ssr: false }
);

// --- Types ---

type ChangeType = 'added' | 'changed' | 'fixed' | 'removed';
type FilterType = 'all' | 'added' | 'changed' | 'fixed';
type TabType = 'changelog' | 'activity';

interface Change {
  type: ChangeType;
  text: string;
  link?: string;
  reverted?: boolean;
}

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string | null;
  changes: Change[];
  commit_sha: string | null;
  reverted: boolean;
  created_at: string;
}

interface ActivityEntry {
  id: string;
  action: string;
  description: string;
  agent: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface DraftChange {
  type: ChangeType;
  text: string;
  link: string;
}

// --- Constants ---

const changeTypeLabels: Record<ChangeType, string> = {
  added: 'Added',
  changed: 'Changed',
  fixed: 'Fixed',
  removed: 'Removed',
};

const changeTypeBadge: Record<ChangeType, string> = {
  added: 'border-emerald-500/40 bg-status-success/20 text-status-success dark:text-status-success',
  fixed: 'border-amber-500/40 bg-status-warning/20 text-status-warning text-status-warning',
  changed: 'border-primary/40 bg-primary/20 text-primary dark:text-primary/70',
  removed: 'border-destructive/20 bg-destructive/20 text-destructive text-destructive',
};

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'added', label: 'Added' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'changed', label: 'Changed' },
];

const actionBadgeColors: Record<string, string> = {
  'task.created': 'border-emerald-500/40 bg-status-success/20 text-status-success',
  'task.updated': 'border-amber-500/40 bg-status-warning/20 text-status-warning',
  'task.deleted': 'border-destructive/20 bg-destructive/20 text-red-300',
  deploy: 'border-primary/40 bg-primary/20 text-primary/70',
};

function getActionBadgeClass(action: string): string {
  return actionBadgeColors[action] || 'border-border/20 bg-accent text-muted-foreground';
}

function relativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

// --- Helper Popovers ---

function ChangeTypePopover({ value, onChange }: { value: ChangeType; onChange: (value: ChangeType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-7 px-3 text-[11px] bg-background border border-border/20 rounded-lg hover:bg-muted/40 transition-colors duration-150 flex items-center justify-between gap-2 w-full">
          <span>{changeTypeLabels[value]}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[160px] p-1" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No type found</CommandEmpty>
            <CommandGroup>
              {(['added', 'fixed', 'changed', 'removed'] as ChangeType[]).map((t) => (
                <CommandItem
                  key={t}
                  onSelect={() => {
                    onChange(t);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === t ? "opacity-100" : "opacity-0")} />
                  <span className="text-[13px]">{changeTypeLabels[t]}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AgentFilterPopover({ value, onChange, agentList }: { value: string; onChange: (value: string) => void; agentList: string[] }) {
  const [open, setOpen] = useState(false);

  const currentLabel = value === 'all' ? 'All agents' : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-8 px-3 text-[11px] bg-secondary border border-border/20 rounded-lg hover:bg-muted/40 transition-colors duration-150 flex items-center justify-between gap-2 w-40">
          <span>{currentLabel}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-1" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No agent found</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onChange('all');
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-3.5 w-3.5", value === 'all' ? "opacity-100" : "opacity-0")} />
                <span className="text-[13px]">All agents</span>
              </CommandItem>
              {agentList.map((agent) => (
                <CommandItem
                  key={agent}
                  onSelect={() => {
                    onChange(agent);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === agent ? "opacity-100" : "opacity-0")} />
                  <span className="text-[13px]">{agent}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// --- Component ---

export function ChangelogPage() {
  const [activeTab, setActiveTab] = useState<TabType>('changelog');
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formState, setFormState] = useState({
    version: '',
    title: '',
    description: '',
    commit_sha: '',
  });
  const [draftChanges, setDraftChanges] = useState<DraftChange[]>([
    { type: 'added', text: '', link: '' },
  ]);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agentFilter, setAgentFilter] = useState<string>('all');

  // --- Data fetching ---

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/changelog');
      if (res.ok) setEntries(await res.json());
    } catch (e) {
      console.error('Failed to fetch changelog:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch('/api/activity?limit=200');
      if (res.ok) setActivities(await res.json());
    } catch (e) {
      console.error('Failed to fetch activities:', e);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchActivities();
  }, [fetchEntries, fetchActivities]);

  // Realtime subscriptions
  useEffect(() => {
    const changelogSub = supabase
      .channel('changelog-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'changelog' }, () => {
        fetchEntries();
      })
      .subscribe();

    const activitySub = supabase
      .channel('activity-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, (payload) => {
        setActivities((prev) => [payload.new as ActivityEntry, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(changelogSub);
      supabase.removeChannel(activitySub);
    };
  }, [fetchEntries]);

  // --- Changelog handlers ---

  const handleRevertChange = async (id: string, changeIndex: number, currentReverted: boolean) => {
    try {
      const res = await fetch('/api/changelog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, changeIndex, reverted: !currentReverted }),
      });
      if (res.ok) fetchEntries();
    } catch (e) {
      console.error('Failed to revert changelog change:', e);
    }
  };

  const handleRevertAll = async (id: string) => {
    const entry = entries.find((c) => c.id === id);
    if (!entry) return;
    const hasReverted = entry.changes.some((c) => c.reverted);
    try {
      const res = await fetch('/api/changelog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reverted: !hasReverted }),
      });
      if (res.ok) fetchEntries();
    } catch (e) {
      console.error('Failed to revert all:', e);
    }
  };

  // --- Filtered data ---

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesFilter =
        filter === 'all' || entry.changes.some((c) => c.type === filter);
      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;
      const base = `${entry.version} ${entry.title} ${entry.description ?? ''} ${entry.commit_sha ?? ''}`.toLowerCase();
      if (base.includes(normalizedQuery)) return true;
      return entry.changes.some(
        (c) => c.text.toLowerCase().includes(normalizedQuery) || c.type.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [entries, filter, normalizedQuery]);

  const agentList = useMemo(() => {
    const agents = new Set(activities.map((a) => a.agent).filter(Boolean));
    return Array.from(agents).sort();
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      if (agentFilter !== 'all' && a.agent !== agentFilter) return false;
      if (!normalizedQuery) return true;
      return `${a.action} ${a.description} ${a.agent}`.toLowerCase().includes(normalizedQuery);
    });
  }, [activities, agentFilter, normalizedQuery]);

  const totalChanges = useMemo(() => {
    return entries.reduce((sum, e) => sum + e.changes.length, 0);
  }, [entries]);

  // --- Draft handlers ---

  const handleChangeDraft = (index: number, patch: Partial<DraftChange>) => {
    setDraftChanges((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  };

  const handleAddDraftChange = () => {
    setDraftChanges((prev) => [...prev, { type: 'added', text: '', link: '' }]);
  };

  const handleRemoveDraftChange = (index: number) => {
    setDraftChanges((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);
    const v = formState.version.trim();
    const t = formState.title.trim();
    const d = formState.description.trim();
    const sha = formState.commit_sha.trim();
    const cleaned = draftChanges
      .map((c) => ({ type: c.type, text: c.text.trim(), link: c.link.trim() || undefined }))
      .filter((c) => c.text.length > 0);
    if (!v || !t || cleaned.length === 0) {
      setFormMessage('Add a version, title, and at least one change.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: v, title: t, description: d || null,
          commit_sha: sha || null, changes: cleaned, reverted: false,
        }),
      });
      if (res.ok) {
        setFormState({ version: '', title: '', description: '', commit_sha: '' });
        setDraftChanges([{ type: 'added', text: '', link: '' }]);
        setFormMessage('Entry created.');
        toast.success('Changelog entry added');
        fetchEntries();
      } else {
        setFormMessage('Unable to create entry.');
      }
    } catch {
      setFormMessage('Unable to create entry.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render ---

  const isLoading = activeTab === 'changelog' ? loading : activityLoading;

  return (
    <div className="text-foreground animate-in fade-in duration-200">
      <div className="flex w-full flex-col gap-5">
        {/* Header */}
        <header className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Mission Control
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Changelog</h1>
        </header>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-border/20">
          <button
            onClick={() => setActiveTab('changelog')}
            className={cn(
              'relative pb-2.5 text-[13px] font-medium transition-colors',
              activeTab === 'changelog'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-muted-foreground'
            )}
          >
            Changelog
            {activeTab === 'changelog' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={cn(
              'relative pb-2.5 text-[13px] font-medium transition-colors',
              activeTab === 'activity'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-muted-foreground'
            )}
          >
            Activity
            {activeTab === 'activity' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
            )}
          </button>
        </div>

        {isLoading ? (
          <ChangelogSkeleton />
        ) : activeTab === 'changelog' ? (
          /* ===== CHANGELOG TAB ===== */
          <div className="flex flex-col gap-6">
            {/* Stats + filters */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <span className="text-[11px] text-muted-foreground">
                  {entries.length} releases · {totalChanges} changes
                </span>
                <ToggleGroup
                  type="single"
                  value={filter}
                  onValueChange={(v) => setFilter((v as FilterType) || 'all')}
                  className="flex gap-1"
                >
                  {filterOptions.map((o) => (
                    <ToggleGroupItem
                      key={o.value}
                      value={o.value}
                      variant="outline"
                      className="h-7 border-border/20 px-2.5 text-[11px] font-medium text-muted-foreground data-[state=on]:border-border/20 data-[state=on]:bg-card data-[state=on]:text-foreground"
                    >
                      {o.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="relative w-full lg:w-64">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search…"
                  className="h-8 border-border/20 bg-muted pl-8 text-[11px] text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              {/* Entries list */}
              <section className="relative">
                <div className="absolute left-3 top-0 h-full w-px bg-muted" />
                <div className="flex flex-col gap-6">
                  {filteredEntries.map((entry) => {
                    const filtered =
                      filter === 'all' ? entry.changes : entry.changes.filter((c) => c.type === filter);
                    const allReverted = entry.changes.every((c) => c.reverted);
                    const commitLink = entry.commit_sha?.startsWith('http')
                      ? entry.commit_sha
                      : entry.commit_sha
                        ? `https://github.com/search?q=${entry.commit_sha}`
                        : null;

                    return (
                      <div key={entry.id} className="relative grid gap-3 lg:grid-cols-[140px_1fr]">
                        <div className="relative pl-6">
                          <div className="absolute left-0 top-2.5 h-2.5 w-2.5 rounded-full bg-status-success ring-[5px] ring-background" />
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center rounded-full border border-border/20 bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                              {entry.version}
                            </span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-[11px] text-muted-foreground cursor-default">
                                    {relativeTime(entry.created_at)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-[11px]">
                                  {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm')}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        <div
                          className={cn(
                            'rounded-lg border border-border/20 bg-muted/40 px-5 py-3',
                            allReverted && 'opacity-50'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-[13px] font-semibold text-foreground">{entry.title}</h3>
                              {entry.description && (
                                <div 
                                  className="mt-1 text-[13px] text-muted-foreground/60 prose prose-sm dark:prose-invert max-w-none prose-p:text-[13px] prose-p:my-0.5 prose-strong:text-muted-foreground prose-em:text-muted-foreground prose-a:text-primary dark:prose-a:text-primary prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0"
                                  dangerouslySetInnerHTML={{ __html: entry.description }}
                                />
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevertAll(entry.id)}
                              className="h-7 shrink-0 border border-border/20 bg-transparent px-2 text-[10px] font-medium text-muted-foreground hover:bg-card hover:text-foreground transition-colors duration-150"
                            >
                              <Undo2 className="mr-1 h-3 w-3" />
                              Revert
                            </Button>
                          </div>

                          <ul className="mt-3 space-y-1.5">
                            {filtered.map((change, ci) => (
                              <li
                                key={`${entry.id}-${ci}`}
                                className="flex items-center justify-between gap-2 rounded border border-border/20 bg-background px-5 py-3"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      'inline-flex rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wider',
                                      changeTypeBadge[change.type]
                                    )}
                                  >
                                    {changeTypeLabels[change.type]}
                                  </span>
                                  <span
                                    className={cn(
                                      'text-[13px] text-foreground',
                                      change.reverted && 'text-muted-foreground/60 line-through'
                                    )}
                                  >
                                    {change.link ? (
                                      <Link
                                        href={change.link}
                                        className="text-muted-foreground/60 hover:text-foreground transition-colors duration-150"
                                      >
                                        {change.text}
                                      </Link>
                                    ) : (
                                      change.text
                                    )}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground/60 hover:text-foreground transition-colors duration-150"
                                  onClick={() => handleRevertChange(entry.id, ci, change.reverted || false)}
                                >
                                  <Undo2 size={12} />
                                </Button>
                              </li>
                            ))}
                          </ul>

                          {entry.commit_sha && (
                            <div className="mt-3 flex items-center gap-2 border-t border-border/20 pt-2 text-[11px] text-muted-foreground">
                              <GitCommit className="h-3 w-3" />
                              {commitLink ? (
                                <Link
                                  href={commitLink}
                                  className="font-mono text-muted-foreground hover:text-foreground transition-colors duration-150"
                                >
                                  {entry.commit_sha.slice(0, 7)}
                                </Link>
                              ) : (
                                <span className="font-mono">{entry.commit_sha.slice(0, 7)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredEntries.length === 0 && (
                    <div className="flex flex-col items-center py-12 text-center">
                      <div className="rounded-full bg-muted/50 p-4 mb-4">
                        <Package className="h-8 w-8 text-muted-foreground/60" />
                      </div>
                      <p className="text-[13px] font-medium text-foreground mb-1">No entries found</p>
                      <p className="text-[11px] text-muted-foreground/60">Try adjusting your search or filters</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Create form sidebar */}
              <aside>
                <div className="rounded-lg border border-border/20 bg-muted/40 px-5 py-3">
                  <p className="text-[11px] font-medium text-muted-foreground/60">Create Entry</p>
                  <h2 className="mt-1 text-[13px] font-semibold text-foreground">New release</h2>

                  <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">Version</Label>
                      <Input
                        value={formState.version}
                        onChange={(e) => setFormState((p) => ({ ...p, version: e.target.value }))}
                        placeholder="2.3.0"
                        className="h-8 border-border/20 bg-background text-[11px] text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">Title</Label>
                      <Input
                        value={formState.title}
                        onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
                        placeholder="Workflow acceleration"
                        className="h-8 border-border/20 bg-background text-[11px] text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">Description</Label>
                      <ChangelogDescriptionEditor
                        content={formState.description}
                        onChange={(html) => setFormState((p) => ({ ...p, description: html }))}
                        placeholder="Release summary"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">Commit SHA</Label>
                      <Input
                        value={formState.commit_sha}
                        onChange={(e) => setFormState((p) => ({ ...p, commit_sha: e.target.value }))}
                        placeholder="Optional"
                        className="h-8 border-border/20 bg-background text-[11px] text-foreground placeholder:text-muted-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-medium text-muted-foreground">Changes</Label>
                      {draftChanges.map((change, i) => (
                        <div key={`draft-${i}`} className="rounded border border-border/20 bg-background p-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Change {i + 1}</span>
                            {draftChanges.length > 1 && (
                              <button type="button" onClick={() => handleRemoveDraftChange(i)} className="text-muted-foreground hover:text-foreground transition-colors duration-150">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <div className="mt-2 grid gap-2">
                            <ChangeTypePopover value={change.type} onChange={(v) => handleChangeDraft(i, { type: v })} />
                            <Input
                              value={change.text}
                              onChange={(e) => handleChangeDraft(i, { text: e.target.value })}
                              placeholder="Describe the change"
                              className="h-7 border-border/20 bg-background text-[11px] text-foreground placeholder:text-muted-foreground"
                            />
                            <Input
                              value={change.link}
                              onChange={(e) => handleChangeDraft(i, { link: e.target.value })}
                              placeholder="Optional link"
                              className="h-7 border-border/20 bg-background text-[11px] text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddDraftChange}
                        className="h-7 w-full border-border/20 text-[13px] text-muted-foreground hover:bg-card hover:text-foreground transition-colors duration-150"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add change
                      </Button>
                    </div>

                    {formMessage && <p className="text-[11px] text-muted-foreground">{formMessage}</p>}

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-8 w-full bg-primary text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors duration-150"
                    >
                      {submitting ? 'Publishing…' : 'Publish entry'}
                    </Button>
                  </form>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          /* ===== ACTIVITY TAB ===== */
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground">{filteredActivities.length} events</span>
                <AgentFilterPopover value={agentFilter} onChange={setAgentFilter} agentList={agentList} />
              </div>
              <div className="relative w-64">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search activity…"
                  className="h-8 border-border/20 bg-muted pl-8 text-[11px] text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Activity list */}
            <div className="flex flex-col">
              {filteredActivities.map((a, i) => (
                <div
                  key={a.id}
                  className={cn(
                    'flex items-start gap-3 px-3 py-2.5',
                    i < filteredActivities.length - 1 && 'border-b border-border/20'
                  )}
                >
                  <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider',
                          getActionBadgeClass(a.action)
                        )}
                      >
                        {a.action}
                      </span>
                      <span className="truncate text-[11px] text-foreground">{a.description}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {a.agent && (
                        <span className="text-primary">{a.agent}</span>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">{relativeTime(a.created_at)}</span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-[11px]">{format(new Date(a.created_at), 'dd MMM yyyy HH:mm:ss')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              ))}

              {filteredActivities.length === 0 && (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="rounded-full bg-muted/50 p-4 mb-4">
                    <Activity className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                  <p className="text-[13px] font-medium text-foreground mb-1">No activity found</p>
                  <p className="text-[11px] text-muted-foreground/60">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
