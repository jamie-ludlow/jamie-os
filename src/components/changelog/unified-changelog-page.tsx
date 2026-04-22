'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { APPS, APP_BADGE, CHANGELOG_STATUS_CONFIG, CHANGELOG_STATUSES } from '@/lib/constants';
import { PRIORITY_BADGE } from '@/lib/constants';
import type { ChangelogItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { toast } from 'sonner';
import {
  LayoutGrid,
  Table2,
  Plus,
  X,
  ChevronDown,
  Check,
  MessageSquare,
  Send,
  Trash2,
  ExternalLink,
  Undo2,
  CheckCircle2,
  XCircle,
  Pencil,
  ArrowRight,
  GitCommit,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';
import { ActivityPageContent } from '@/components/activity/activity-page';

// ------------------------------------------------------------------ //
// Types                                                               //
// ------------------------------------------------------------------ //

interface Comment {
  id: string;
  proposal_id: string;
  content: string;
  author: string;
  created_at: string;
}

type ViewMode = 'kanban' | 'table';
type TabType = 'roadmap' | 'activity';

const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const CATEGORIES = ['feature', 'improvement', 'bugfix', 'infra', 'other'];

const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({
  value: p,
  label: p.charAt(0).toUpperCase() + p.slice(1),
}));

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({
  value: c,
  label: c.charAt(0).toUpperCase() + c.slice(1),
}));

// ------------------------------------------------------------------ //
// Helpers                                                             //
// ------------------------------------------------------------------ //

function relativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

function getPriorityBadgeClass(priority: string): string {
  const map: Record<string, string> = {
    critical: 'bg-destructive/15 text-destructive border-destructive/20',
    high:     'bg-orange-500/15 text-orange-400 border-orange-500/20',
    medium:   'bg-blue-500/15 text-blue-400 border-blue-500/20',
    low:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  };
  return map[priority] ?? map.medium;
}

// ------------------------------------------------------------------ //
// Reusable select popover (matches searchable-project-popover.tsx)   //
// ------------------------------------------------------------------ //

function SelectPopover<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  trigger,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  placeholder?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch('');
    }
  };

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-input bg-background text-[13px] hover:bg-muted/40 transition-colors duration-150 focus-visible:outline-none">
            <span className={selected ? 'text-foreground' : 'text-muted-foreground/30'}>
              {selected?.label ?? placeholder ?? value}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full px-3 py-2 text-[13px] bg-transparent border-b border-border/20 outline-none text-foreground placeholder:text-muted-foreground/60 rounded-t-md"
        />
        <div className="p-1 max-h-[280px] overflow-y-auto">
          {filtered.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-[13px] hover:bg-muted/60 transition-colors duration-150',
                value === opt.value && 'bg-muted/50'
              )}
            >
              <span className="flex-1 text-left">{opt.label}</span>
              {value === opt.value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-[13px] text-muted-foreground/30 text-center">No options found</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Filter popover — matches proposals-page.tsx pattern exactly
function FilterPopover<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch('');
    }
  };

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find((o) => o.value === value);
  const isActive = value !== options[0]?.value;
  const displayText = selected?.label ?? label;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'h-8 px-3 text-[13px] rounded-lg border transition-colors duration-150 flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none',
            isActive
              ? 'border-primary text-primary'
              : 'border-border/20 bg-secondary text-foreground hover:border-primary/50'
          )}
        >
          <span className="truncate max-w-[120px]">{displayText}</span>
          <ChevronDown size={12} className="text-muted-foreground/60 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full px-3 py-2 text-[13px] bg-transparent border-b border-border/20 outline-none text-foreground placeholder:text-muted-foreground/60 rounded-t-md"
        />
        <div className="p-1 max-h-[280px] overflow-y-auto">
          {filtered.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-[13px] hover:bg-muted/60 transition-colors duration-150',
                value === opt.value && 'bg-muted/50'
              )}
            >
              <span className="flex-1 text-left">{opt.label}</span>
              {value === opt.value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-[13px] text-muted-foreground/30 text-center">No results</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ------------------------------------------------------------------ //
// Badges                                                              //
// ------------------------------------------------------------------ //

function StatusBadge({ status }: { status: string }) {
  const cfg = CHANGELOG_STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border', cfg.bg, cfg.text, cfg.border)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function AppBadge({ app }: { app: string }) {
  const cfg = APP_BADGE[app];
  if (!cfg) return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-secondary/50 text-muted-foreground border-border/20 uppercase tracking-wide">{app}</span>;
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide', cfg.className)}>
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide', getPriorityBadgeClass(priority))}>
      {priority}
    </span>
  );
}

