'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, Bot, Clock3, SignalHigh } from 'lucide-react';
import type { ExecutionLedgerEntry } from './execution-ledger-widget';

interface AutomationRoiWidgetProps {
  entries: ExecutionLedgerEntry[];
  hasError?: boolean;
  isLoading?: boolean;
}

interface AutomationRoiItem {
  id: string;
  title: string;
  status: string;
  task_id: string | null;
  eventDate: string;
  estimatedMinutes: number;
  estimatedNoiseEvents: number;
}

const IMPACT_BY_STATUS: Record<string, { minutes: number; noise: number }> = {
  shipped: { minutes: 45, noise: 22 },
  approved: { minutes: 30, noise: 14 },
  pending_review: { minutes: 20, noise: 9 },
  in_progress: { minutes: 15, noise: 7 },
  backlog: { minutes: 10, noise: 4 },
  request: { minutes: 8, noise: 3 },
};

const formatMinutes = (totalMinutes: number) => {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const getStatusLabel = (status: string) => {
  const value = status.replace(/_/g, ' ');
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const statusTone = (status: string) => {
  if (status === 'shipped') return 'border-status-success/20 bg-status-success/15 text-status-success';
  if (status === 'approved') return 'border-primary/25 bg-primary/10 text-primary';
  if (status === 'pending_review') return 'border-amber-500/25 bg-amber-500/10 text-amber-500';
  if (status === 'in_progress') return 'border-sky-500/25 bg-sky-500/10 text-sky-500';
  return 'border-border/30 bg-muted/50 text-muted-foreground';
};

export function AutomationRoiWidget({ entries, hasError = false, isLoading = false }: AutomationRoiWidgetProps) {
  const roi = useMemo(() => {
    const sorted = [...entries]
      .map((entry) => {
        const eventDate = entry.status === 'shipped' && entry.shipped_at ? entry.shipped_at : entry.created_at;
        return { entry, eventDate };
      })
      .filter(({ eventDate }) => !!eventDate)
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

    const changedItems: AutomationRoiItem[] = sorted.map(({ entry, eventDate }) => {
      const impact = IMPACT_BY_STATUS[entry.status] || IMPACT_BY_STATUS.request;
      return {
        id: entry.id,
        title: entry.title,
        status: entry.status,
        task_id: entry.task_id,
        eventDate,
        estimatedMinutes: impact.minutes,
        estimatedNoiseEvents: impact.noise,
      };
    });

    const totals = changedItems.reduce(
      (acc, item) => ({
        estimatedMinutes: acc.estimatedMinutes + item.estimatedMinutes,
        estimatedNoiseEvents: acc.estimatedNoiseEvents + item.estimatedNoiseEvents,
      }),
      { estimatedMinutes: 0, estimatedNoiseEvents: 0 },
    );

    return {
      changedItems,
      changedCount: changedItems.length,
      estimatedMinutes: totals.estimatedMinutes,
      estimatedNoiseEvents: totals.estimatedNoiseEvents,
    };
  }, [entries]);

  return (
    <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h2 className="text-[13px] font-semibold text-foreground">Automation ROI</h2>
        </div>
        <span className="text-[11px] text-muted-foreground/60">This week</span>
      </div>

      {hasError && (
        <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
          <p className="text-[13px] text-destructive">Couldn&apos;t load all automation updates. Showing available data.</p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="h-10 animate-pulse rounded-lg border border-border/20 bg-muted/30" />
          ))}
        </div>
      )}

      {!isLoading && roi.changedCount === 0 && (
        <div className="rounded-lg border border-dashed border-border/30 px-4 py-6 text-center">
          <p className="text-[13px] font-medium text-foreground">No automation changes this week</p>
          <p className="mt-1 text-[13px] text-muted-foreground">As updates are planned or shipped, estimated impact appears here.</p>
        </div>
      )}

      {!isLoading && roi.changedCount > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border/20 bg-background/50 px-3 py-2">
              <p className="text-[11px] text-muted-foreground/60">Changed</p>
              <p className="mt-1 text-[13px] font-semibold text-foreground">{roi.changedCount}</p>
            </div>
            <div className="rounded-lg border border-border/20 bg-background/50 px-3 py-2">
              <div className="flex items-center gap-1 text-muted-foreground/60">
                <Clock3 className="h-3.5 w-3.5" />
                <p className="text-[11px]">Time saved</p>
              </div>
              <p className="mt-1 text-[13px] font-semibold text-foreground">{formatMinutes(roi.estimatedMinutes)}</p>
            </div>
            <div className="rounded-lg border border-border/20 bg-background/50 px-3 py-2">
              <div className="flex items-center gap-1 text-muted-foreground/60">
                <SignalHigh className="h-3.5 w-3.5" />
                <p className="text-[11px]">Noise reduced</p>
              </div>
              <p className="mt-1 text-[13px] font-semibold text-foreground">{roi.estimatedNoiseEvents} events</p>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            {roi.changedItems.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-lg border border-border/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <p className="flex-1 truncate text-[13px] font-medium text-foreground">{item.title}</p>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusTone(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] text-muted-foreground">
                    Est. {item.estimatedMinutes} min saved · {item.estimatedNoiseEvents} fewer events
                  </p>
                  {item.task_id ? (
                    <Link
                      href={`/board?task=${item.task_id}`}
                      className="inline-flex items-center gap-1 text-[13px] text-primary hover:text-primary/80 transition-colors duration-150"
                    >
                      View
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground/60">Impact is modelled from current automation status and will tighten as live telemetry lands.</p>
        </>
      )}
    </section>
  );
}
