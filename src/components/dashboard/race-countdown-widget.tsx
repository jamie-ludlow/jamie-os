'use client';

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';

interface Race {
  name: string;
  date: Date;
  target?: string;
}

const RACES: Race[] = [
  { name: 'Surrey Half Marathon', date: new Date('2026-03-22T00:00:00'), target: '72:00' },
  { name: 'Kew 10K', date: new Date('2026-03-28T00:00:00'), target: '32:00' },
  { name: 'Sutton 10K', date: new Date('2026-04-19T00:00:00'), target: '32:00' },
  { name: 'London Marathon', date: new Date('2026-04-26T00:00:00'), target: 'Sub 2:30' },
  { name: 'Ranelagh Half Marathon', date: new Date('2026-05-10T00:00:00') },
  { name: 'Edinburgh Marathon', date: new Date('2026-05-24T00:00:00') },
  { name: 'Dorking 10 Miles', date: new Date('2026-06-07T00:00:00') },
  { name: 'Ranelagh 10K', date: new Date('2026-06-21T00:00:00') },
  { name: 'Sydney Marathon', date: new Date('2026-08-30T00:00:00') },
  { name: 'Berlin Marathon', date: new Date('2026-09-27T00:00:00') },
];

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDaysUntil = (date: Date): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  return Math.ceil((targetDate.getTime() - now.getTime()) / 86400000);
};

export function RaceCountdownWidget() {
  const { upcomingRaces, nextRace, followingRaces } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const upcoming = RACES
      .map(race => ({
        ...race,
        daysUntil: getDaysUntil(race.date),
      }))
      .filter(race => race.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil);
    
    const next = upcoming[0];
    const following = upcoming.slice(1, 4);
    
    return { upcomingRaces: upcoming, nextRace: next, followingRaces: following };
  }, []);

  if (!nextRace) {
    return (
      <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground/60" />
          <h2 className="text-[13px] font-semibold">Race Countdown</h2>
        </div>
        <div className="text-center py-6">
          <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-[13px] text-muted-foreground/60">No upcoming races</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-primary" />
        <h2 className="text-[13px] font-semibold">Race Countdown</h2>
      </div>

      <div className="space-y-3">
        {/* Next Race - Prominent */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 hover:bg-primary/10 transition-colors duration-150">
          <p className="text-[10px] font-medium text-muted-foreground/60 mb-1">Next Race</p>
          <p className="text-[15px] font-semibold text-foreground leading-tight">{nextRace.name}</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{formatDate(nextRace.date)}</p>
          
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary tabular-nums">{nextRace.daysUntil}</span>
            <span className="text-[13px] text-muted-foreground/60">
              {nextRace.daysUntil === 1 ? 'day' : 'days'}
            </span>
          </div>
          
          {nextRace.target && (
            <div className="mt-2 pt-2 border-t border-primary/10">
              <p className="text-[10px] font-medium text-muted-foreground/60">Target</p>
              <p className="text-[13px] font-semibold text-foreground tabular-nums mt-0.5">{nextRace.target}</p>
            </div>
          )}
        </div>

        {/* Following Races - Compact List */}
        {followingRaces.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground/60 px-1">Coming Up</p>
            {followingRaces.map((race, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border/20 px-3 py-2 hover:bg-muted/40 transition-colors duration-150"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground leading-tight truncate">{race.name}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{formatDate(race.date)}</p>
                    {race.target && (
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                        Target: <span className="font-medium tabular-nums">{race.target}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[15px] font-bold text-foreground tabular-nums">{race.daysUntil}</p>
                    <p className="text-[10px] text-muted-foreground/60">{race.daysUntil === 1 ? 'day' : 'days'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Total count */}
        {upcomingRaces.length > 1 && (
          <p className="text-[11px] text-muted-foreground/60 px-1 pt-1">
            {upcomingRaces.length} {upcomingRaces.length === 1 ? 'race' : 'races'} scheduled
          </p>
        )}
      </div>
    </section>
  );
}