// ------------------------------------------------------------------ //
// Item Card (Kanban)                                                  //
// ------------------------------------------------------------------ //

interface ItemCardProps {
  item: ChangelogItem;
  commentCount: number;
  onClick: () => void;
}

function ItemCard({ item, commentCount, onClick }: ItemCardProps) {
  const feedbackIcon = item.status === 'shipped'
    ? item.feedback
      ? (item.feedback.startsWith('approved') ? '✅' : '🔄')
      : null
    : null;

  return (
    <div
      className={cn(
        'rounded-lg border border-border/20 bg-card px-4 py-3 cursor-pointer hover:bg-muted/40 transition-all duration-150 group',
        item.reverted && 'opacity-60'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Open ${item.title}`}
    >
      {/* Title */}
      <h3 className={cn('text-[13px] font-medium text-foreground leading-snug line-clamp-2 mb-2', item.reverted && 'line-through text-muted-foreground')}>
        {item.title}
      </h3>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1 mb-2">
        <AppBadge app={item.app ?? 'mission-control'} />
        <PriorityBadge priority={item.priority} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
          <span>{item.created_by === 'casper' ? '👻 Casper' : '👤 Jamie'}</span>
          <span>·</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">{relativeTime(item.created_at)}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                {format(new Date(item.created_at), 'dd MMM yyyy HH:mm')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {commentCount > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <MessageSquare className="h-3 w-3" />
                {commentCount}
              </span>
            </>
          )}
        </div>
        {feedbackIcon && <span className="text-[13px]">{feedbackIcon}</span>}
      </div>

      {/* Shipped: commit info */}
      {item.status === 'shipped' && item.commit_sha && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/40 font-mono">
          <GitCommit className="h-2.5 w-2.5" />
          {item.commit_sha.slice(0, 7)}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Kanban Column                                                       //
// ------------------------------------------------------------------ //

const KANBAN_COLUMNS: Array<{ status: string; label: string }> = [
  { status: 'request',     label: 'Requests' },
  { status: 'backlog',     label: 'Backlog' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'shipped',     label: 'Shipped' },
];

interface KanbanViewProps {
  items: ChangelogItem[];
  commentCounts: Record<string, number>;
  onItemClick: (item: ChangelogItem) => void;
  onAddRequest: () => void;
  appFilter: string;
}

function KanbanView({ items, commentCounts, onItemClick, onAddRequest, appFilter }: KanbanViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-0">
      {KANBAN_COLUMNS.map((col) => {
        const colItems = items.filter((i) => {
          if (i.status === 'reverted' && col.status === 'shipped') return true;
          return i.status === col.status;
        });
        const cfg = CHANGELOG_STATUS_CONFIG[col.status];

        return (
          <div key={col.status} className="flex flex-col min-h-0" role="group" aria-label={col.label}>
            {/* Column header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className={cn('h-1.5 w-1.5 rounded-full', cfg?.dot)} />
                <span className="text-[13px] font-medium text-foreground">{col.label}</span>
                <span className="text-[11px] text-muted-foreground/60">{colItems.length}</span>
              </div>
              {col.status === 'request' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onAddRequest}
                      aria-label="New request"
                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/40 transition-colors duration-150 text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>New request</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
              {colItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/20 px-4 py-8 text-center">
                  <p className="text-[11px] text-muted-foreground/40">Empty</p>
                </div>
              ) : (
                colItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    commentCount={commentCounts[item.id] ?? 0}
                    onClick={() => onItemClick(item)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Table View                                                          //
// ------------------------------------------------------------------ //

interface TableViewProps {
  items: ChangelogItem[];
  commentCounts: Record<string, number>;
  onItemClick: (item: ChangelogItem) => void;
}

function TableViewComponent({ items, commentCounts, onItemClick }: TableViewProps) {
  const [sortField, setSortField] = useState<'created_at' | 'status' | 'priority' | 'app' | 'title'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else {
        cmp = (a[sortField] ?? '').toString().localeCompare((b[sortField] ?? '').toString());
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, sortField, sortDir]);

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ field, label }: { field: typeof sortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-150"
    >
      {label}
      {sortField === field && (
        <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border/20">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border/20 bg-muted/30">
            <th className="px-4 py-2.5 text-left"><SortHeader field="title" label="Title" /></th>
            <th className="px-4 py-2.5 text-left"><SortHeader field="app" label="App" /></th>
            <th className="px-4 py-2.5 text-left"><SortHeader field="status" label="Status" /></th>
            <th className="px-4 py-2.5 text-left"><SortHeader field="priority" label="Priority" /></th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground/60">Author</th>
            <th className="px-4 py-2.5 text-left"><SortHeader field="created_at" label="Date" /></th>
            <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-muted-foreground/60">
              <MessageSquare className="h-3.5 w-3.5 inline" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, i) => (
            <tr
              key={item.id}
              onClick={() => onItemClick(item)}
              className={cn(
                'cursor-pointer hover:bg-muted/40 transition-colors duration-150',
                i < sorted.length - 1 && 'border-b border-border/20',
                item.reverted && 'opacity-60'
              )}
            >
              <td className="px-4 py-2.5">
                <span className={cn('font-medium text-foreground truncate max-w-xs block', item.reverted && 'line-through text-muted-foreground')}>
                  {item.title}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <AppBadge app={item.app ?? 'mission-control'} />
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-2.5">
                <PriorityBadge priority={item.priority} />
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {item.created_by === 'casper' ? '👻 Casper' : '👤 Jamie'}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default">{relativeTime(item.created_at)}</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[11px]">
                      {format(new Date(item.created_at), 'dd MMM yyyy')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </td>
              <td className="px-4 py-2.5 text-center text-muted-foreground">
                {(commentCounts[item.id] ?? 0) > 0 && (
                  <span className="flex items-center justify-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {commentCounts[item.id]}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <Lightbulb className="h-8 w-8 text-muted-foreground/30 mb-3" aria-hidden="true" />
          <p className="text-[13px] font-medium text-muted-foreground">No items found</p>
          <p className="text-[13px] text-muted-foreground/60 mt-1">Try adjusting the filters above</p>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Create Item Modal                                                   //
// ------------------------------------------------------------------ //

interface CreateItemModalProps {
  defaultApp: string;
  onClose: () => void;
  onCreated: (item: ChangelogItem) => void;
}

function CreateItemModal({ defaultApp, onClose, onCreated }: CreateItemModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [category, setCategory] = useState('feature');
  const [priority, setPriority] = useState('medium');
  const [app, setApp] = useState(defaultApp);
  const [saving, setSaving] = useState(false);

  const appOptions = [{ value: 'all', label: 'All Apps' }, ...APPS.map((a) => ({ value: a.id, label: a.label }))];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          reasoning: reasoning.trim() || null,
          category,
          priority,
          status: 'request',
          created_by: 'casper',
          app: app === 'all' ? 'mission-control' : app,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Failed to create item');
        return;
      }
      const data = await res.json();
      toast.success('Request created');
      onCreated(data);
    } catch {
      toast.error('Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-border/20 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
          <h2 className="text-[13px] font-semibold">New Feature Request</h2>
          <button onClick={onClose} aria-label="Close" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/40 transition-colors duration-150 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What feature or improvement are you requesting?"
              className="text-[13px]"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this involves..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 resize-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Reasoning</label>
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Why should this be built? What problem does it solve?"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">App</label>
              <SelectPopover
                value={app as string}
                options={APPS.map((a) => ({ value: a.id, label: a.label }))}
                onChange={(v) => setApp(v)}
                placeholder="App"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Category</label>
              <SelectPopover
                value={category}
                options={CATEGORY_OPTIONS}
                onChange={setCategory}
                placeholder="Category"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Priority</label>
              <SelectPopover
                value={priority}
                options={PRIORITY_OPTIONS}
                onChange={setPriority}
                placeholder="Priority"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-[13px]">Cancel</Button>
            <Button type="submit" size="sm" disabled={saving || !title.trim()} className="text-[13px]">
              {saving ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Detail Sheet                                                        //
// ------------------------------------------------------------------ //

interface DetailSheetProps {
  item: ChangelogItem;
  onClose: () => void;
  onUpdate: (updated: ChangelogItem) => void;
  onDelete: (id: string) => void;
}

function DetailSheet({ item, onClose, onUpdate, onDelete }: DetailSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description ?? '');
  const [editReasoning, setEditReasoning] = useState(item.reasoning ?? '');
  const [savingEdit, setSavingEdit] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let mounted = true;
    setLoadingComments(true);
    fetch(`/api/proposals/${item.id}/comments`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (mounted) setComments(Array.isArray(data) ? data : []); })
      .catch(() => { if (mounted) setComments([]); })
      .finally(() => { if (mounted) setLoadingComments(false); });

    const channel = supabase
      .channel(`proposal_comments_${item.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposal_comments', filter: `proposal_id=eq.${item.id}` }, () => {
        if (!mounted) return;
        fetch(`/api/proposals/${item.id}/comments`)
          .then((r) => r.ok ? r.json() : [])
          .then((data) => { if (mounted) setComments(Array.isArray(data) ? data : []); })
          .catch(() => {});
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [item.id]);

  const handleStatusChange = async (newStatus: string, extra?: Record<string, unknown>) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch('/api/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: newStatus, ...extra }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Failed to update status');
        return;
      }
      const updated = await res.json();
      const cfg = CHANGELOG_STATUS_CONFIG[newStatus];
      toast.success(cfg?.label ? `Moved to ${cfg.label}` : 'Updated');
      onUpdate(updated);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleFieldUpdate = async (patch: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, ...patch }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      onUpdate(updated);
    } catch {
      // silently ignore
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch('/api/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, title: editTitle, description: editDescription, reasoning: editReasoning }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Failed to save');
        return;
      }
      const updated = await res.json();
      toast.success('Saved');
      onUpdate(updated);
      setEditing(false);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/proposals/${item.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim(), author: 'jamie' }),
      });
      if (!res.ok) { toast.error('Failed to add comment'); return; }
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleApprove = async () => {
    const feedback = 'approved: ' + (feedbackText.trim() || 'looks good');
    await handleFieldUpdate({ feedback });
    toast.success('Approved ✅');
    setShowFeedbackInput(false);
    setFeedbackText('');
  };

  const handleRequestChanges = async () => {
    const feedback = 'changes-requested: ' + (feedbackText.trim() || 'needs changes');
    await handleFieldUpdate({ feedback });
    // Create a new request item linked back
    try {
      await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[Changes Requested] ${item.title}`,
          description: feedbackText.trim() || 'Changes requested on shipped item',
          reasoning: `Follow-up on: ${item.title}`,
          category: item.category,
          priority: item.priority,
          status: 'request',
          created_by: 'jamie',
          app: item.app ?? 'mission-control',
        }),
      });
    } catch { /* ignore */ }
    toast.success('Changes requested 🔄 — new request created');
    setShowFeedbackInput(false);
    setFeedbackText('');
  };

  const handleRevert = async () => {
    await handleStatusChange('reverted');
    setShowRevertConfirm(false);
    toast.success('Item reverted ↩️');
  };

  const statusCfg = CHANGELOG_STATUS_CONFIG[item.status];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl bg-card border-l border-border/20 flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/20 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={item.status} />
            <AppBadge app={item.app ?? 'mission-control'} />
            <PriorityBadge priority={item.priority} />
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setEditing(!editing)}
                    aria-label="Edit item"
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted/40 transition-colors duration-150 text-muted-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    aria-label="Delete item"
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 transition-colors duration-150 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <button
              onClick={onClose}
              aria-label="Close"
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted/40 transition-colors duration-150 text-muted-foreground ml-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">

            {/* Title + Description (edit mode) */}
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Title</label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-[13px] font-medium" autoFocus />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Reasoning</label>
                  <textarea
                    value={editReasoning}
                    onChange={(e) => setEditReasoning(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 resize-none"
                  />
                </div>

                {/* App + Priority selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">App</label>
                    <SelectPopover
                      value={item.app ?? 'mission-control'}
                      options={APPS.map((a) => ({ value: a.id, label: a.label }))}
                      onChange={(v) => handleFieldUpdate({ app: v })}
                      placeholder="App"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Priority</label>
                    <SelectPopover
                      value={item.priority}
                      options={PRIORITY_OPTIONS}
                      onChange={(v) => handleFieldUpdate({ priority: v })}
                      placeholder="Priority"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit || !editTitle.trim()} className="text-[13px]">
                    {savingEdit ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-[13px]">Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className={cn('text-[15px] font-semibold text-foreground', item.reverted && 'line-through text-muted-foreground')}>
                  {item.title}
                </h2>
                {item.description && (
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-[13px] text-foreground/75 whitespace-pre-wrap">{item.description}</p>
                  </div>
                )}
                {item.reasoning && (
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">Reasoning</p>
                    <p className="text-[13px] text-foreground/75 whitespace-pre-wrap">{item.reasoning}</p>
                  </div>
                )}
              </>
            )}

            {/* Meta */}
            {!editing && (
              <div className="text-[11px] text-muted-foreground/60 flex items-center gap-2">
                <span>{item.created_by === 'casper' ? '👻 Casper' : '👤 Jamie'}</span>
                <span>·</span>
                <span>{relativeTime(item.created_at)}</span>
                {item.shipped_at && (
                  <>
                    <span>·</span>
                    <span>Shipped {relativeTime(item.shipped_at)}</span>
                  </>
                )}
              </div>
            )}

            {/* Commit SHA */}
            {item.commit_sha && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <GitCommit className="h-3 w-3" />
                <span className="font-mono">{item.commit_sha.slice(0, 7)}</span>
              </div>
            )}

            {/* Reverted badge */}
            {item.reverted && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-destructive/20 bg-destructive/10">
                <Undo2 className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-[13px] text-destructive">This item has been reverted</span>
              </div>
            )}

            {/* Associated task */}
            {item.task_id && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-[13px] text-emerald-400 flex-1">Associated task created</span>
                <Link
                  href={`/board?task=${item.task_id}`}
                  className="flex items-center gap-1 text-[13px] text-emerald-400 hover:text-emerald-300 transition-colors duration-150"
                >
                  View <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {/* Feedback display */}
            {item.feedback && (
              <div className={cn(
                'flex items-start gap-2 p-3 rounded-lg border text-[13px]',
                item.feedback.startsWith('approved')
                  ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                  : 'border-amber-500/20 bg-amber-500/5 text-amber-400'
              )}>
                <span>{item.feedback.startsWith('approved') ? '✅' : '🔄'}</span>
                <div>
                  <p className="font-medium">{item.feedback.startsWith('approved') ? 'Approved' : 'Changes Requested'}</p>
                  <p className="text-[12px] opacity-75 mt-0.5">
                    {item.feedback.replace(/^(approved|changes-requested): ?/, '')}
                  </p>
                </div>
              </div>
            )}

            {/* Status Actions */}
            {!editing && (
              <div className="pt-1">
                <p className="text-[11px] font-medium text-muted-foreground mb-2">Actions</p>
                <div className="flex flex-wrap gap-2">

                  {/* Request: Accept → Backlog, Reject */}
                  {item.status === 'request' && (
                    <>
                      <Button size="sm" onClick={() => handleStatusChange('backlog')} disabled={updatingStatus} className="text-[13px] bg-emerald-600 hover:bg-emerald-500 text-white">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Accept → Backlog
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange('reverted')} disabled={updatingStatus} className="text-[13px] border-destructive/30 text-destructive hover:bg-destructive/10">
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        Reject
                      </Button>
                    </>
                  )}

                  {/* Backlog: Start → In Progress */}
                  {item.status === 'backlog' && (
                    <Button size="sm" onClick={() => handleStatusChange('in_progress')} disabled={updatingStatus} className="text-[13px] bg-blue-600 hover:bg-blue-500 text-white">
                      <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                      Start → In Progress
                    </Button>
                  )}

                  {/* In Progress: Ship */}
                  {item.status === 'in_progress' && (
                    <Button size="sm" onClick={() => handleStatusChange('shipped')} disabled={updatingStatus} className="text-[13px] bg-emerald-600 hover:bg-emerald-500 text-white">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Ship → Shipped
                    </Button>
                  )}

                  {/* Shipped: Approve, Request Changes, Revert */}
                  {item.status === 'shipped' && !item.reverted && (
                    <>
                      {showFeedbackInput ? (
                        <div className="w-full space-y-2">
                          <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Optional feedback note..."
                            rows={2}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground/60 focus-visible:outline-none resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleApprove} className="text-[13px] bg-emerald-600 hover:bg-emerald-500 text-white">
                              ✅ Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleRequestChanges} className="text-[13px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                              🔄 Request Changes
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowFeedbackInput(false)} className="text-[13px]">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => setShowFeedbackInput(true)} className="text-[13px] bg-emerald-600 hover:bg-emerald-500 text-white">
                            ✅ Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowFeedbackInput(true)} className="text-[13px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                            🔄 Request Changes
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowRevertConfirm(true)} disabled={updatingStatus} className="text-[13px] border-destructive/30 text-destructive hover:bg-destructive/10">
                            <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                            Revert
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="pt-2 border-t border-border/20">
              <p className="text-[11px] font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Comments
                {comments.length > 0 && (
                  <span className="ml-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {comments.length}
                  </span>
                )}
              </p>

              {loadingComments ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 rounded-lg bg-muted/20 animate-pulse" />
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-[13px] text-muted-foreground/60 text-center py-4">No comments yet</p>
              ) : (
                <div className="space-y-2">
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border/20 bg-muted/20 px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-medium text-foreground">
                          {c.author === 'casper' ? '👻 Casper' : '👤 Jamie'}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">{relativeTime(c.created_at)}</span>
                      </div>
                      <p className="text-[13px] text-foreground/75 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment input */}
              <div className="mt-3 flex gap-2">
                <textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder="Add a comment... (⌘↵ to submit)"
                  rows={2}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 resize-none"
                />
                <button
                  onClick={handleAddComment}
                  disabled={submittingComment || !newComment.trim()}
                  aria-label="Send comment"
                  className="h-8 w-8 self-end flex items-center justify-center rounded-md bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 text-primary-foreground"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revert confirm */}
      <ConfirmDeleteDialog
        open={showRevertConfirm}
        title="Revert Item"
        description={`Are you sure you want to revert "${item.title}"? This will mark it as reverted.`}
        onConfirm={handleRevert}
        onCancel={() => setShowRevertConfirm(false)}
      />

      {/* Delete confirm */}
      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        title="Delete Item"
        description={`Are you sure you want to delete "${item.title}"? This cannot be undone.`}
        onConfirm={async () => {
          try {
            const res = await fetch(`/api/proposals?id=${item.id}`, { method: 'DELETE' });
            if (!res.ok) { toast.error('Failed to delete'); return; }
            toast.success('Deleted');
            onDelete(item.id);
            onClose();
          } catch {
            toast.error('Failed to delete');
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

// ------------------------------------------------------------------ //
// Main Page                                                           //
// ------------------------------------------------------------------ //

const APP_FILTER_OPTIONS = [
  { value: 'all', label: 'All Apps' },
  ...APPS.map((a) => ({ value: a.id, label: a.label })),
] as const;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  ...CHANGELOG_STATUSES,
];

export function UnifiedChangelogPage() {
  const [activeTab, setActiveTab] = useState<TabType>('roadmap');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('changelog-view') as ViewMode) ?? 'kanban';
    }
    return 'kanban';
  });
  const [items, setItems] = useState<ChangelogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ChangelogItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [appFilter, setAppFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (appFilter !== 'all') params.set('app', appFilter);
      const res = await fetch(`/api/proposals?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [appFilter]);

  useEffect(() => {
    setLoading(true);
    fetchItems();
  }, [fetchItems]);

  // Realtime
  useEffect(() => {
    let mounted = true;
    const channel = supabase
      .channel('changelog_proposals_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => {
        if (mounted) fetchItems();
      })
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('changelog-view', viewMode);
  }, [viewMode]);

  // Fetch comment counts
  useEffect(() => {
    if (items.length === 0) return;
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        items.map(async (item) => {
          try {
            const res = await fetch(`/api/proposals/${item.id}/comments`);
            if (res.ok) {
              const data = await res.json();
              counts[item.id] = Array.isArray(data) ? data.length : 0;
            }
          } catch {
            counts[item.id] = 0;
          }
        })
      );
      setCommentCounts(counts);
    };
    fetchCounts();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      return true;
    });
  }, [items, statusFilter]);

  const handleUpdate = (updated: ChangelogItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    if (selectedItem?.id === updated.id) setSelectedItem(updated);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const requestCount = useMemo(() => items.filter((i) => i.status === 'request').length, [items]);

  return (
    <TooltipProvider>
      <div className="text-foreground animate-in fade-in duration-200">
        <div className="flex w-full flex-col gap-5">

          {/* Header */}
          <header className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-muted-foreground">Jamie OS</span>
              <h1 className="text-2xl font-bold tracking-tight">Changelog</h1>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)} className="text-[13px] shrink-0">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Request
            </Button>
          </header>

          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-border/20">
            <button
              onClick={() => setActiveTab('roadmap')}
              className={cn(
                'relative pb-2.5 text-[13px] font-medium transition-colors duration-150',
                activeTab === 'roadmap' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Roadmap
              {requestCount > 0 && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-semibold">
                  {requestCount}
                </span>
              )}
              {activeTab === 'roadmap' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={cn(
                'relative pb-2.5 text-[13px] font-medium transition-colors duration-150',
                activeTab === 'activity' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Activity
              {activeTab === 'activity' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
              )}
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'activity' ? (
            <ActivityPageContent />
          ) : loading ? (
            /* Skeleton */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="h-5 w-24 rounded bg-muted/30 animate-pulse" />
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-24 rounded-lg border border-border/20 bg-muted/20 animate-pulse" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            /* Roadmap content */
            <div className="flex flex-col gap-4">
              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* App filter */}
                <FilterPopover
                  label="All Apps"
                  value={appFilter}
                  options={APP_FILTER_OPTIONS as unknown as { value: string; label: string }[]}
                  onChange={setAppFilter}
                />

                {/* Status filter */}
                <FilterPopover
                  label="All Statuses"
                  value={statusFilter}
                  options={STATUS_FILTER_OPTIONS}
                  onChange={setStatusFilter}
                />

                {/* Clear filters */}
                {(appFilter !== 'all' || statusFilter !== 'all') && (
                  <button
                    onClick={() => { setAppFilter('all'); setStatusFilter('all'); }}
                    aria-label="Clear filters"
                    className="h-8 px-3 text-[13px] rounded-lg border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors duration-150 flex items-center gap-1.5"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                    Clear
                  </button>
                )}

                {/* View toggle */}
                <div className="ml-auto flex items-center gap-1 rounded-lg border border-border/20 p-0.5 bg-secondary">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setViewMode('kanban')}
                        aria-label="Kanban view"
                        className={cn(
                          'h-7 w-7 flex items-center justify-center rounded transition-colors duration-150',
                          viewMode === 'kanban' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Kanban view</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setViewMode('table')}
                        aria-label="Table view"
                        className={cn(
                          'h-7 w-7 flex items-center justify-center rounded transition-colors duration-150',
                          viewMode === 'table' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Table2 className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Table view</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* View */}
              {viewMode === 'kanban' ? (
                <KanbanView
                  items={filteredItems}
                  commentCounts={commentCounts}
                  onItemClick={setSelectedItem}
                  onAddRequest={() => setShowCreate(true)}
                  appFilter={appFilter}
                />
              ) : (
                <TableViewComponent
                  items={filteredItems}
                  commentCounts={commentCounts}
                  onItemClick={setSelectedItem}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail sheet */}
      {selectedItem && (
        <DetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateItemModal
          defaultApp={appFilter === 'all' ? 'mission-control' : appFilter}
          onClose={() => setShowCreate(false)}
          onCreated={(item) => {
            setItems((prev) => [item, ...prev]);
            setShowCreate(false);
            setSelectedItem(item);
          }}
        />
      )}
    </TooltipProvider>
  );
}
