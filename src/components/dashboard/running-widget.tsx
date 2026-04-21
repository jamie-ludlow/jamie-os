'use client';

import { useMemo } from 'react';

const RACE_DATE = new Date('2026-04-27T00:00:00');
const MARATHON_PB = '2:30:30';

export function RunningWidget() {
  const daysUntil = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((RACE_DATE.getTime() - now.getTime()) / 86400000));
  }, []);

  return (
    <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🏃</span>
        <h2 className="text-[13px] font-semibold">Running</h2>
        <span className="ml-auto rounded-full border border-status-warning/20 bg-status-warning/10 px-2 py-0.5 text-[10px] font-medium text-status-warning">
          Strava — Coming Soon
        </span>
      </div>

      <div className="space-y-3">
        {/* Marathon PB */}
        <div className="rounded-lg border border-border/20 px-3 py-2.5 hover:bg-muted/40 transition-colors duration-150">
          <p className="text-[10px] font-medium text-muted-foreground/60 mb-0.5">Marathon PB</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">{MARATHON_PB}</p>
        </div>

        {/* Next Race */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 hover:bg-primary/10 transition-colors duration-150">
          <p className="text-[10px] font-medium text-muted-foreground/60 mb-0.5">Next Race</p>
          <p className="text-[13px] font-semibold text-foreground">London Marathon</p>
          <p className="text-[11px] text-muted-foreground/60">27 April 2026</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary tabular-nums">{daysUntil}</span>
            <span className="text-[11px] text-muted-foreground/60">days to go</span>
          </div>
        </div>
      </div>
    </section>
  );
}
