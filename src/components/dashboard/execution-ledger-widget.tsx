'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { GitCommit, ListChecks } from 'lucide-react';

export interface ExecutionLedgerEntry {
  id: string;
  title: string;
  status: string;
  task_id: string | null;
  commit_sha: string | null;
  shipped_at: string | null;
  created_at: string;
}

interface ExecutionLedgerWidgetProps {
  entries: ExecutionLedgerEntry[];
  hasError?: boolean;
  isLoading?: boolean;
}

interface LedgerDay {
  key: string;
  label: string;
  planned: ExecutionLedgerEntry[];
  shipped: ExecutionLedgerEntry[];
}

const toDayKey = (dateValue: string) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
};

const formatDayLabel = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

const commitHref = (commit: string) => {
  if (commit.startsWith('http://') || commit.startsWith('https://')) return commit;

  const isShaOnly = /^[a-f0-9]{7,40}$/i.test(commit);
  if (isShaOnly) return `https://github.com/jamie-ludlow/mission-control/commit/${commit}`;

  return `https://github.com/search?q=${encodeURIComponent(commit)}`;
};

export function ExecutionLedgerWidget({ entries, hasError = false, isLoading = false }: ExecutionLedgerWidgetProps) {
  const days = useMemo<LedgerDay[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const range: LedgerDay[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      range.push({
        key,
        label: formatDayLabel(date),
        planned: [],
        shipped: [],
      });
    }

    const dayMap = new Map(range.map((day) => [day.key, day]));

    entries.forEach((entry) => {
      const isShipped = entry.status === 'shipped' && !!entry.shipped_at;
      const dayKey = toDayKey(isShipped ? entry.shipped_at || '' : entry.created_at);
      if (!dayKey || !dayMap.has(dayKey)) return;

      if (isShipped) {
        dayMap.get(dayKey)?.shipped.push(entry);
      } else if (['request', 'backlog', 'in_progress', 'pending_review', 'approved'].includes(entry.status)) {
        dayMap.get(dayKey)?.planned.push(entry);
      }
    });

    return range;
  }, [entries]);

  const totals = useMemo(
    () => days.reduce((acc, day) => ({ planned: acc.planned + day.planned.length, shipped: acc.shipped + day.shipped.length }), { planned: 0, shipped: 0 }),
    [days],
  );

  return (
    <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <h2 className="text-[13px] font-semibold text-foreground">Execution Ledger</h2>
        </div>
        <span className="text-[11px] text-muted-foreground/60">Last 7 days</span>
      </div>

      {hasError && (
        <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
          <p className="text-[13px] text-destructive">Couldn&apos;t load complete ledger data. Showing available entries.</p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="h-10 animate-pulse rounded-lg border border-border/20 bg-muted/30" />
          ))}
        </div>
      )}

      {!isLoading && totals.planned === 0 && totals.shipped === 0 && (
        <div className="rounded-lg border border-dashed border-border/30 px-4 py-6 text-center">
          <p className="text-[13px] font-medium text-foreground">No execution activity this week</p>
          <p className="mt-1 text-[13px] text-muted-foreground">Planned and shipped outcomes will appear here once updates are logged.</p>
        </div>
      )}

      {!isLoading && (totals.planned > 0 || totals.shipped > 0) && (
        <div className="space-y-2">
          {days.map((day) => (
            <div key={day.key} className="rounded-lg border border-border/20 bg-background/40 px-3 py-2.5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium text-foreground">{day.label}</p>
                <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                  <span>Planned {day.planned.length}</span>
                  <span>Shipped {day.shipped.length}</span>
                </div>
              </div>

              <div className="grid gap-2 lg:grid-cols-2">
                <div className="space-y-1.5">
                  {day.planned.slice(0, 2).map((entry) => (
                    <div key={`planned-${entry.id}`} className="rounded border border-border/20 px-2 py-1.5">
                      <p className="truncate text-[13px] text-foreground">{entry.title}</p>
                      {entry.task_id && (
                        <Link
                          href={`/board?task=${entry.task_id}`}
                          className="mt-1 inline-flex text-[13px] text-primary hover:text-primary/80 transition-colors duration-150"
                        >
                          Task {entry.task_id.slice(0, 8)}
                        </Link>
                      )}
                    </div>
                  ))}
                  {day.planned.length === 0 && <p className="text-[13px] text-muted-foreground/60">No planned outcomes</p>}
                </div>

                <div className="space-y-1.5">
                  {day.shipped.slice(0, 2).map((entry) => (
                    <div key={`shipped-${entry.id}`} className="rounded border border-border/20 px-2 py-1.5">
                      <p className="truncate text-[13px] text-foreground">{entry.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {entry.task_id && (
                          <Link
                            href={`/board?task=${entry.task_id}`}
                            className="inline-flex text-[13px] text-primary hover:text-primary/80 transition-colors duration-150"
                          >
                            Task {entry.task_id.slice(0, 8)}
                          </Link>
                        )}
                        {entry.commit_sha && (
                          <a
                            href={commitHref(entry.commit_sha)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors duration-150"
                          >
                            <GitCommit className="h-3 w-3" />
                            <span className="font-mono">{entry.commit_sha.slice(0, 7)}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  {day.shipped.length === 0 && <p className="text-[13px] text-muted-foreground/60">No shipped outcomes</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
