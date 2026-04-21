'use client';

import { useMemo, useState } from 'react';
import type { Task } from '@/lib/types';
import { AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, User, Workflow, ChevronRight } from 'lucide-react';
import { toDisplayName } from '@/lib/constants';

type TaskWithProject = Task & { project_name?: string; project_color?: string };

type SortField = 'task' | 'reason' | 'owner' | 'next';
type SortOrder = 'asc' | 'desc';

interface BlockerBoardViewProps {
  tasks: TaskWithProject[];
  onTaskClick: (task: TaskWithProject) => void;
}

interface BlockerMeta {
  reason: string;
  owner: string;
  nextStep: string;
}

function getLabelValue(labels: string[] | undefined, prefixes: string[]): string {
  if (!labels || labels.length === 0) return '';
  for (const label of labels) {
    const lower = label.toLowerCase();
    const prefix = prefixes.find((p) => lower.startsWith(p));
    if (prefix) {
      const value = label.slice(prefix.length).trim();
      if (value) return value;
    }
  }
  return '';
}

function extractFromDescription(description: string | null | undefined, patterns: RegExp[]): string {
  if (!description) return '';
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function getBlockerMeta(task: TaskWithProject): BlockerMeta {
  const reasonFromDescription = extractFromDescription(task.description, [
    /(?:^|\n)\s*blocker\s*reason\s*:\s*(.+)$/im,
    /(?:^|\n)\s*blocked\s*by\s*:\s*(.+)$/im,
    /(?:^|\n)\s*reason\s*:\s*(.+)$/im,
  ]);

  const ownerFromDescription = extractFromDescription(task.description, [
    /(?:^|\n)\s*dependency\s*owner\s*:\s*(.+)$/im,
    /(?:^|\n)\s*owner\s*:\s*(.+)$/im,
    /(?:^|\n)\s*waiting\s*on\s*:\s*(.+)$/im,
  ]);

  const nextStepFromDescription = extractFromDescription(task.description, [
    /(?:^|\n)\s*next\s*unblock\s*step\s*:\s*(.+)$/im,
    /(?:^|\n)\s*next\s*step\s*:\s*(.+)$/im,
    /(?:^|\n)\s*unblock\s*step\s*:\s*(.+)$/im,
  ]);

  const reasonFromLabel = getLabelValue(task.labels, ['blocker:', 'reason:']);
  const ownerFromLabel = getLabelValue(task.labels, ['owner:', 'dependency-owner:', 'waiting-on:']);
  const nextFromLabel = getLabelValue(task.labels, ['next:', 'next-step:', 'unblock-step:']);

  return {
    reason: reasonFromDescription || reasonFromLabel,
    owner: ownerFromDescription || ownerFromLabel,
    nextStep: nextStepFromDescription || nextFromLabel,
  };
}

function isBlockedTask(task: TaskWithProject, meta: BlockerMeta): boolean {
  const status = (task.status || '').toLowerCase();
  const labels = (task.labels || []).map((l) => l.toLowerCase());
  const hasBlockLabel = labels.some((l) => l === 'blocked' || l === 'blocker' || l.startsWith('blocker:'));
  const statusBlocked = status.includes('blocked') || status.includes('blocker') || status === 'on-hold';
  return statusBlocked || hasBlockLabel || Boolean(meta.reason || meta.owner || meta.nextStep);
}

function SortHeader({
  field,
  sortField,
  sortOrder,
  onSort,
  children,
  className = '',
}: {
  field: SortField;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const isActive = sortField === field;
  return (
    <th
      className={`py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground/60 cursor-pointer select-none transition-colors duration-150 ${isActive ? 'text-foreground' : 'hover:text-muted-foreground'} ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive ? (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );
}

export function BlockerBoardView({ tasks, onTaskClick }: BlockerBoardViewProps) {
  const [sortField, setSortField] = useState<SortField>('task');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const blockerRows = useMemo(() => {
    const rows = tasks
      .map((task) => {
        const meta = getBlockerMeta(task);
        return { task, meta };
      })
      .filter(({ task, meta }) => isBlockedTask(task, meta) && task.status !== 'done');

    return rows.sort((a, b) => {
      const aDisplayOwner = a.meta.owner || (a.task.assignee ? toDisplayName(a.task.assignee) : '—');
      const bDisplayOwner = b.meta.owner || (b.task.assignee ? toDisplayName(b.task.assignee) : '—');
      const aValue =
        sortField === 'task' ? a.task.title :
        sortField === 'reason' ? (a.meta.reason || '') :
        sortField === 'owner' ? aDisplayOwner :
        (a.meta.nextStep || '');
      const bValue =
        sortField === 'task' ? b.task.title :
        sortField === 'reason' ? (b.meta.reason || '') :
        sortField === 'owner' ? bDisplayOwner :
        (b.meta.nextStep || '');

      const compare = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
      return sortOrder === 'asc' ? compare : -compare;
    });
  }, [tasks, sortField, sortOrder]);

  const onSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortOrder('asc');
  };

  if (blockerRows.length === 0) {
    return (
      <div className="rounded-lg border border-border/20 bg-card px-4 py-10">
        <div className="flex flex-col items-center justify-center text-center">
          <Workflow className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
          <p className="mt-3 text-[13px] font-medium text-foreground">No blocked tasks</p>
          <p className="mt-1 max-w-[420px] text-[13px] text-muted-foreground/60">
            Tasks marked as blocked, with blocker metadata in labels or description, will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/20 bg-card overflow-hidden">
      <div className="overflow-x-auto" role="region" aria-label="Blocked tasks table">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border/20">
              <SortHeader field="task" sortField={sortField} sortOrder={sortOrder} onSort={onSort} className="min-w-[280px]">Blocked task</SortHeader>
              <SortHeader field="reason" sortField={sortField} sortOrder={sortOrder} onSort={onSort} className="min-w-[260px]">Blocker reason</SortHeader>
              <SortHeader field="owner" sortField={sortField} sortOrder={sortOrder} onSort={onSort} className="min-w-[180px]">Dependency owner</SortHeader>
              <SortHeader field="next" sortField={sortField} sortOrder={sortOrder} onSort={onSort} className="min-w-[280px]">Next unblock step</SortHeader>
            </tr>
          </thead>
          <tbody>
            {blockerRows.map(({ task, meta }) => {
              const displayOwner = meta.owner || (task.assignee ? toDisplayName(task.assignee) : '—');

              return (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="group/row cursor-pointer border-b border-border/20 transition-colors duration-150 hover:bg-muted/40"
                >
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-foreground">{task.title}</p>
                        <div className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground/60">
                          <span className="truncate">{task.project_name || 'No project'}</span>
                          <span aria-hidden="true">•</span>
                          <span className="truncate">{task.status}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="line-clamp-2 text-[13px] text-foreground">{meta.reason || 'No blocker reason added'}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/20 bg-secondary px-2 py-1">
                      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                      <span className="truncate text-[13px] text-foreground">{displayOwner}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-start gap-1.5">
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
                      <p className="line-clamp-2 text-[13px] text-foreground">{meta.nextStep || 'No next step defined'}</p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
