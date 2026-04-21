'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Trophy, TrendingUp, X, Calendar as CalendarIcon, CalendarDays, List, Filter, Pencil, Check, RefreshCw } from 'lucide-react';
import { convertDistanceToMiles, convertPaceToMiles } from '@/lib/strava';
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, startOfYear, endOfYear, subMonths, subYears, format, subWeeks } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

// Types
interface StravaActivity {
  id: number;
  name: string;
  distance_km: number;
  pace: string;
  hr?: number;
  date: string;
  type: string;
  duration: string;
  workout_type?: number | null;
}

interface StravaLap {
  lap: number;
  distance_km: number;
  pace: string;
  hr?: number;
  time: string;
}

interface Race {
  name: string;
  date: string;
  distance: string;
  distanceKm: number;
  goal?: string;
}

interface TrainingSession {
  date: string;
  workout: string;
  distanceKm: number;
  pace: string;
  type: 'easy' | 'tempo' | 'long' | 'track' | 'recovery' | 'race' | 'rest';
  notes?: string;
}

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  completedRuns: StravaActivity[];
  plannedSessions: TrainingSession[];
  race?: Race;
  sunrise?: string;
  sunset?: string;
}

interface DetailPanelData {
  type: 'completed' | 'planned' | 'race';
  activity?: StravaActivity;
  session?: TrainingSession;
  race?: Race;
}

// All 12 races
const RACES: Race[] = [
  { name: 'Wokingham HM', date: '2026-02-22', distance: 'Half Marathon', distanceKm: 21.1 },
  { name: 'Surrey HM', date: '2026-03-22', distance: 'Half Marathon', distanceKm: 21.1 },
  { name: 'Kew 10K', date: '2026-03-28', distance: '10K', distanceKm: 10 },
  { name: 'Sutton 10K', date: '2026-04-19', distance: '10K', distanceKm: 10 },
  { name: 'London Marathon', date: '2026-04-26', distance: 'Marathon', distanceKm: 42.2 },
  { name: 'Ranelagh HM', date: '2026-05-10', distance: 'Half Marathon', distanceKm: 21.1 },
  { name: 'Edinburgh Marathon', date: '2026-05-24', distance: 'Marathon', distanceKm: 42.2 },
  { name: 'Dorking 10M', date: '2026-06-07', distance: '10 Miles', distanceKm: 16.1 },
  { name: 'Ranelagh 10K', date: '2026-06-21', distance: '10K', distanceKm: 10 },
  { name: 'Sydney Marathon', date: '2026-08-30', distance: 'Marathon', distanceKm: 42.2 },
  { name: 'Berlin Marathon', date: '2026-09-27', distance: 'Marathon', distanceKm: 42.2 },
  { name: 'Valencia Marathon', date: '2026-12-06', distance: 'Marathon', distanceKm: 42.2 },
];

// 9-Week London Marathon Training Plan
// Goal: Sub 2:30:00 | Target Pace: 5:43/mi | Race Date: 26 April 2026
interface WeeklyTrainingPlan {
  week: number;
  dates: string;
  phase: 'BUILD' | 'PEAK' | 'SPECIFIC' | 'RECOVERY' | 'TAPER' | 'RACE WEEK';
  targetKm: number;
  raceEvent?: string;
  sessions: {
    day: string;
    type: string;
    distance: string;
    pace: string;
    notes: string;
  }[];
}

const LONDON_MARATHON_PLAN: WeeklyTrainingPlan[] = [
  {
    week: 1,
    dates: '23 Feb - 1 Mar',
    phase: 'BUILD',
    targetKm: 88.5 * 1.60934, // 88.5mi — partial week (Mon-Thu passed)
    sessions: [
      { day: 'Mon', type: 'Rest', distance: '-', pace: '-', notes: '' },
      { day: 'Tue', type: 'Track', distance: '7mi', pace: '-', notes: 'Club Track Session (Woking AC)' },
      { day: 'Wed', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Wed', type: 'Easy', distance: '5mi', pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Thu', type: 'Steady', distance: '10mi', pace: '6:42/mi', notes: 'Evening steady' },
      { day: 'Fri', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Fri', type: 'Steady', distance: '8mi', pace: '6:42-6:58/mi', notes: 'PM steady' },
      { day: 'Sat', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Sat', type: 'Easy', distance: '5mi', pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Sun', type: 'Long Run', distance: '20mi', pace: 'Progressive', notes: '10mi @ 7:14, 5mi @ 6:34, 5mi @ 6:02' }
    ]
  },
  {
    week: 2,
    dates: '2 Mar - 8 Mar',
    phase: 'BUILD',
    targetKm: 90 * 1.60934, // 90mi
    sessions: [
      { day: 'Mon', type: 'Rest', distance: '-', pace: '-', notes: 'Rest day — recover from Sunday long run' },
      { day: 'Tue', type: 'Track', distance: '7mi', pace: '-', notes: 'Club Track Session (Woking AC)' },
      { day: 'Wed', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Wed', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Thu', type: 'Marathon Pace', distance: '14mi', pace: '5:46/mi MP', notes: '2mi w/up, 3mi-2.5mi-2mi-1.2mi @ 5:46 (800m @ 6:50 recovery), 2mi c/down' },
      { day: 'Fri', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Fri', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Sat', type: 'Moderate', distance: '11mi', pace: '6:26-6:42/mi', notes: 'Steady aerobic' },
      { day: 'Sun', type: 'Long Run', distance: '23mi', pace: '6:02/mi', notes: '2mi w/up, 19mi @ 6:02 (95% MP) steady, 2mi c/down' }
    ]
  },
  {
    week: 3,
    dates: '9 Mar - 15 Mar',
    phase: 'PEAK',
    targetKm: 95 * 1.60934, // 95mi
    sessions: [
      { day: 'Mon', type: 'Recovery', distance: '5mi', pace: '8:03/mi', notes: 'AM recovery' },
      { day: 'Mon', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Tue', type: 'Track', distance: '7mi', pace: '-', notes: 'Club Track Session (Woking AC)' },
      { day: 'Tue', type: 'Easy', distance: '5mi', pace: '7:14/mi', notes: 'PM easy shakeout' },
      { day: 'Wed', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Wed', type: 'Steady', distance: '7mi', pace: '6:42/mi', notes: 'PM steady' },
      { day: 'Thu', type: 'Tempo', distance: '12mi', pace: '6:10/mi', notes: '2mi w/up, 8mi @ 6:10, 2mi c/down' },
      { day: 'Fri', type: 'Easy', distance: '7mi', pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Fri', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Sat', type: 'Moderate + Hills', distance: '11mi', pace: '6:34/mi', notes: '7mi moderate + 8 x 40m hill sprints + 4mi easy' },
      { day: 'Sun', type: 'Long Run', distance: '23mi', pace: 'MP Finish', notes: '10mi @ 6:58, 11mi @ 5:46 (MP), 2mi c/down — PEAK SESSION' }
    ]
  },
  {
    week: 4,
    dates: '16 Mar - 22 Mar',
    phase: 'RECOVERY',
    targetKm: 71 * 1.60934, // 71mi
    raceEvent: 'Surrey HM (Sun 22 Mar)',
    sessions: [
      { day: 'Mon', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Mon', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Tue', type: 'Track', distance: '7mi', pace: '-', notes: 'Club Track Session (Woking AC) — may feel flat, OK' },
      { day: 'Tue', type: 'Easy', distance: '4mi', pace: '7:14/mi', notes: 'PM easy shakeout' },
      { day: 'Wed', type: 'Rest', distance: '-', pace: '-', notes: 'Rest day — recovery week breather before Thursday tempo' },
      { day: 'Thu', type: 'Tempo', distance: '11mi', pace: '6:19/mi', notes: '2mi w/up, 7mi @ 6:19, 2mi c/down' },
      { day: 'Fri', type: 'Shakeout', distance: '6mi', pace: '7:31/mi', notes: '+ 4 x 100m strides' },
      { day: 'Sat', type: 'Easy', distance: '5mi', pace: '7:31/mi', notes: 'Pre-race shakeout + strides' },
      { day: 'Sun', type: 'Race', distance: '~15mi', pace: 'Race', notes: 'Surrey Half Marathon (target 70:30) + 2mi w/up' }
    ]
  },
  {
    week: 5,
    dates: '23 Mar - 29 Mar',
    phase: 'SPECIFIC',
    targetKm: 86 * 1.60934, // 86mi
    raceEvent: 'Kew 10K (Sat 28 Mar)',
    sessions: [
      { day: 'Mon', type: 'Recovery', distance: '5mi', pace: '8:19/mi', notes: 'AM post-half recovery' },
      { day: 'Mon', type: 'Easy', distance: '5mi', pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Tue', type: 'Track', distance: '7mi', pace: '-', notes: 'Club Track Session (Woking AC)' },
      { day: 'Tue', type: 'Easy', distance: '4mi', pace: '7:14/mi', notes: 'PM easy shakeout' },
      { day: 'Wed', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Wed', type: 'Easy', distance: '5mi', pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Thu', type: 'Marathon Pace', distance: '13mi', pace: '5:46/mi MP', notes: '2mi w/up, 4mi @ 5:46, 1mi recovery, 4mi @ 5:46, 2mi c/down' },
      { day: 'Fri', type: 'Easy', distance: '5mi', pace: '7:31/mi', notes: 'AM easy' },
      { day: 'Fri', type: 'Shakeout', distance: '5mi', pace: '7:31/mi', notes: 'PM pre-race easy + strides' },
      { day: 'Sat', type: 'Race', distance: '~9mi', pace: 'Race', notes: 'Kew 10K (target 32:00) + 1.5mi w/up + 1.5mi c/down' },
      { day: 'Sun', type: 'Long Run', distance: '22mi', pace: 'Specific', notes: '4mi @ 6:58, 14mi @ 5:54-6:02 (92-95% MP), 4mi @ 6:26 — CRITICAL SESSION' }
    ]
  },
  {
    week: 6,
    dates: '30 Mar - 5 Apr',
    phase: 'SPECIFIC',
    targetKm: 93 * 1.60934, // 93mi
    sessions: [
      { day: 'Mon', type: 'Recovery', distance: '5mi', pace: '8:03/mi', notes: 'AM recovery after Sunday long run' },
      { day: 'Mon', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Tue', type: 'Track', distance: '7mi', pace: '-', notes: 'Club Track Session (Woking AC) — last hard track' },
      { day: 'Tue', type: 'Easy', distance: '5mi', pace: '7:14/mi', notes: 'PM easy shakeout' },
      { day: 'Wed', type: 'Rest', distance: '-', pace: '-', notes: 'Rest day — absorb quality, prep for Thursday MP session' },
      { day: 'Thu', type: 'Marathon Pace', distance: '14mi', pace: '5:46/mi MP', notes: '2mi w/up, 10mi @ 5:46 (MP), 2mi c/down — key session' },
      { day: 'Fri', type: 'Easy', distance: '7mi', pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Fri', type: 'Easy', distance: '6mi', pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Sat', type: 'Moderate', distance: '11mi', pace: '6:34/mi', notes: 'Steady aerobic' },
      { day: 'Sun', type: 'Long Run', distance: '20mi', pace: '6:02/mi', notes: '2mi w/up, 16mi @ 6:02 (95% MP), 2mi c/down — final quality long run' }
    ]
  },
  {
    week: 7,
    dates: '6 Apr - 12 Apr',
    phase: 'TAPER',
    targetKm: 72 * 1.60934, // 72mi
    sessions: [
      { day: 'Mon', type: 'Easy', distance: '6mi', pace: '7:23/mi', notes: 'AM easy' },
      { day: 'Mon', type: 'Easy', distance: '5mi', pace: '7:23/mi', notes: 'PM easy' },
      { day: 'Tue', type: 'Track', distance: '7mi', pace: '-', notes: 'Club Track Session (Woking AC) — reduced volume, keep sharp' },
      { day: 'Tue', type: 'Easy', distance: '5mi', pace: '7:23/mi', notes: 'PM easy shakeout' },
      { day: 'Wed', type: 'Easy', distance: '6mi', pace: '7:23/mi', notes: '' },
      { day: 'Thu', type: 'Marathon Pace', distance: '10mi', pace: '5:46/mi MP', notes: '2mi w/up, 6mi @ MP (dress rehearsal), 2mi c/down' },
      { day: 'Fri', type: 'Easy', distance: '6mi', pace: '7:23/mi', notes: 'AM easy' },
      { day: 'Fri', type: 'Easy', distance: '5mi', pace: '7:23/mi', notes: 'PM easy' },
      { day: 'Sat', type: 'Easy + Strides', distance: '8mi', pace: '7:23/mi', notes: '+ 6 x 100m strides' },
      { day: 'Sun', type: 'Long Run', distance: '14mi', pace: '6:50-7:14/mi', notes: 'Relaxed, conversational — NOT a workout' }
    ]
  },
  {
    week: 8,
    dates: '13 Apr - 19 Apr',
    phase: 'TAPER',
    targetKm: 51 * 1.60934, // 51mi
    raceEvent: 'Sutton 10K (Sun 19 Apr)',
    sessions: [
      { day: 'Mon', type: 'Easy', distance: '7mi', pace: '7:23/mi', notes: 'AM easy' },
      { day: 'Mon', type: 'Easy', distance: '5mi', pace: '7:23/mi', notes: 'PM easy' },
      { day: 'Tue', type: 'Sharpener', distance: '8mi', pace: '5:38-5:43/mi', notes: '2mi w/up, 6 x 1K @ 5:38-5:43 (90s jog), 2mi c/down — last quality' },
      { day: 'Wed', type: 'Rest', distance: '-', pace: '-', notes: 'Rest day — taper week, save legs for Sutton 10K' },
      { day: 'Thu', type: 'Easy', distance: '7mi', pace: '7:23/mi', notes: '' },
      { day: 'Fri', type: 'Shakeout', distance: '5mi', pace: '7:31/mi', notes: '+ 4 x 100m strides' },
      { day: 'Sat', type: 'Easy', distance: '4mi', pace: '7:31/mi', notes: 'Pre-race shakeout' },
      { day: 'Sun', type: 'Race', distance: '~9mi', pace: 'Race', notes: 'Sutton 10K (target 32:00) + 1mi w/up + 1mi c/down' }
    ]
  },
  {
    week: 9,
    dates: '20 Apr - 26 Apr',
    phase: 'RACE WEEK',
    targetKm: 19 * 1.60934, // 19mi (excl marathon)
    raceEvent: 'London Marathon (Sun 26 Apr)',
    sessions: [
      { day: 'Mon', type: 'Easy + Strides', distance: '5mi', pace: '7:23/mi', notes: '+ 6 x 100m strides' },
      { day: 'Tue', type: 'Easy', distance: '5mi', pace: '7:31/mi', notes: '' },
      { day: 'Wed', type: 'Easy', distance: '4mi', pace: '7:31/mi', notes: '+ 4 x 20s pick-ups @ race pace' },
      { day: 'Thu', type: 'Shakeout', distance: '3mi', pace: '7:31/mi', notes: 'Very easy shake-out' },
      { day: 'Fri', type: 'Shakeout', distance: '2mi', pace: '8:03/mi', notes: '15 min easy + 4 x 20s pick-ups' },
      { day: 'Sat', type: 'Shakeout', distance: '3mi', pace: '7:31/mi', notes: 'Pre-marathon shakeout + 4 x 100m strides' },
      { day: 'Sun', type: 'Race', distance: '26.2mi', pace: '5:41/mi', notes: 'LONDON MARATHON — Target: Sub 2:30 (aim 2:29:30)' }
    ]
  }
];

// Legacy flat training plan for calendar compatibility (auto-generated from LONDON_MARATHON_PLAN)
const TRAINING_PLAN: TrainingSession[] = LONDON_MARATHON_PLAN.flatMap(week => {
  const [startDay, endDay] = week.dates.split(' - ');
  const startDate = new Date(`${startDay} 2026`);
  
  const dayOffsets: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return week.sessions.map((session) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (dayOffsets[session.day] ?? 0));
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    
    // Map session types to TrainingSession type
    let type: 'easy' | 'tempo' | 'long' | 'track' | 'recovery' | 'race' | 'rest' = 'easy';
    const sessionType = session.type.toLowerCase();
    if (sessionType.includes('recovery')) type = 'recovery';
    else if (sessionType.includes('tempo') || sessionType.includes('marathon pace')) type = 'tempo';
    else if (sessionType.includes('long')) type = 'long';
    else if (sessionType.includes('track')) type = 'track';
    else if (sessionType.includes('race')) type = 'race';
    else if (sessionType.includes('rest')) type = 'rest';
    
    // Parse distance (handle both km and mi)
    const distanceMatch = session.distance.match(/(\d+\.?\d*)\s*(mi|km)?/);
    let distanceKm = 0;
    if (distanceMatch) {
      const value = parseFloat(distanceMatch[1]);
      const unit = distanceMatch[2];
      if (unit === 'mi') {
        distanceKm = value * 1.60934; // Convert miles to km
      } else {
        distanceKm = value;
      }
    }
    
    return {
      date: dateStr,
      workout: `${session.type}${session.notes ? ' - ' + session.notes : ''}`,
      distanceKm,
      pace: session.pace,
      type,
      notes: session.notes || undefined
    };
  });
});

// Personal bests
const PBs = {
  '10K': '32:38',
  '10M': '53:17',
  'HM': '71:57',
  'M': '2:30:30',
};

// Generate session summary from lap data
function generateSessionSummary(laps: StravaLap[], activityName: string, useMiles: boolean = true): string {
  if (laps.length === 0) return 'No lap data available.';
  if (laps.length === 1) {
    const lap = laps[0];
    const distance = useMiles 
      ? `${convertDistanceToMiles(lap.distance_km).toFixed(2)}mi`
      : `${lap.distance_km.toFixed(1)}km`;
    const pace = useMiles ? convertPaceToMiles(lap.pace) : lap.pace;
    return `Single ${distance} run at ${pace}${lap.hr ? ` with average HR ${lap.hr}bpm` : ''}.`;
  }

  // Analyze pace patterns
  const paces = laps.map(l => {
    const match = l.pace.match(/(\d+):(\d+)/);
    if (!match) return 0;
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  });

  const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;
  const minPace = Math.min(...paces);
  const maxPace = Math.max(...paces);
  const paceVariance = maxPace - minPace;

  // Check for interval pattern (alternating fast/slow)
  const isInterval = laps.length >= 4 && laps.some((lap, i) => {
    if (i === 0) return false;
    const prevPace = paces[i - 1];
    const currentPace = paces[i];
    return Math.abs(currentPace - prevPace) > 30; // 30 second difference
  });

  // Check for progression (getting faster)
  const firstHalf = paces.slice(0, Math.floor(laps.length / 2));
  const secondHalf = paces.slice(Math.floor(laps.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const isNegativeSplit = secondAvg < firstAvg - 5;
  const isPositiveSplit = secondAvg > firstAvg + 5;

  // HR analysis
  const hrs = laps.map(l => l.hr).filter(Boolean) as number[];
  let hrPattern = '';
  if (hrs.length > 1) {
    const hrDrift = hrs[hrs.length - 1] - hrs[0];
    if (hrDrift > 20) hrPattern = ` Significant HR drift from ${hrs[0]} to ${hrs[hrs.length - 1]}bpm indicating accumulating stress.`;
    else if (hrDrift > 10) hrPattern = ` Heart rate gradually drifted from ${hrs[0]} to ${hrs[hrs.length - 1]}bpm suggesting moderate fatigue.`;
    else hrPattern = ` Heart rate remained stable around ${Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length)}bpm.`;
  }

  // Determine session type and build summary
  if (isInterval) {
    const fastLaps = laps.filter((_, i) => i % 2 === 0);
    const recoveryLaps = laps.filter((_, i) => i % 2 === 1);
    const fastPace = useMiles ? convertPaceToMiles(fastLaps[0]?.pace || '') : (fastLaps[0]?.pace || '');
    const recoveryPace = useMiles ? convertPaceToMiles(recoveryLaps[0]?.pace || '') : (recoveryLaps[0]?.pace || '');
    return `${Math.floor(laps.length / 2)} intervals at ${fastPace} with recovery jogs at ${recoveryPace}.${hrPattern}`;
  }

  if (paceVariance < 20 && laps.length > 3) {
    const firstPace = useMiles ? convertPaceToMiles(laps[0].pace) : laps[0].pace;
    const lastPace = useMiles ? convertPaceToMiles(laps[laps.length - 1].pace) : laps[laps.length - 1].pace;
    const paceRange = `${firstPace.split('/')[0]}-${lastPace.split('/')[0]}`;
    return `Steady-state run with consistent pacing around ${paceRange}.${hrPattern}`;
  }

  if (isNegativeSplit) {
    const startPace = useMiles ? convertPaceToMiles(laps[0].pace) : laps[0].pace;
    const endPace = useMiles ? convertPaceToMiles(laps[laps.length - 1].pace) : laps[laps.length - 1].pace;
    return `Progression run starting at ${startPace} and finishing at ${endPace}. Negative split on the final ${Math.floor(laps.length / 3)} laps.${hrPattern}`;
  }

  if (isPositiveSplit) {
    const startPace = useMiles ? convertPaceToMiles(laps[0].pace) : laps[0].pace;
    const endPace = useMiles ? convertPaceToMiles(laps[laps.length - 1].pace) : laps[laps.length - 1].pace;
    return `Run started at ${startPace} but pace dropped to ${endPace} in later stages, indicating fatigue.${hrPattern}`;
  }

  const avgPaceDisplay = useMiles ? convertPaceToMiles(laps[0]?.pace || '') : (laps[0]?.pace || '');
  return `Mixed-pace run averaging ${avgPaceDisplay}.${hrPattern}`;
}

// Generate planned session description
interface SessionDescription {
  title: string;
  structure?: string[];
  effort?: string;
  tip?: string;
}

function generatePlannedDescription(session: TrainingSession): SessionDescription {
  const notes = session.workout || '';
  // Strip the "Type - " prefix from workout field if present
  const rawNotes = notes.includes(' - ') ? notes.split(' - ').slice(1).join(' - ') : notes;
  const dist = session.distanceKm > 0 
    ? `${(session.distanceKm / 1.60934).toFixed(0)}mi` 
    : '';

  if (session.type === 'rest') {
    return { title: 'Rest day', effort: 'Let your body recover and absorb recent training. Stay hydrated and eat well.' };
  }

  if (session.type === 'track') {
    return {
      title: 'Coach-led track session',
      structure: ['Session structure set by the coach on the night', 'Expect intervals with recovery jogs between reps'],
      effort: 'Hard effort on reps, easy jog recovery between',
      tip: 'Just turn up and run hard. Trust the coach.',
    };
  }

  if (session.type === 'race') {
    return {
      title: rawNotes || 'Race day',
      structure: ['Easy warm-up jog + strides before the start', 'Cool-down jog afterwards'],
      effort: 'Go out controlled, run the second half strong',
      tip: 'Fuel 2-3 hours before. Stick to your pacing plan.',
    };
  }

  if (session.type === 'easy' || session.type === 'recovery') {
    const timing = rawNotes.toLowerCase().includes('am') ? 'Morning' : rawNotes.toLowerCase().includes('pm') ? 'Afternoon/evening' : '';
    return {
      title: `${timing ? timing + ' — ' : ''}${dist} ${session.type === 'recovery' ? 'recovery' : 'easy'} run`,
      effort: `Conversational pace at ${session.pace}`,
      tip: 'Keep it relaxed — this is about recovery and maintaining volume.',
    };
  }

  // Parse structured notes into individual steps
  const parseStructuredWorkout = (raw: string): string[] => {
    // FIRST: Handle repeat notation like "4 x (1.5mi @ 5:46 MP + 0.5mi @ 5:10 faster + 0.5mi easy jog recovery)"
    // Extract and expand repeat patterns before splitting on commas
    let processed = raw;
    const repeatPattern = /(\d+)\s*x\s*\(([^)]+)\)/gi;
    let match;
    const expandedSegments: string[] = [];
    
    while ((match = repeatPattern.exec(raw)) !== null) {
      const reps = parseInt(match[1]);
      const block = match[2]; // content inside parentheses
      
      // Split the block content on '+' or ',' to get individual steps
      const blockSteps = block.split(/[+,]/).map(s => s.trim()).filter(Boolean);
      
      // Expand: repeat the entire block N times
      for (let i = 0; i < reps; i++) {
        expandedSegments.push(...blockSteps);
      }
      
      // Replace the repeat pattern with a placeholder to avoid duplicate parsing
      processed = processed.replace(match[0], `__REPEAT_${expandedSegments.length}__`);
    }
    
    // Now split on commas (safe because repeat notation is extracted)
    const segments = processed.split(/,\s*/).map(s => s.trim());
    const steps: string[] = [];
    let expandedIndex = 0;

    for (const segment of segments) {
      // If it's a repeat placeholder, inject the expanded steps
      if (segment.startsWith('__REPEAT_')) {
        const count = parseInt(segment.match(/__REPEAT_(\d+)__/)?.[1] || '0');
        if (count > 0) {
          // Add all the expanded steps for this repeat block
          for (let i = expandedIndex; i < count; i++) {
            const step = expandedSegments[i];
            // Parse each step (distance + pace)
            const stepMatch = step.match(/(\d+(?:\.\d+)?)\s*(mi|km|m)\s*@?\s*([\d:]+)?/);
            if (stepMatch) {
              const dist = parseFloat(stepMatch[1]);
              const unit = stepMatch[2];
              const pace = stepMatch[3];
              
              // Convert metres/km to miles
              let displayDist = '';
              if (unit === 'm') {
                if (dist === 800) displayDist = '0.5mi';
                else if (dist === 400) displayDist = '0.25mi';
                else if (dist === 1000) displayDist = '0.6mi';
                else displayDist = `${(dist / 1609.34).toFixed(2)}mi`;
              } else if (unit === 'km') {
                displayDist = `${(dist / 1.60934).toFixed(2)}mi`;
              } else {
                displayDist = `${dist}mi`;
              }
              
              if (pace) {
                const paceDisplay = pace.includes('/') ? pace : `${pace}/mi`;
                steps.push(`${displayDist} @ ${paceDisplay}`);
              } else {
                // Check if it's a recovery/easy segment
                if (step.toLowerCase().includes('recovery') || step.toLowerCase().includes('easy')) {
                  steps.push(`${displayDist} ${step.toLowerCase().includes('recovery') ? 'recovery' : 'easy'} jog`);
                } else {
                  steps.push(step);
                }
              }
            } else {
              // No distance match, add as-is
              steps.push(step);
            }
          }
          expandedIndex = count;
        }
        continue;
      }
      
      // Check for warm-up/cool-down patterns
      if (segment.match(/(\d+(?:\.\d+)?)(mi|km)\s+(w\/up|warm.?up)/i)) {
        const distMatch = segment.match(/(\d+(?:\.\d+)?)(mi|km)/);
        if (distMatch) {
          steps.push(`${distMatch[1]}${distMatch[2]} warm-up (easy pace)`);
        }
        continue;
      }
      
      if (segment.match(/(\d+(?:\.\d+)?)(mi|km)\s+(c\/down|cool.?down)/i)) {
        const distMatch = segment.match(/(\d+(?:\.\d+)?)(mi|km)/);
        if (distMatch) {
          steps.push(`${distMatch[1]}${distMatch[2]} cool-down (easy pace)`);
        }
        continue;
      }

      // Check for tempo blocks: "3mi-2.5mi-2mi-1.2mi @ 5:46 (800m @ 6:50 recovery)"
      const blocksPattern = /([\d.-]+(?:mi|km)(?:-[\d.]+(?:mi|km))+)\s+@\s+([\d:]+(?:\/mi|\/km)?)\s*\(([^)]+)\)/;
      const blocksMatch = segment.match(blocksPattern);
      
      if (blocksMatch) {
        const blocksStr = blocksMatch[1]; // "3mi-2.5mi-2mi-1.2mi"
        const workPace = blocksMatch[2]; // "5:46" or "5:46/mi"
        const recoveryStr = blocksMatch[3]; // "800m @ 6:50 recovery"
        
        // Parse individual blocks
        const blockDistances = blocksStr.split('-').map(s => s.trim());
        
        // Parse recovery and convert to miles if needed
        const recoveryMatch = recoveryStr.match(/([\d.]+)(mi|km|m)\s+@?\s*([\d:]+)?/);
        let recoveryDistance = '';
        let recoveryPace = '';
        if (recoveryMatch) {
          const distValue = parseFloat(recoveryMatch[1]);
          const unit = recoveryMatch[2];
          
          // Convert metric to miles
          if (unit === 'm') {
            // Common conversions
            if (distValue === 800) recoveryDistance = '0.5mi';
            else if (distValue === 400) recoveryDistance = '0.25mi';
            else if (distValue === 600) recoveryDistance = '0.4mi';
            else if (distValue === 1000) recoveryDistance = '0.6mi';
            else {
              // General conversion: round to nearest 0.05mi
              const miles = distValue / 1609.34;
              recoveryDistance = `${(Math.round(miles * 20) / 20).toFixed(2)}mi`;
            }
          } else if (unit === 'km') {
            // Convert km to miles
            const miles = distValue / 1.60934;
            recoveryDistance = `${(Math.round(miles * 20) / 20).toFixed(2)}mi`;
          } else {
            // Already in miles
            recoveryDistance = recoveryMatch[1] + recoveryMatch[2];
          }
          
          recoveryPace = recoveryMatch[3] || '6:50/mi';
        }
        
        // Add blocks with recovery between each
        blockDistances.forEach((block, index) => {
          // Add work block
          const paceDisplay = workPace.includes('/') ? workPace : `${workPace}/mi`;
          steps.push(`${block} @ ${paceDisplay}`);
          
          // Add recovery after each block except the last
          if (index < blockDistances.length - 1 && recoveryDistance) {
            const recPaceDisplay = recoveryPace.includes('/') ? recoveryPace : `${recoveryPace}/mi`;
            steps.push(`${recoveryDistance} recovery jog @ ${recPaceDisplay}`);
          }
        });
        continue;
      }

      // Check for simple tempo format: "6mi @ 5:50" or "4mi @ 5:46, 1mi recovery, 4mi @ 5:46"
      const simpleTempoPattern = /(\d+(?:\.\d+)?)(mi|km)\s+@\s+([\d:]+(?:\/mi|\/km)?)/;
      const simpleMatch = segment.match(simpleTempoPattern);
      
      if (simpleMatch) {
        const paceDisplay = simpleMatch[3].includes('/') ? simpleMatch[3] : `${simpleMatch[3]}/mi`;
        steps.push(`${simpleMatch[1]}${simpleMatch[2]} @ ${paceDisplay}`);
        continue;
      }

      // Check for recovery jog without pace - convert metric to miles
      const recoveryJogMatch = segment.match(/(\d+(?:\.\d+)?)(mi|km|m)\s+(recovery|easy)/i);
      if (recoveryJogMatch) {
        const distValue = parseFloat(recoveryJogMatch[1]);
        const unit = recoveryJogMatch[2];
        const type = recoveryJogMatch[3];
        
        let displayDist = '';
        if (unit === 'm') {
          // Convert metres to miles
          if (distValue === 800) displayDist = '0.5mi';
          else if (distValue === 400) displayDist = '0.25mi';
          else if (distValue === 600) displayDist = '0.4mi';
          else if (distValue === 1000) displayDist = '0.6mi';
          else {
            const miles = distValue / 1609.34;
            displayDist = `${(Math.round(miles * 20) / 20).toFixed(2)}mi`;
          }
        } else if (unit === 'km') {
          const miles = distValue / 1.60934;
          displayDist = `${(Math.round(miles * 20) / 20).toFixed(2)}mi`;
        } else {
          displayDist = recoveryJogMatch[1] + recoveryJogMatch[2];
        }
        
        steps.push(`${displayDist} ${type}`);
        continue;
      }

      // Fallback: add segment as-is
      if (segment) {
        steps.push(segment);
      }
    }

    return steps.filter(Boolean);
  };

  if (session.type === 'tempo') {
    const structure = parseStructuredWorkout(rawNotes);
    return {
      title: `Tempo session — ${dist} total`,
      structure: structure.length > 0 ? structure : undefined,
      effort: 'Comfortably hard — you can speak in short sentences but not hold a conversation',
      tip: 'Warm-up and cool-down at easy pace. Main block at tempo effort.',
    };
  }

  if (session.type === 'long') {
    let tip = 'Practise your race-day fuelling during this session.';
    if (rawNotes.toLowerCase().includes('progressive') || rawNotes.toLowerCase().includes('mp finish')) {
      tip = 'Start easy and build into the faster miles. Finish feeling strong — simulating the back half of the marathon.';
    }
    const structure = parseStructuredWorkout(rawNotes);
    return {
      title: `Long run — ${dist}`,
      structure: structure.length > 0 ? structure : undefined,
      effort: session.pace === 'Progressive' ? 'Build effort throughout' : `Target pace: ${session.pace}`,
      tip,
    };
  }

  // Marathon Pace / structured sessions
  if (session.pace.includes('MP') || rawNotes.includes('5:46') || rawNotes.toLowerCase().includes('mp')) {
    const structure = parseStructuredWorkout(rawNotes);
    return {
      title: `Marathon pace session — ${dist} total`,
      structure: structure.length > 0 ? structure : undefined,
      effort: 'MP blocks should feel controlled and sustainable — smooth, not forced',
      tip: 'Recovery sections are easy jog. Practise race-day fuelling.',
    };
  }

  // Shakeout / strides
  if (rawNotes.toLowerCase().includes('strides') || rawNotes.toLowerCase().includes('pick-ups')) {
    const structure = parseStructuredWorkout(rawNotes);
    return {
      title: `Easy run with strides — ${dist}`,
      structure: structure.length > 0 ? structure : undefined,
      effort: `Easy pace at ${session.pace}`,
      tip: 'Strides are short accelerations (15-20 seconds) to keep your legs feeling sharp.',
    };
  }

  // Hills
  if (rawNotes.toLowerCase().includes('hill')) {
    const structure = parseStructuredWorkout(rawNotes);
    return {
      title: `Hill session — ${dist}`,
      structure: structure.length > 0 ? structure : undefined,
      effort: 'Sprint hard uphill, easy jog back down',
      tip: 'Hill sprints build power and running economy.',
    };
  }

  // Generic
  const structure = parseStructuredWorkout(rawNotes);
  return {
    title: `${dist} at ${session.pace}`,
    structure: structure.length > 0 ? structure : undefined,
  };
}

// Generate race prediction based on PBs and training
function generateRacePrediction(race: Race): { prediction: string; strategy: string } {
  const PBs_seconds: Record<string, number> = {
    '10K': 32 * 60 + 38, // 32:38
    '10M': 53 * 60 + 17, // 53:17
    'HM': 71 * 60 + 57,  // 71:57
    'M': 150 * 60 + 30,  // 2:30:30
  };

  let prediction = '';
  let strategy = '';

  if (race.distanceKm === 10) {
    prediction = `Target: 32:20 (PB: 32:38). Based on current training fitness.`;
    strategy = 'Start controlled at 3:18-3:20/km for the first 3km, then settle into 3:15/km rhythm. If feeling good at 7km, push the last 3km. Negative split is the goal.';
  } else if (race.distanceKm === 16.1) {
    prediction = `Target: 52:30 (PB: 53:17). Pace around 3:16/km.`;
    strategy = 'Even effort throughout. Use the first 2 miles to settle, then lock into rhythm. The last 2 miles are where the race is won.';
  } else if (race.distanceKm === 21.1) {
    prediction = `Target: 1:12:30 (PB: 1:13:30). Pace around 3:26/km.`;
    strategy = 'First 5km at 3:30-3:32/km (conservative). 5-15km at 3:28-3:30/km (settle in). Final 6km at 3:25-3:28/km if legs allow. Do NOT go out fast — save it for the second half.';
  } else if (race.distanceKm === 42.2) {
    prediction = `Target: 2:29:00 (PB: 2:30:30). Requires 3:31/km average.`;
    strategy = 'First 10km at 3:35/km (bank nothing). 10-30km at 3:33/km (lock in). 30-35km maintain effort not pace. Final 7km is about grit — anything under 3:33/km is a bonus. Fuel every 5km from 15km onwards.';
  }

  return { prediction, strategy };
}

function parsePaceToSeconds(pace: string): number {
  const match = pace.match(/(\d+):(\d+)/);
  if (!match) return 270; // Default 4:30/km
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

// Format duration in minutes to human-readable string (e.g., "1h 15m" or "45m")
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

// Calculate estimated session duration in minutes
function calculateSessionDuration(session: TrainingSession): number | null {
  const notes = session.notes || session.workout || '';
  const type = session.type;
  
  // Rest days have no duration
  if (type === 'rest') return null;
  
  // Track sessions: default 80 minutes
  if (type === 'track') {
    return 80;
  }
  
  // Race: try to extract goal time from race targets or estimate from pace
  if (type === 'race') {
    // TODO: Look up goal time from race_targets table
    // For now, estimate from distance and pace if available
    if (session.distanceKm > 0 && session.pace) {
      const paceMatch = session.pace.match(/(\d+):(\d+)/);
      if (paceMatch) {
        const paceSeconds = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]);
        const isPaceMiles = session.pace.includes('/mi');
        const distanceMiles = session.distanceKm / 1.60934;
        const distance = isPaceMiles ? distanceMiles : session.distanceKm;
        return (paceSeconds * distance) / 60;
      }
    }
    // Add warm-up/cool-down estimate (2mi = ~16-20 min)
    return null;
  }
  
  // Easy/Recovery/Steady runs: distance ÷ pace
  if (type === 'easy' || type === 'recovery') {
    if (session.distanceKm > 0 && session.pace) {
      const paceMatch = session.pace.match(/(\d+):(\d+)/);
      if (paceMatch) {
        const paceSeconds = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]);
        const isPaceMiles = session.pace.includes('/mi');
        const distanceMiles = session.distanceKm / 1.60934;
        const distance = isPaceMiles ? distanceMiles : session.distanceKm;
        return (paceSeconds * distance) / 60;
      }
    }
    return null;
  }
  
  // Tempo runs: parse structure from notes (MP sessions)
  if (type === 'tempo' && notes.includes('Marathon Pace')) {
    let totalMinutes = 0;
    const easyPace = 7 * 60 + 14; // 7:14/mi in seconds
    const mpPace = 5 * 60 + 46; // 5:46/mi in seconds
    
    // Warm-up and cool-down
    const warmUpMatch = notes.match(/(\d+(?:\.\d+)?)mi\s+w\/up/);
    const coolDownMatch = notes.match(/(\d+(?:\.\d+)?)mi\s+c\/down/);
    
    if (warmUpMatch) {
      totalMinutes += (parseFloat(warmUpMatch[1]) * easyPace) / 60;
    }
    if (coolDownMatch) {
      totalMinutes += (parseFloat(coolDownMatch[1]) * easyPace) / 60;
    }
    
    // Check for repeat notation: "4 x (1.5mi @ 5:46 MP + 0.5mi @ 5:10 faster + 0.5mi easy jog recovery)"
    const repeatPattern = /(\d+)\s*x\s*\(([^)]+)\)/i;
    const repeatMatch = notes.match(repeatPattern);
    
    if (repeatMatch) {
      const reps = parseInt(repeatMatch[1]);
      const block = repeatMatch[2]; // content inside parentheses
      
      // Parse each segment in the block
      let blockMinutes = 0;
      const blockSegments = block.split(/[+,]/).map(s => s.trim());
      
      blockSegments.forEach(seg => {
        // Match distance @ pace
        const segMatch = seg.match(/(\d+(?:\.\d+)?)\s*(mi|km|m)\s*@?\s*([\d:]+)?/);
        if (segMatch) {
          let dist = parseFloat(segMatch[1]);
          const unit = segMatch[2];
          const paceStr = segMatch[3];
          
          // Convert to miles
          if (unit === 'm') {
            dist = dist / 1609.34;
          } else if (unit === 'km') {
            dist = dist / 1.60934;
          }
          
          // Parse pace or use defaults
          let pace = mpPace; // default to MP
          if (paceStr) {
            const paceMatch = paceStr.match(/(\d+):(\d+)/);
            if (paceMatch) {
              pace = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]);
            }
          } else if (seg.toLowerCase().includes('faster')) {
            pace = 5 * 60 + 10; // 5:10/mi for "faster"
          } else if (seg.toLowerCase().includes('recovery') || seg.toLowerCase().includes('easy')) {
            pace = 6 * 60 + 50; // 6:50/mi for recovery
          }
          
          blockMinutes += (dist * pace) / 60;
        }
      });
      
      // Multiply by number of reps
      totalMinutes += blockMinutes * reps;
    } else {
      // Handle dash-separated blocks: "3mi-2.5mi-2mi-1.2mi @ 5:46 (800m @ 6:50 recovery)"
      const blocksPattern = /([\d.]+mi(?:-[\d.]+mi)+)\s+@\s+([\d:]+)/;
      const blocksMatch = notes.match(blocksPattern);
      
      if (blocksMatch) {
        // Parse block distances (remove "mi" suffix and convert to numbers)
        const blockDistances = blocksMatch[1].split('-').map(s => parseFloat(s.replace('mi', '')));
        const paceMatch = blocksMatch[2].match(/(\d+):(\d+)/);
        const workPace = paceMatch ? parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]) : mpPace;
        
        // Sum all work blocks
        const totalWorkMiles = blockDistances.reduce((sum, d) => sum + d, 0);
        totalMinutes += (totalWorkMiles * workPace) / 60;
        
        // Recovery between blocks (convert metres to miles)
        const recoveryMatch = notes.match(/([\d.]+)(m|mi|km)\s+@\s*(\d+):(\d+)\s+recovery/);
        if (recoveryMatch) {
          let recoveryMiles = parseFloat(recoveryMatch[1]);
          const unit = recoveryMatch[2];
          
          // Convert to miles if needed
          if (unit === 'm') {
            recoveryMiles = recoveryMiles / 1609.34;
          } else if (unit === 'km') {
            recoveryMiles = recoveryMiles / 1.60934;
          }
          
          const recoveryPace = parseInt(recoveryMatch[3]) * 60 + parseInt(recoveryMatch[4]);
          const numRecoveries = blockDistances.length - 1; // n blocks = n-1 recoveries
          totalMinutes += (numRecoveries * recoveryMiles * recoveryPace) / 60;
        }
      } else {
        // Simple format: "6mi @ 5:46" or "4mi @ 5:46, 1mi recovery, 4mi @ 5:46"
        const simpleSegments = notes.match(/(\d+(?:\.\d+)?)mi\s+@\s*(\d+):(\d+)/g);
        if (simpleSegments) {
          simpleSegments.forEach(seg => {
            const match = seg.match(/(\d+(?:\.\d+)?)mi\s+@\s*(\d+):(\d+)/);
            if (match) {
              const dist = parseFloat(match[1]);
              const pace = parseInt(match[2]) * 60 + parseInt(match[3]);
              totalMinutes += (dist * pace) / 60;
            }
          });
        }
        
        // Also check for "1mi recovery" without pace (use default 6:50/mi)
        const recoverySegments = notes.match(/(\d+(?:\.\d+)?)mi\s+recovery/g);
        if (recoverySegments) {
          recoverySegments.forEach(seg => {
            const match = seg.match(/(\d+(?:\.\d+)?)mi\s+recovery/);
            if (match) {
              const dist = parseFloat(match[1]);
              const recoveryPace = 6 * 60 + 50; // 6:50/mi
              totalMinutes += (dist * recoveryPace) / 60;
            }
          });
        }
      }
    }
    
    return totalMinutes > 0 ? totalMinutes : null;
  }
  
  // Regular tempo: parse structure
  if (type === 'tempo') {
    let totalMinutes = 0;
    const easyPace = 7 * 60 + 14; // 7:14/mi in seconds
    
    const warmUpMatch = notes.match(/(\d+(?:\.\d+)?)mi\s+w\/up/);
    const coolDownMatch = notes.match(/(\d+(?:\.\d+)?)mi\s+c\/down/);
    
    if (warmUpMatch) {
      totalMinutes += (parseFloat(warmUpMatch[1]) * easyPace) / 60;
    }
    if (coolDownMatch) {
      totalMinutes += (parseFloat(coolDownMatch[1]) * easyPace) / 60;
    }
    
    // Check for interval pattern: "6 x 1000m @ 5:05 (90s jog recovery)" or "6 x 1K @ 5:38-5:43 (90s jog)"
    const intervalPattern = /(\d+)\s*x\s*(\d+(?:\.\d+)?)(mi|km|m|K)\s*@\s*([\d:-]+(?:\/mi|\/km)?)\s*\(([^)]+)\)/i;
    const intervalMatch = notes.match(intervalPattern);
    
    if (intervalMatch) {
      const reps = parseInt(intervalMatch[1]);
      let repDist = parseFloat(intervalMatch[2]);
      const unit = intervalMatch[3];
      const paceStr = intervalMatch[4];
      const recoveryStr = intervalMatch[5];
      
      // Convert to miles
      if (unit.toLowerCase() === 'm') {
        repDist = repDist / 1609.34;
      } else if (unit.toLowerCase() === 'km' || unit.toLowerCase() === 'k') {
        repDist = repDist / 1.60934;
      }
      
      // Parse pace (might be a range like "5:38-5:43")
      let repPace = 6 * 60 + 10; // default
      if (paceStr.includes('-')) {
        const rangeParts = paceStr.split('-');
        const p1 = rangeParts[0].match(/(\d+):(\d+)/);
        const p2 = rangeParts[1].match(/(\d+):(\d+)/);
        if (p1 && p2) {
          const pace1 = parseInt(p1[1]) * 60 + parseInt(p1[2]);
          const pace2 = parseInt(p2[1]) * 60 + parseInt(p2[2]);
          repPace = (pace1 + pace2) / 2;
        }
      } else {
        const paceMatch = paceStr.match(/(\d+):(\d+)/);
        if (paceMatch) {
          repPace = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]);
        }
      }
      
      // Calculate rep time
      const repMinutes = (repDist * repPace) / 60;
      
      // Parse recovery time (e.g., "90s jog" or "400m @ 6:50 recovery")
      let recoveryMinutes = 0;
      const recoveryTimeMatch = recoveryStr.match(/(\d+)\s*s/); // seconds
      if (recoveryTimeMatch) {
        recoveryMinutes = parseInt(recoveryTimeMatch[1]) / 60;
      } else {
        // Distance-based recovery
        const recoveryDistMatch = recoveryStr.match(/(\d+(?:\.\d+)?)(mi|km|m)/);
        if (recoveryDistMatch) {
          let recoveryDist = parseFloat(recoveryDistMatch[1]);
          const recoveryUnit = recoveryDistMatch[2];
          if (recoveryUnit === 'm') {
            recoveryDist = recoveryDist / 1609.34;
          } else if (recoveryUnit === 'km') {
            recoveryDist = recoveryDist / 1.60934;
          }
          const recoveryPace = 6 * 60 + 50; // default jog pace
          recoveryMinutes = (recoveryDist * recoveryPace) / 60;
        }
      }
      
      // Total time = reps * (rep time + recovery time)
      totalMinutes += reps * (repMinutes + recoveryMinutes);
    } else {
      // Check for repeat notation: "4 x (1.5mi @ 6:02 + 0.5mi easy jog recovery)"
      const repeatPattern = /(\d+)\s*x\s*\(([^)]+)\)/i;
      const repeatMatch = notes.match(repeatPattern);
      
      if (repeatMatch) {
        const reps = parseInt(repeatMatch[1]);
        const block = repeatMatch[2]; // content inside parentheses
        
        // Parse each segment in the block
        let blockMinutes = 0;
        const blockSegments = block.split(/[+,]/).map(s => s.trim());
        
        blockSegments.forEach(seg => {
          // Match distance @ pace
          const segMatch = seg.match(/(\d+(?:\.\d+)?)\s*(mi|km|m)\s*@?\s*([\d:]+)?/);
          if (segMatch) {
            let dist = parseFloat(segMatch[1]);
            const unit = segMatch[2];
            const paceStr = segMatch[3];
            
            // Convert to miles
            if (unit === 'm') {
              dist = dist / 1609.34;
            } else if (unit === 'km') {
              dist = dist / 1.60934;
            }
            
            // Parse pace or use defaults
            let pace = 6 * 60 + 10; // default to 6:10/mi for tempo
            if (paceStr) {
              const paceMatch = paceStr.match(/(\d+):(\d+)/);
              if (paceMatch) {
                pace = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]);
              }
            } else if (seg.toLowerCase().includes('recovery') || seg.toLowerCase().includes('easy')) {
              pace = 6 * 60 + 50; // 6:50/mi for recovery
            }
            
            blockMinutes += (dist * pace) / 60;
          }
        });
        
        // Multiply by number of reps
        totalMinutes += blockMinutes * reps;
      }
    }
    
    if (totalMinutes === 0) {
      // Handle dash-separated blocks: "3mi-2mi-1mi @ 6:10 (800m @ 6:50 recovery)"
      const blocksPattern = /([\d.]+mi(?:-[\d.]+mi)+)\s+@\s+([\d:]+)/;
      const blocksMatch = notes.match(blocksPattern);
      
      if (blocksMatch) {
        // Parse block distances (remove "mi" suffix and convert to numbers)
        const blockDistances = blocksMatch[1].split('-').map(s => parseFloat(s.replace('mi', '')));
        const paceMatch = blocksMatch[2].match(/(\d+):(\d+)/);
        const workPace = paceMatch ? parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]) : 0;
        
        const totalWorkMiles = blockDistances.reduce((sum, d) => sum + d, 0);
        totalMinutes += (totalWorkMiles * workPace) / 60;
        
        // Recovery between blocks (convert metres to miles)
        const recoveryMatch = notes.match(/([\d.]+)(m|mi|km)\s+@\s*(\d+):(\d+)\s+recovery/);
        if (recoveryMatch) {
          let recoveryMiles = parseFloat(recoveryMatch[1]);
          const unit = recoveryMatch[2];
          
          // Convert to miles if needed
          if (unit === 'm') {
            recoveryMiles = recoveryMiles / 1609.34;
          } else if (unit === 'km') {
            recoveryMiles = recoveryMiles / 1.60934;
          }
          
          const recoveryPace = parseInt(recoveryMatch[3]) * 60 + parseInt(recoveryMatch[4]);
          const numRecoveries = blockDistances.length - 1; // n blocks = n-1 recoveries
          totalMinutes += (numRecoveries * recoveryMiles * recoveryPace) / 60;
        }
      } else {
        // Simple format: "8mi @ 6:10"
        const tempoMatch = notes.match(/(\d+(?:\.\d+)?)mi\s+@\s*(\d+):(\d+)/);
        if (tempoMatch) {
          const tempoPace = parseInt(tempoMatch[2]) * 60 + parseInt(tempoMatch[3]);
          totalMinutes += (parseFloat(tempoMatch[1]) * tempoPace) / 60;
        }
      }
    }
    
    if (totalMinutes > 0) return totalMinutes;
    
    // Fallback: use total distance and average pace
    if (session.distanceKm > 0 && session.pace) {
      const paceMatch = session.pace.match(/(\d+):(\d+)/);
      if (paceMatch) {
        const paceSeconds = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]);
        const isPaceMiles = session.pace.includes('/mi');
        const distanceMiles = session.distanceKm / 1.60934;
        const distance = isPaceMiles ? distanceMiles : session.distanceKm;
        return (paceSeconds * distance) / 60;
      }
    }
    return null;
  }
  
  // Long runs: parse segments from notes, fallback to pace field + 5 min for stops
  if (type === 'long') {
    if (session.distanceKm > 0) {
      let totalMinutes = 0;
      const distanceMiles = session.distanceKm / 1.60934;
      
      // First check for repeat notation: "4 x (2mi @ 5:46 MP + 1mi @ 6:26 steady + 0.5mi easy jog recovery)"
      const repeatPattern = /(\d+)\s*x\s*\(([^)]+)\)/i;
      const repeatMatch = notes.match(repeatPattern);
      
      if (repeatMatch) {
        const reps = parseInt(repeatMatch[1]);
        const block = repeatMatch[2]; // content inside parentheses
        
        // Parse each segment in the block
        let blockMinutes = 0;
        const blockSegments = block.split(/[+,]/).map(s => s.trim());
        
        blockSegments.forEach(seg => {
          // Match distance @ pace
          const segMatch = seg.match(/(\d+(?:\.\d+)?)\s*(mi|km|m)\s*@?\s*([\d:]+)?/);
          if (segMatch) {
            let dist = parseFloat(segMatch[1]);
            const unit = segMatch[2];
            const paceStr = segMatch[3];
            
            // Convert to miles
            if (unit === 'm') {
              dist = dist / 1609.34;
            } else if (unit === 'km') {
              dist = dist / 1.60934;
            }
            
            // Parse pace or use defaults
            let pace = 6 * 60 + 26; // default to 6:26/mi for steady
            if (paceStr) {
              const paceMatch = paceStr.match(/(\d+):(\d+)/);
              if (paceMatch) {
                pace = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]);
              }
            } else if (seg.toLowerCase().includes('recovery') || seg.toLowerCase().includes('easy')) {
              pace = 6 * 60 + 50; // 6:50/mi for recovery
            } else if (seg.toLowerCase().includes('mp')) {
              pace = 5 * 60 + 46; // 5:46/mi for MP
            }
            
            blockMinutes += (dist * pace) / 60;
          }
        });
        
        // Multiply by number of reps
        totalMinutes += blockMinutes * reps;
        
        // Also parse any segments outside the repeat block (warm-up, cool-down, tempo finish)
        const remainingNotes = notes.replace(repeatMatch[0], '');
        const remainingSegments = remainingNotes.match(/(\d+(?:\.\d+)?)mi\s+@\s*(\d+):(\d+)/g);
        if (remainingSegments) {
          remainingSegments.forEach(seg => {
            const match = seg.match(/(\d+(?:\.\d+)?)mi\s+@\s*(\d+):(\d+)/);
            if (match) {
              const dist = parseFloat(match[1]);
              const pace = parseInt(match[2]) * 60 + parseInt(match[3]);
              totalMinutes += (dist * pace) / 60;
            }
          });
        }
        
        // Add 5 minutes for water stops on runs over 15mi
        return totalMinutes > 0 ? totalMinutes + (distanceMiles > 15 ? 5 : 0) : null;
      }
      
      // Try to parse segments from notes like "10mi @ 7:14, 5mi @ 6:34, 5mi @ 6:02"
      const segments = notes.match(/(\d+(?:\.\d+)?)mi\s+@\s*(\d+):(\d+)/g);
      if (segments && segments.length > 0) {
        let parsedMiles = 0;
        segments.forEach(seg => {
          const match = seg.match(/(\d+(?:\.\d+)?)mi\s+@\s*(\d+):(\d+)/);
          if (match) {
            const dist = parseFloat(match[1]);
            const pace = parseInt(match[2]) * 60 + parseInt(match[3]);
            totalMinutes += (dist * pace) / 60;
            parsedMiles += dist;
          }
        });
        // If segments don't cover full distance, estimate remaining at easy pace (7:14/mi)
        if (parsedMiles < distanceMiles - 0.5) {
          totalMinutes += ((distanceMiles - parsedMiles) * (7 * 60 + 14)) / 60;
        }
      }
      
      // Also check for pace ranges like "5:54-6:02" in notes
      if (totalMinutes === 0) {
        const rangeSegments = notes.match(/(\d+(?:\.\d+)?)mi\s+@\s*(\d+):(\d+)-(\d+):(\d+)/g);
        if (rangeSegments && rangeSegments.length > 0) {
          let parsedMiles = 0;
          rangeSegments.forEach(seg => {
            const match = seg.match(/(\d+(?:\.\d+)?)mi\s+@\s*(\d+):(\d+)-(\d+):(\d+)/);
            if (match) {
              const dist = parseFloat(match[1]);
              const pace1 = parseInt(match[2]) * 60 + parseInt(match[3]);
              const pace2 = parseInt(match[4]) * 60 + parseInt(match[5]);
              totalMinutes += (dist * ((pace1 + pace2) / 2)) / 60;
              parsedMiles += dist;
            }
          });
          if (parsedMiles < distanceMiles - 0.5) {
            totalMinutes += ((distanceMiles - parsedMiles) * (7 * 60 + 14)) / 60;
          }
        }
      }
      
      // Fallback: use pace field
      if (totalMinutes === 0) {
        // Try range pace like "6:50-7:14/mi"
        const paceRange = session.pace.match(/(\d+):(\d+)-(\d+):(\d+)/);
        if (paceRange) {
          const pace1 = parseInt(paceRange[1]) * 60 + parseInt(paceRange[2]);
          const pace2 = parseInt(paceRange[3]) * 60 + parseInt(paceRange[4]);
          totalMinutes = (((pace1 + pace2) / 2) * distanceMiles) / 60;
        } else {
          // Single pace
          const paceMatch = session.pace.match(/(\d+):(\d+)/);
          if (paceMatch) {
            const paceSeconds = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]);
            totalMinutes = (paceSeconds * distanceMiles) / 60;
          }
        }
      }
      
      // Add 5 minutes for water stops on runs over 15mi
      return totalMinutes > 0 ? totalMinutes + (distanceMiles > 15 ? 5 : 0) : null;
    }
    return null;
  }
  
  // Default: calculate from distance and pace if available
  if (session.distanceKm > 0 && session.pace) {
    const paceMatch = session.pace.match(/(\d+):(\d+)/);
    if (paceMatch) {
      const paceSeconds = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]);
      const isPaceMiles = session.pace.includes('/mi');
      const distanceMiles = session.distanceKm / 1.60934;
      const distance = isPaceMiles ? distanceMiles : session.distanceKm;
      return (paceSeconds * distance) / 60;
    }
  }
  
  return null;
}

// Date range presets for running activities (past-focused, not future)
function runDatePresetToRange(option: string): DateRange | undefined {
  const now = new Date();
  const today = startOfDay(now);
  switch (option) {
    case 'thisWeek': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'lastWeek': {
      const lastWeekStart = startOfWeek(addDays(now, -7), { weekStartsOn: 1 });
      return { from: lastWeekStart, to: endOfWeek(lastWeekStart, { weekStartsOn: 1 }) };
    }
    case 'thisMonth': return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastMonth': {
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case 'last3Months': return { from: startOfDay(subMonths(now, 3)), to: endOfDay(now) };
    case 'last6Months': return { from: startOfDay(subMonths(now, 6)), to: endOfDay(now) };
    case 'thisYear': return { from: startOfYear(now), to: endOfYear(now) };
    case 'lastYear': {
      const lastYear = subYears(now, 1);
      return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
    }
    default: return undefined;
  }
}

type ViewMode = 'calendar' | 'table';
type SortColumn = 'date' | 'name' | 'distance' | 'duration' | 'pace' | 'hr';
type SortDirection = 'asc' | 'desc';

function SyncTimer({ syncTime }: { syncTime: Date }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const mins = Math.floor((Date.now() - syncTime.getTime()) / 60000);
  return (
    <span className="text-[11px] text-muted-foreground">
      Last synced: {mins} min ago
    </span>
  );
}

export default function RunningPage() {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAllRaces, setShowAllRaces] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  // Past training days are always hidden (no toggle needed)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(() => {
    // Auto-expand current week on mount
    const today = new Date();
    const currentWeek = LONDON_MARATHON_PLAN.find(week => {
      const [startStr, endStr] = week.dates.split(' - ');
      const startDate = new Date(`${startStr} 2026`);
      const endDate = new Date(`${endStr} 2026`);
      return today >= startDate && today <= endDate;
    });
    return currentWeek ? new Set([currentWeek.week]) : new Set();
  });
  const [useMiles, setUseMiles] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('running-use-miles');
      return stored === null ? true : stored === 'true';
    }
    return true;
  });
  const [detailPanel, setDetailPanel] = useState<DetailPanelData | null>(null);
  const [laps, setLaps] = useState<StravaLap[]>([]);
  const [loadingLaps, setLoadingLaps] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Table filters
  const [runTypeFilter, setRunTypeFilter] = useState<'all' | 'runs' | 'races'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [runTypePopoverOpen, setRunTypePopoverOpen] = useState(false);

  // Race goals (stored in localStorage)
  const [raceGoals, setRaceGoals] = useState<Record<string, string>>({});
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState('');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('strava-last-sync');
    return stored ? new Date(stored) : null;
  });
  const updateSyncTime = (date: Date) => {
    setLastSyncTime(date);
    localStorage.setItem('strava-last-sync', date.toISOString());
  };

  // Database-backed training sessions
  const [dbSessions, setDbSessions] = useState<any[]>([]);
  const [dbTargets, setDbTargets] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [editText, setEditText] = useState('');

  // Sunrise/sunset data (calculated astronomically via useMemo, no state needed)

  // Load race goals from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('race-goals');
    if (stored) {
      try {
        setRaceGoals(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse race goals from localStorage:', e);
      }
    }
  }, []);

  // Calculate sunrise/sunset astronomically (no API needed, works for any date)
  // Uses NOAA solar calculator algorithm for Ottershaw (51.3536°N, 0.5194°W)
  const sunriseSunsetData = useMemo(() => {
    const LAT = 51.3536;
    const LNG = -0.5194;
    
    const calcSunTimes = (date: Date) => {
      const rad = Math.PI / 180;
      const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
      
      // Solar declination
      const declination = -23.45 * Math.cos(rad * (360 / 365) * (dayOfYear + 10));
      
      // Hour angle
      const latRad = LAT * rad;
      const declRad = declination * rad;
      // Civil twilight: sun 6° below horizon (96°) — light enough to run without a torch
      const cosHourAngle = (Math.cos(96 * rad) - Math.sin(latRad) * Math.sin(declRad)) / (Math.cos(latRad) * Math.cos(declRad));
      
      if (cosHourAngle > 1 || cosHourAngle < -1) return null; // No sunrise/sunset (polar)
      
      const hourAngle = Math.acos(cosHourAngle) / rad;
      
      // Equation of time (approximate)
      const b = (360 / 365) * (dayOfYear - 81) * rad;
      const eqTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
      
      // Solar noon in UTC minutes
      const solarNoon = 720 - (LNG * 4) - eqTime;
      
      const sunriseUTC = solarNoon - hourAngle * 4;
      const sunsetUTC = solarNoon + hourAngle * 4;
      
      // Convert to Europe/London time using the date's offset
      const testDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
      const utcStr = testDate.toLocaleString('en-GB', { timeZone: 'UTC' });
      const lonStr = testDate.toLocaleString('en-GB', { timeZone: 'Europe/London' });
      const utcParts = utcStr.split(', ')[1]?.split(':').map(Number) || [12, 0];
      const lonParts = lonStr.split(', ')[1]?.split(':').map(Number) || [12, 0];
      const offsetMin = (lonParts[0] - utcParts[0]) * 60 + (lonParts[1] - utcParts[1]);
      
      const fmtTime = (minutes: number) => {
        const adjusted = minutes + offsetMin;
        const h = Math.floor(adjusted / 60) % 24;
        const m = Math.round(adjusted % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };
      
      return { sunrise: fmtTime(sunriseUTC), sunset: fmtTime(sunsetUTC) };
    };
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - diff);
    
    const endDate = new Date(lastDay);
    const endDayOfWeek = lastDay.getDay();
    const endDiff = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
    endDate.setDate(lastDay.getDate() + endDiff);
    
    const data: Record<string, { sunrise: string; sunset: string }> = {};
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const times = calcSunTimes(current);
      if (times) data[dateStr] = times;
      current.setDate(current.getDate() + 1);
    }
    return data;
  }, [currentMonth]);

  // Save race goals to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('race-goals', JSON.stringify(raceGoals));
  }, [raceGoals]);

  // Fetch training sessions from database
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/training/sessions');
        if (res.ok) {
          const data = await res.json();
          setDbSessions(data.sessions || []);
        }
      } catch (error) {
        console.error('Failed to fetch training sessions:', error);
      } finally {
        setLoadingDb(false);
      }
    };

    const fetchTargets = async () => {
      try {
        const res = await fetch('/api/training/targets');
        if (res.ok) {
          const data = await res.json();
          setDbTargets(data.targets || []);
        }
      } catch (error) {
        console.error('Failed to fetch race targets:', error);
      }
    };

    fetchSessions();
    fetchTargets();
  }, []);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/strava/activities');
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
          updateSyncTime(new Date());
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Fetch laps when detail panel opens for completed run
  useEffect(() => {
    if (detailPanel?.type === 'completed' && detailPanel.activity) {
      setLoadingLaps(true);
      fetch(`/api/strava/activity/${detailPanel.activity.id}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch laps');
        })
        .then(data => setLaps(data))
        .catch(err => {
          console.error('Failed to fetch laps:', err);
          setLaps([]);
        })
        .finally(() => setLoadingLaps(false));
    } else {
      setLaps([]);
    }
  }, [detailPanel]);

  const formatDistance = (km: number): string => {
    if (useMiles) {
      return `${convertDistanceToMiles(km).toFixed(2)}mi`;
    }
    return `${km.toFixed(2)}km`;
  };

  const formatPaceDisplay = (pace: string): string => {
    if (useMiles) {
      return convertPaceToMiles(pace);
    }
    return pace;
  };

  // Convert DB session to TrainingSession format
  const dbSessionToTrainingSession = (dbSession: any): TrainingSession => {
    let type: 'easy' | 'tempo' | 'long' | 'track' | 'recovery' | 'race' | 'rest' = 'easy';
    const sessionType = dbSession.session_type?.toLowerCase() || '';
    if (sessionType.includes('recovery')) type = 'recovery';
    else if (sessionType.includes('tempo') || sessionType.includes('marathon pace')) type = 'tempo';
    else if (sessionType.includes('long')) type = 'long';
    else if (sessionType.includes('track')) type = 'track';
    else if (sessionType.includes('race')) type = 'race';
    else if (sessionType.includes('rest')) type = 'rest';

    return {
      date: dbSession.date,
      workout: `${dbSession.session_type}${dbSession.notes ? ' - ' + dbSession.notes : ''}`,
      distanceKm: dbSession.distance_km || 0,
      pace: dbSession.pace || '',
      type,
      notes: dbSession.notes || undefined
    };
  };

  // Get training plan - use DB if available, otherwise fallback to hardcoded
  const trainingPlan = useMemo(() => {
    if (dbSessions.length > 0) {
      return dbSessions.map(dbSessionToTrainingSession);
    }
    return TRAINING_PLAN;
  }, [dbSessions]);

  // Handle session edit
  const handleEditSession = (session: any) => {
    setEditingSession(session);
    setEditText('');
  };

  const handleSaveSessionEdit = async () => {
    if (!editingSession || !editText.trim()) return;

    try {
      const res = await fetch(`/api/training/sessions/${editingSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edit_text: editText })
      });

      if (res.ok) {
        const responseData = await res.json();
        
        // Check if session was deleted
        if (responseData.deleted) {
          // Refetch sessions
          const sessionsRes = await fetch('/api/training/sessions');
          if (sessionsRes.ok) {
            const data = await sessionsRes.json();
            setDbSessions(data.sessions || []);
          }
          toast.success('Session deleted');
          setEditingSession(null);
          setEditText('');
          return;
        }
        
        // Normal update flow
        // Refetch sessions
        const sessionsRes = await fetch('/api/training/sessions');
        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          setDbSessions(data.sessions || []);
        }
        toast.success('Session updated');
        setEditingSession(null);
        setEditText('');
      } else {
        toast.error('Failed to update session');
      }
    } catch (error) {
      console.error('Failed to update session:', error);
      toast.error('Failed to update session');
    }
  };

  // Handle race target edit
  const handleUpdateRaceTarget = async (targetId: string, targetTime: string, targetPace: string) => {
    try {
      const res = await fetch('/api/training/targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId, target_time: targetTime, target_pace: targetPace })
      });

      if (res.ok) {
        // Refetch targets
        const targetsRes = await fetch('/api/training/targets');
        if (targetsRes.ok) {
          const data = await targetsRes.json();
          setDbTargets(data.targets || []);
        }
        toast.success('Target updated');
      } else {
        toast.error('Failed to update target');
      }
    } catch (error) {
      console.error('Failed to update target:', error);
      toast.error('Failed to update target');
    }
  };

  // Build calendar grid - memoized
  const weeks = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Find Monday of the week containing the 1st
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - diff);
    
    // Find Sunday of the week containing the last day
    const endDate = new Date(lastDay);
    const endDayOfWeek = lastDay.getDay();
    const endDiff = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
    endDate.setDate(lastDay.getDate() + endDiff);
    
    const weeks: CalendarDay[][] = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const week: CalendarDay[] = [];
      
      for (let i = 0; i < 7; i++) {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(currentDate.getDate()).padStart(2,'0')}`;
        
        // Find completed runs for this day
        const completedRuns = activities.filter(a => {
          const activityDate = new Date(a.date);
          const activityDateStr = `${activityDate.getFullYear()}-${String(activityDate.getMonth()+1).padStart(2,'0')}-${String(activityDate.getDate()).padStart(2,'0')}`;
          return activityDateStr === dateStr;
        });
        
        // Find all planned sessions for this day
        const plannedSessions = trainingPlan.filter(s => s.date === dateStr);
        
        // Find race (merge goal from localStorage)
        const raceBase = RACES.find(r => r.date === dateStr);
        const race = raceBase ? { ...raceBase, goal: raceGoals[raceBase.name] || raceBase.goal } : undefined;
        
        // Get sunrise/sunset for this day
        const sunData = sunriseSunsetData[dateStr];
        
        week.push({
          date: new Date(currentDate),
          dayOfMonth: currentDate.getDate(),
          isCurrentMonth: currentDate.getMonth() === month,
          completedRuns,
          plannedSessions,
          race,
          sunrise: sunData?.sunrise,
          sunset: sunData?.sunset,
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      weeks.push(week);
    }
    
    return weeks;
  }, [currentMonth, activities, raceGoals, trainingPlan, sunriseSunsetData]);

  // Filtered and sorted activities for table view - memoized
  const filteredActivities = useMemo(() => {
    let filtered = [...activities];

    // Apply run type filter
    if (runTypeFilter === 'runs') {
      filtered = filtered.filter(a => !a.workout_type || a.workout_type !== 1);
    } else if (runTypeFilter === 'races') {
      filtered = filtered.filter(a => a.workout_type === 1);
    }

    // Apply date range filter
    if (dateRangeFilter !== 'all') {
      let range: DateRange | undefined;
      if (dateRangeFilter === 'custom') {
        range = customDateRange;
      } else {
        range = runDatePresetToRange(dateRangeFilter);
      }

      if (range?.from) {
        filtered = filtered.filter(a => {
          const activityDate = new Date(a.date);
          const from = startOfDay(range.from!);
          const to = range.to ? endOfDay(range.to) : endOfDay(range.from!);
          return activityDate >= from && activityDate <= to;
        });
      }
    }

    return filtered;
  }, [activities, runTypeFilter, dateRangeFilter, customDateRange]);

  const sortedActivities = useMemo(() => {
    const sorted = [...filteredActivities].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      // Handle each column type
      if (sortColumn === 'date') {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      } else if (sortColumn === 'distance') {
        aVal = a.distance_km;
        bVal = b.distance_km;
      } else if (sortColumn === 'pace') {
        aVal = parsePaceToSeconds(a.pace);
        bVal = parsePaceToSeconds(b.pace);
      } else if (sortColumn === 'hr') {
        aVal = a.hr || 0;
        bVal = b.hr || 0;
      } else if (sortColumn === 'name') {
        aVal = a.name;
        bVal = b.name;
      } else if (sortColumn === 'duration') {
        aVal = a.duration;
        bVal = b.duration;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    return sorted;
  }, [filteredActivities, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'date' ? 'desc' : 'asc');
    }
  };

  // Get upcoming races (next 4 or all) — merge goals from localStorage
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const upcomingRaces = RACES
    .filter(r => r.date >= todayStr)
    .map(r => ({ ...r, goal: raceGoals[r.name] || r.goal }));
  const displayedRaces = showAllRaces ? upcomingRaces : upcomingRaces.slice(0, 4);

  // Calculate days until race
  const daysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Get this week/month km - memoized
  const { thisWeekKm, thisMonthKm } = useMemo(() => {
    const thisWeekKm = activities
      .filter(a => {
        const activityDate = new Date(a.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return activityDate >= weekAgo;
      })
      .reduce((sum, a) => sum + a.distance_km, 0);

    const thisMonthKm = activities
      .filter(a => {
        const activityDate = new Date(a.date);
        return activityDate.getMonth() === new Date().getMonth() &&
               activityDate.getFullYear() === new Date().getFullYear();
      })
      .reduce((sum, a) => sum + a.distance_km, 0);

    return { thisWeekKm, thisMonthKm };
  }, [activities]);

  // Get last 12 weeks mileage for bars - memoized - MONDAY-SUNDAY weeks
  const last12Weeks = useMemo(() => {
    const result = Array.from({ length: 12 }, (_, i) => {
      // Get the Monday of the week N weeks ago
      const weeksAgo = 11 - i; // Start from 11 weeks ago, work forwards
      const monday = startOfWeek(subWeeks(new Date(), weeksAgo), { weekStartsOn: 1 });
      const sunday = endOfWeek(monday, { weekStartsOn: 1 });
      
      const km = activities
        .filter(a => {
          const activityDate = new Date(a.date);
          return activityDate >= monday && activityDate <= sunday;
        })
        .reduce((sum, a) => sum + a.distance_km, 0);
      
      return { km, monday };
    });
    return result;
  }, [activities]);

  const maxWeekKm = useMemo(() => Math.max(...last12Weeks.map(w => w.km), 1), [last12Weeks]);

  // Determine training phase
  const londonMarathon = RACES.find(r => r.name === 'London Marathon');
  const daysToLondon = londonMarathon ? daysUntil(londonMarathon.date) : null;
  
  let trainingPhase = 'Off-season';
  if (daysToLondon !== null) {
    if (daysToLondon < 0) trainingPhase = 'Recovery';
    else if (daysToLondon <= 14) trainingPhase = 'Taper';
    else if (daysToLondon <= 28) trainingPhase = 'Peak';
    else trainingPhase = 'Build';
  }

  // Goal editing handlers
  const handleSaveGoal = (raceName: string) => {
    setRaceGoals(prev => ({ ...prev, [raceName]: goalInput }));
    setEditingGoal(null);
    setGoalInput('');
  };

  const handleStartEditGoal = (raceName: string, currentGoal?: string) => {
    setEditingGoal(raceName);
    setGoalInput(currentGoal || '');
  };

  // Handle manual sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/strava/activities?refresh=true');
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
        updateSyncTime(new Date());
        if (data.length === activities.length) {
          toast.success('Activities up to date');
        } else {
          toast.success(`Synced ${data.length} activities from Strava`);
        }
      } else {
        toast.error('Failed to sync activities');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync activities');
    } finally {
      setIsSyncing(false);
    }
  };

  // Loading skeleton component
  const CalendarSkeleton = () => (
    <div className="rounded-lg border border-border/20 bg-card overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-border/20 bg-muted/30">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Week'].map((day) => (
          <div
            key={day}
            className={`px-3 py-2 text-[11px] font-semibold text-muted-foreground text-center ${
              day === 'Week' ? 'border-l border-border/20' : ''
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      {/* Skeleton rows */}
      {Array.from({ length: 5 }).map((_, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-8 border-b border-border/20 last:border-0">
          {Array.from({ length: 7 }).map((_, dayIdx) => (
            <div
              key={dayIdx}
              className="min-h-[100px] px-2 py-2 border-r border-border/10 last:border-0 space-y-2"
            >
              <div className="h-3 w-6 bg-muted/40 rounded animate-pulse" />
              <div className="h-12 bg-muted/30 rounded animate-pulse" />
            </div>
          ))}
          <div className="min-h-[100px] px-3 py-2 bg-muted/20 border-l border-border/20">
            <div className="space-y-2">
              <div className="h-3 bg-muted/40 rounded animate-pulse" />
              <div className="h-3 bg-muted/40 rounded animate-pulse" />
              <div className="h-3 bg-muted/40 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-full bg-background">
      <div className="border-b border-border/20 bg-card/30 px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">Running</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          London Marathon Training • {trainingPhase} Phase
        </p>
      </div>

      <div className="p-6">
        {/* Page-level controls */}
        <div className="mb-4 flex items-center justify-between gap-4">
          {/* Sync button */}
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-[13px]"
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sync
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pull latest data from Strava</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {lastSyncTime && (
              <SyncTimer syncTime={lastSyncTime} />
            )}
          </div>

          {/* Units toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground">km</span>
            <Switch
              id="use-miles-page"
              checked={useMiles}
              onCheckedChange={(v) => {
                setUseMiles(v);
                localStorage.setItem('running-use-miles', String(v));
              }}
            />
            <span className="text-[13px] text-muted-foreground">mi</span>
          </div>
        </div>

        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="plan">Training Plan</TabsTrigger>
            <TabsTrigger value="stats">Races & Stats</TabsTrigger>
          </TabsList>

          {/* Tab 1: Calendar */}
          <TabsContent value="calendar" className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* View toggle */}
                <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-3 text-[13px] ${
                      viewMode === 'calendar'
                        ? 'bg-background shadow-sm'
                        : 'hover:bg-background/50'
                    }`}
                    onClick={() => setViewMode('calendar')}
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    Calendar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-3 text-[13px] ${
                      viewMode === 'table'
                        ? 'bg-background shadow-sm'
                        : 'hover:bg-background/50'
                    }`}
                    onClick={() => setViewMode('table')}
                  >
                    <List className="h-3.5 w-3.5 mr-1.5" />
                    Table
                  </Button>
                </div>

                {/* Training plan always shows for future days only */}
              </div>
            </div>

            {/* Calendar View */}
            {viewMode === 'calendar' && (
              <>
                {/* Month navigation */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </h2>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        const prev = new Date(currentMonth);
                        prev.setMonth(prev.getMonth() - 1);
                        setCurrentMonth(prev);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentMonth(new Date())}
                    >
                      Today
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        const next = new Date(currentMonth);
                        next.setMonth(next.getMonth() + 1);
                        setCurrentMonth(next);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Calendar grid or skeleton */}
                {loading ? (
                  <CalendarSkeleton />
                ) : (
                  <div className="rounded-lg border border-border/20 bg-card overflow-hidden">
                    {/* Day headers */}
                    <div className="grid grid-cols-8 border-b border-border/20 bg-muted/30">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Week'].map((day) => (
                        <div
                          key={day}
                          className={`px-3 py-2 text-[11px] font-semibold text-muted-foreground text-center ${
                            day === 'Week' ? 'border-l border-border/20' : ''
                          }`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar weeks */}
                    {weeks.map((week, weekIdx) => {
                      const weekKm = week.reduce((sum, day) => {
                        return sum + day.completedRuns.reduce((s, r) => s + r.distance_km, 0);
                      }, 0);
                      
                      const todayStart = new Date();
                      todayStart.setHours(0, 0, 0, 0);
                      
                      // Remaining = only count planned km for days that haven't been completed yet
                      const weekRemainingKm = week.reduce((sum, day) => {
                        const dayDate = new Date(day.date);
                        dayDate.setHours(0, 0, 0, 0);
                        const isFuture = dayDate >= todayStart;
                        const hasRuns = day.completedRuns.length > 0;
                        
                        // Only count remaining if it's today/future AND no completed runs yet
                        if (isFuture && !hasRuns) {
                          const daySessions = day.plannedSessions.reduce((s, session) => s + (session.distanceKm || 0), 0);
                          return sum + daySessions;
                        }
                        return sum;
                      }, 0);

                      return (
                        <div key={weekIdx} className="grid grid-cols-8 border-b border-border/20 last:border-0">
                          {/* Day cells */}
                          {week.map((day, dayIdx) => {
                            const isToday = day.date.toDateString() === new Date().toDateString();
                            
                            // Fixed: Ensure proper local date comparison for isPast
                            const todayMidnight = new Date();
                            todayMidnight.setHours(0, 0, 0, 0);
                            const dayMidnight = new Date(day.date);
                            dayMidnight.setHours(0, 0, 0, 0);
                            const isPast = dayMidnight < todayMidnight;
                            
                            // Show planned sessions for today and future (not past)
                            const shouldShowPlanned = !isPast;
                            
                            return (
                              <div
                                key={dayIdx}
                                className={`min-h-[100px] px-2 py-2 border-r border-border/10 last:border-0 ${
                                  !day.isCurrentMonth ? 'bg-muted/20' : ''
                                } ${isToday ? 'bg-primary/5' : ''}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-[11px] font-medium text-foreground">
                                    {day.dayOfMonth}
                                  </div>
                                  {day.sunrise && day.sunset && (
                                    <div className="text-[9px] text-muted-foreground/50 flex items-center gap-0.5">
                                      <span>↑{day.sunrise}</span>
                                      <span>↓{day.sunset}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="space-y-1.5">
                                  {/* Daily total for multi-run days */}
                                  {day.completedRuns.length > 1 && (
                                    <div className="rounded px-1.5 py-0.5 bg-muted/30 border border-border/20">
                                      <div className="text-[9px] font-medium text-muted-foreground/60">
                                        Daily total: {formatDistance(day.completedRuns.reduce((s, r) => s + r.distance_km, 0))}
                                      </div>
                                    </div>
                                  )}
                                  {/* Completed runs (green for normal runs, amber for races) — show max 3, expandable */}
                                  {(expandedDays.has(day.date.toDateString()) ? day.completedRuns : day.completedRuns.slice(0, 3)).map((run, idx) => {
                                    const isRace = run.workout_type === 1;
                                    return (
                                      <div
                                        key={idx}
                                        className={`rounded px-1.5 py-1 cursor-pointer transition-colors duration-150 ${
                                          isRace
                                            ? 'bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25'
                                            : 'bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25'
                                        }`}
                                        onClick={() => setDetailPanel({ type: 'completed', activity: run })}
                                      >
                                        <div className={`text-[10px] font-semibold leading-tight truncate ${
                                          isRace ? 'text-amber-700' : 'text-emerald-700 dark:text-emerald-400'
                                        }`}>
                                          {run.name}
                                        </div>
                                        <div className={`text-[9px] leading-tight ${
                                          isRace ? 'text-amber-600/80' : 'text-emerald-600/80 dark:text-emerald-400/80'
                                        }`}>
                                          {formatDistance(run.distance_km)} • {formatPaceDisplay(run.pace)}
                                        </div>
                                        {run.duration && (
                                          <div className={`text-[9px] leading-tight ${
                                            isRace ? 'text-amber-600/60' : 'text-emerald-600/60 dark:text-emerald-400/60'
                                          }`}>
                                            {run.duration}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {day.completedRuns.length > 3 && (
                                    <button
                                      className="text-[9px] text-muted-foreground hover:text-foreground transition-colors duration-150 w-full text-center py-0.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedDays(prev => {
                                          const next = new Set(prev);
                                          const key = day.date.toDateString();
                                          if (next.has(key)) next.delete(key); else next.add(key);
                                          return next;
                                        });
                                      }}
                                    >
                                      {expandedDays.has(day.date.toDateString()) 
                                        ? 'Show less' 
                                        : `+${day.completedRuns.length - 3} more`}
                                    </button>
                                  )}
                                  
                                  {/* Planned sessions (blue) — show for today + future */}
                                  {/* For doubles: if some runs completed, check if planned volume is partially covered */}
                                  {shouldShowPlanned && day.plannedSessions.length > 0 && (() => {
                                    const nonRestSessions = day.plannedSessions.filter(s => s.type !== 'race' && s.type !== 'rest');
                                    if (nonRestSessions.length === 0) return null;
                                    
                                    // Sort: warm-up → main → cool-down, AM before PM
                                    const sortedSessions = [...nonRestSessions].sort((a, b) => {
                                      // Race day ordering: warm-up (0) → main/race (1) → cool-down (2)
                                      const raceOrder = (s: typeof a) => {
                                        const n = (s.notes || s.workout || '').toLowerCase();
                                        if (n.includes('warm-up') || n.includes('warm up') || n.includes('w/up')) return 0;
                                        if (s.type === 'race') return 1;
                                        if (n.includes('cool-down') || n.includes('cool down') || n.includes('c/down')) return 2;
                                        return 1;
                                      };
                                      const rDiff = raceOrder(a) - raceOrder(b);
                                      if (rDiff !== 0) return rDiff;
                                      
                                      const aIsAM = (a.workout + ' ' + (a.notes || '')).toLowerCase().includes('am');
                                      const bIsAM = (b.workout + ' ' + (b.notes || '')).toLowerCase().includes('am');
                                      if (aIsAM && !bIsAM) return -1;
                                      if (!aIsAM && bIsAM) return 1;
                                      return 0;
                                    });
                                    
                                    // For today with completed runs: check if it's a double and show remaining
                                    const completedDistance = day.completedRuns.reduce((s, r) => s + r.distance_km, 0);
                                    const plannedDistance = sortedSessions.reduce((s, se) => s + (se.distanceKm || 0), 0);
                                    
                                    // If no runs completed, show all planned
                                    // If runs completed but less than planned (partial double), show remaining plan
                                    // If runs completed and >= planned, hide plan (fully done)
                                    const isFullyCompleted = completedDistance >= plannedDistance * 0.8; // 80% threshold
                                    
                                    if (isFullyCompleted && day.completedRuns.length > 0) return null;
                                    
                                    // For partial completion (e.g. one half of a double done), show the session
                                    // with a note about remaining
                                    return sortedSessions.map((session, idx) => {
                                      const estimatedDuration = calculateSessionDuration(session);
                                      return (
                                        <div
                                          key={`plan-${idx}`}
                                          className="rounded px-1.5 py-1 cursor-pointer transition-colors duration-150 bg-sky-500/15 border border-sky-500/30 hover:bg-sky-500/25"
                                          onClick={() => setDetailPanel({ type: 'planned', session })}
                                        >
                                          <div className="text-[10px] font-semibold leading-tight truncate text-sky-700 dark:text-sky-400">
                                            {session.workout}
                                          </div>
                                          {session.distanceKm > 0 && (
                                            <div className="text-[9px] leading-tight text-sky-600/80 dark:text-sky-400/80">
                                              {formatDistance(session.distanceKm)}
                                              {session.pace && ` @ ${formatPaceDisplay(session.pace)}`}
                                            </div>
                                          )}
                                          {estimatedDuration && (
                                            <div className="text-[9px] leading-tight text-sky-600/60 dark:text-sky-400/60">
                                              ~{formatDuration(estimatedDuration)}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    });
                                  })()}
                                  
                                  {/* Race day marker (separate from completed runs) */}
                                  {shouldShowPlanned && day.race && (
                                    <div
                                      className="rounded px-1.5 py-1 bg-amber-500/15 border border-amber-500/40 cursor-pointer hover:bg-amber-500/25 transition-colors duration-150"
                                      onClick={() => setDetailPanel({ type: 'race', race: day.race })}
                                    >
                                      <div className="text-[10px] font-semibold text-amber-700 leading-tight flex items-center gap-1">
                                        <Trophy className="h-2.5 w-2.5" />
                                        <span className="truncate">{day.race.name}</span>
                                      </div>
                                      <div className="text-[9px] text-amber-600/80 leading-tight">
                                        {formatDistance(day.race.distanceKm)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Weekly summary */}
                          <div className="min-h-[100px] px-3 py-2 bg-muted/20 border-l border-border/20">
                            <div className="space-y-2 text-[10px]">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Ran:</span>
                                <span className="font-semibold text-emerald-600">{formatDistance(weekKm)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Remaining:</span>
                                <span className="font-semibold text-sky-600">{formatDistance(weekRemainingKm)}</span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-border/20">
                                <span className="text-muted-foreground">Total:</span>
                                <span className="font-semibold text-foreground">{formatDistance(weekKm + weekRemainingKm)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <>
                {/* Table filters */}
                <div className="flex items-center gap-3">
                  {/* Run type filter */}
                  <Popover open={runTypePopoverOpen} onOpenChange={setRunTypePopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className={`h-8 px-3 text-[13px] bg-secondary border rounded-lg hover:border-primary/50 transition-colors duration-150 flex items-center gap-2 ${
                          runTypeFilter !== 'all' ? 'border-primary text-primary' : 'border-border/20'
                        }`}
                      >
                        <Filter className="h-3 w-3" />
                        {runTypeFilter === 'all' ? 'All runs' : runTypeFilter === 'runs' ? 'Runs only' : 'Races only'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="start">
                      <div className="space-y-0.5">
                        {(['all', 'runs', 'races'] as const).map(opt => (
                          <button
                            key={opt}
                            className={`w-full px-2 py-1 rounded-md text-[13px] text-left transition-colors duration-150 ${
                              runTypeFilter === opt ? 'bg-primary/20 text-primary' : 'hover:bg-accent text-muted-foreground'
                            }`}
                            onClick={() => {
                              setRunTypeFilter(opt);
                              setRunTypePopoverOpen(false);
                            }}
                          >
                            {opt === 'all' ? 'All runs' : opt === 'runs' ? 'Runs only' : 'Races only'}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Date range filter */}
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        aria-label="Filter by date"
                        className={`h-8 px-3 text-[13px] bg-secondary border rounded-lg hover:border-primary/50 transition-colors duration-150 flex items-center gap-2 ${
                          dateRangeFilter !== 'all' ? 'border-primary text-primary' : 'border-border/20'
                        }`}
                      >
                        <CalendarDays className="h-3 w-3" />
                        {dateRangeFilter === 'all' ? 'All time' :
                         dateRangeFilter === 'thisWeek' ? 'This week' :
                         dateRangeFilter === 'lastWeek' ? 'Last week' :
                         dateRangeFilter === 'thisMonth' ? 'This month' :
                         dateRangeFilter === 'lastMonth' ? 'Last month' :
                         dateRangeFilter === 'last3Months' ? 'Last 3 months' :
                         dateRangeFilter === 'last6Months' ? 'Last 6 months' :
                         dateRangeFilter === 'thisYear' ? 'This year' :
                         dateRangeFilter === 'lastYear' ? 'Last year' :
                         'Custom range'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start">
                      <div className="flex gap-3">
                        <div className="flex flex-col gap-0.5 min-w-[120px]">
                          {(['all', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'last3Months', 'last6Months', 'thisYear', 'lastYear'] as const).map(opt => (
                            <button
                              key={opt}
                              onClick={() => {
                                setDateRangeFilter(opt);
                                setCustomDateRange(runDatePresetToRange(opt));
                              }}
                              className={`px-2 py-1 text-[13px] rounded-md text-left transition-colors duration-150 ${
                                dateRangeFilter === opt ? 'bg-primary/20 text-primary' : 'hover:bg-accent text-muted-foreground'
                              }`}
                            >
                              {opt === 'all' ? 'All time' :
                               opt === 'thisWeek' ? 'This week' :
                               opt === 'lastWeek' ? 'Last week' :
                               opt === 'thisMonth' ? 'This month' :
                               opt === 'lastMonth' ? 'Last month' :
                               opt === 'last3Months' ? 'Last 3 months' :
                               opt === 'last6Months' ? 'Last 6 months' :
                               opt === 'thisYear' ? 'This year' :
                               'Last year'}
                            </button>
                          ))}
                        </div>
                        <div className="border-l border-border/20 pl-3">
                          <CalendarPicker
                            mode="range"
                            selected={customDateRange}
                            onSelect={(range) => {
                              setCustomDateRange(range);
                              if (range?.from) setDateRangeFilter('custom');
                            }}
                            numberOfMonths={1}
                            className="p-0"
                            classNames={{
                              range_start: 'rounded-l-md !bg-primary/50',
                              range_middle: 'rounded-none !bg-primary/30',
                              range_end: 'rounded-r-md !bg-primary/50',
                            }}
                          />
                          {dateRangeFilter !== 'all' && (
                            <button
                              onClick={() => {
                                setCustomDateRange(undefined);
                                setDateRangeFilter('all');
                                setDatePopoverOpen(false);
                              }}
                              className="w-full mt-2 px-2.5 py-1.5 text-[13px] rounded-md text-destructive hover:bg-destructive/10 transition-colors duration-150 text-center"
                            >
                              Clear range
                            </button>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Clear all */}
                  {(runTypeFilter !== 'all' || dateRangeFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setRunTypeFilter('all');
                        setDateRangeFilter('all');
                        setCustomDateRange(undefined);
                      }}
                      className="h-8 px-3 text-[13px] rounded-lg border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors duration-150 flex items-center gap-1.5"
                    >
                      <X className="h-3 w-3" />
                      Clear all
                    </button>
                  )}
                </div>

                <div className="rounded-lg border border-border/20 bg-card overflow-hidden">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="space-y-3">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <table className="w-full text-[13px]">
                      <thead className="bg-muted/30 border-b border-border/20">
                        <tr>
                          <th 
                            className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => handleSort('date')}
                          >
                            Date {sortColumn === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => handleSort('name')}
                          >
                            Name {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => handleSort('distance')}
                          >
                            Distance {sortColumn === 'distance' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => handleSort('duration')}
                          >
                            Duration {sortColumn === 'duration' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => handleSort('pace')}
                          >
                            Pace {sortColumn === 'pace' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => handleSort('hr')}
                          >
                            Avg HR {sortColumn === 'hr' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedActivities.map((activity) => {
                          const isRace = activity.workout_type === 1;
                          return (
                            <tr
                              key={activity.id}
                              className="border-b border-border/10 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => setDetailPanel({ type: 'completed', activity })}
                            >
                              <td className="px-4 py-3 text-foreground">
                                {new Date(activity.date).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="px-4 py-3 text-foreground">
                                <div className="flex items-center gap-2">
                                  {isRace && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                                  <span className={`truncate ${isRace ? 'text-amber-600 font-medium' : ''}`}>{activity.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-foreground">{formatDistance(activity.distance_km)}</td>
                              <td className="px-4 py-3 text-foreground">{activity.duration}</td>
                              <td className="px-4 py-3 text-foreground">{formatPaceDisplay(activity.pace)}</td>
                              <td className="px-4 py-3 text-foreground">{activity.hr ? `${activity.hr} bpm` : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* Tab 2: Training Plan */}
          <TabsContent value="plan" className="space-y-4">
            <div className="space-y-3">
              {LONDON_MARATHON_PLAN.map((week) => {
                // Determine current week based on date range
                const [startStr, endStr] = week.dates.split(' - ');
                const startDate = new Date(`${startStr} 2026`);
                const endDate = new Date(`${endStr} 2026`);
                const today = new Date();
                const isCurrentWeek = today >= startDate && today <= endDate;
                const isExpanded = expandedWeeks.has(week.week);

                // Build sessions from DB if available, otherwise use hardcoded
                const weekDbSessions = dbSessions.filter(s => s.week_number === week.week);
                const DAY_OFFSETS_MAP: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
                
                // Build display sessions (either from DB or hardcoded)
                const displaySessionsRaw = weekDbSessions.length > 0
                  ? weekDbSessions.map((s: any) => ({
                      day: s.day_of_week,
                      type: s.session_type,
                      distance: s.distance_miles ? `${s.distance_miles}mi` : '-',
                      pace: s.pace || '-',
                      notes: s.notes || '',
                      date: s.date,
                      dbId: s.id,
                    }))
                  : week.sessions.map((s, idx) => {
                      const d = new Date(startDate);
                      d.setDate(d.getDate() + (DAY_OFFSETS_MAP[s.day] ?? 0));
                      return {
                        ...s,
                        date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
                        dbId: null,
                      };
                    });
                
                // Sort sessions: by day, then warm-up → main session → cool-down, AM before PM
                const displaySessions = [...displaySessionsRaw].sort((a, b) => {
                  // First sort by day of week
                  const dayOrder: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
                  const dayDiff = (dayOrder[a.day] ?? 0) - (dayOrder[b.day] ?? 0);
                  if (dayDiff !== 0) return dayDiff;
                  
                  // Race day ordering: warm-up (0) → race (1) → cool-down (2)
                  const raceOrder = (s: typeof a) => {
                    const n = (s.notes || '').toLowerCase();
                    if (n.includes('warm-up') || n.includes('warm up') || n.includes('w/up')) return 0;
                    if (s.type.toLowerCase() === 'race') return 1;
                    if (n.includes('cool-down') || n.includes('cool down') || n.includes('c/down')) return 2;
                    return 1;
                  };
                  const rDiff = raceOrder(a) - raceOrder(b);
                  if (rDiff !== 0) return rDiff;
                  
                  // Then sort AM before PM within the same day
                  const aIsAM = (a.type + ' ' + (a.notes || '')).toLowerCase().includes('am');
                  const bIsAM = (b.type + ' ' + (b.notes || '')).toLowerCase().includes('am');
                  if (aIsAM && !bIsAM) return -1;
                  if (!aIsAM && bIsAM) return 1;
                  return 0;
                });
                
                // Phase colors
                const phaseColors: Record<string, string> = {
                  'BUILD': 'border-blue-500/40 bg-blue-500/10',
                  'PEAK': 'border-amber-500/40 bg-amber-500/10',
                  'SPECIFIC': 'border-purple-500/40 bg-purple-500/10',
                  'RECOVERY': 'border-slate-500/40 bg-slate-500/10',
                  'TAPER': 'border-emerald-500/40 bg-emerald-500/10',
                  'RACE WEEK': 'border-red-500/40 bg-red-500/10'
                };
                
                const phaseBadgeColors: Record<string, string> = {
                  'BUILD': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
                  'PEAK': 'bg-amber-500/20 text-amber-700 border-amber-500/30',
                  'SPECIFIC': 'bg-purple-500/20 text-purple-700 border-purple-500/30',
                  'RECOVERY': 'bg-slate-500/20 text-slate-700 border-slate-500/30',
                  'TAPER': 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
                  'RACE WEEK': 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30'
                };
                
                return (
                  <Card
                    key={week.week}
                    className={`rounded-lg border transition-all duration-200 ${
                      isCurrentWeek
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : phaseColors[week.phase]
                    }`}
                  >
                    <div
                      className="px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => {
                        setExpandedWeeks(prev => {
                          const next = new Set(prev);
                          if (next.has(week.week)) next.delete(week.week);
                          else next.add(week.week);
                          return next;
                        });
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-foreground">
                              Week {week.week}
                            </span>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${phaseBadgeColors[week.phase]}`}
                            >
                              {week.phase}
                            </span>
                            {isCurrentWeek && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                                CURRENT
                              </span>
                            )}
                          </div>
                          <span className="text-[13px] text-muted-foreground">
                            {week.dates}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          {week.raceEvent && (
                            <div className="flex items-center gap-1.5 text-amber-600">
                              <Trophy className="h-3.5 w-3.5" />
                              <span className="text-[11px] font-medium">{week.raceEvent}</span>
                            </div>
                          )}
                          <span className="text-[13px] font-semibold text-foreground">
                            {(() => {
                              const todayM = new Date();
                              todayM.setHours(0, 0, 0, 0);
                              
                              // Actual: sum all Strava activities in this week's date range
                              const weekEnd = new Date(endDate);
                              weekEnd.setHours(23, 59, 59, 999);
                              const actualKm = activities
                                .filter(a => {
                                  const d = new Date(a.date);
                                  return d >= startDate && d <= weekEnd;
                                })
                                .reduce((sum, a) => sum + a.distance_km, 0);
                              
                              // Remaining: sum planned sessions for today/future that haven't been completed
                              const remainingKm = displaySessions.reduce((sum, s) => {
                                const sDate = new Date(s.date + 'T00:00:00');
                                if (sDate < todayM) return sum; // past day — skip (use actual instead)
                                
                                // Check if this day has Strava activities
                                const dateStr = s.date;
                                const dayHasRuns = activities.some(a => {
                                  const ad = new Date(a.date);
                                  const adStr = `${ad.getFullYear()}-${String(ad.getMonth()+1).padStart(2,'0')}-${String(ad.getDate()).padStart(2,'0')}`;
                                  return adStr === dateStr;
                                });
                                if (dayHasRuns) return sum; // already ran today — use actual
                                
                                const match = s.distance.match(/(\d+\.?\d*)\s*mi/);
                                if (!match) return sum;
                                return sum + parseFloat(match[1]) * 1.60934;
                              }, 0);
                              
                              return formatDistance(actualKm + remainingKm);
                            })()}
                          </span>
                          <ChevronRight
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="px-4 pb-3 border-t border-border/20 bg-card/50">
                        <div className="mt-3 rounded-lg border border-border/20 overflow-hidden">
                          <table className="w-full text-[13px]">
                            <thead className="bg-muted/30 border-b border-border/20">
                              <tr>
                                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-16">
                                  Day
                                </th>
                                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">
                                  Type
                                </th>
                                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-24">
                                  Distance
                                </th>
                                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-32">
                                  Pace
                                </th>
                                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">
                                  Notes
                                </th>
                                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-40">
                                  Actual
                                </th>
                                {dbSessions.length > 0 && (
                                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-12">
                                    
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {displaySessions.map((session, idx) => {
                                const isRace = session.type.toLowerCase().includes('race');
                                const isRest = session.type.toLowerCase().includes('rest');
                                const sessionDateStr = session.date;
                                
                                // Check if day is in the past
                                const todayMidnight = new Date();
                                todayMidnight.setHours(0, 0, 0, 0);
                                const sessionMidnight = new Date(sessionDateStr + 'T00:00:00');
                                const isPastDay = sessionMidnight < todayMidnight;
                                const isToday = sessionMidnight.getTime() === todayMidnight.getTime();
                                
                                // Find matching Strava activities for this date
                                const dayActivities = activities.filter(a => {
                                  const activityDate = new Date(a.date);
                                  const activityDateStr = `${activityDate.getFullYear()}-${String(activityDate.getMonth()+1).padStart(2,'0')}-${String(activityDate.getDate()).padStart(2,'0')}`;
                                  return activityDateStr === sessionDateStr;
                                });
                                
                                const hasCompleted = dayActivities.length > 0;
                                
                                // Only show: completed sessions + today + future. Hide past unrun sessions.
                                if (isPastDay && !hasCompleted && !isRest) return null;
                                
                                // Calculate totals if multiple activities
                                const totalDistance = dayActivities.reduce((sum, a) => sum + a.distance_km, 0);
                                const mainPace = dayActivities.length === 1 
                                  ? dayActivities[0].pace 
                                  : dayActivities.length > 1 
                                    ? dayActivities.reduce((best, a) => {
                                        const dist = a.distance_km;
                                        return dist > (best?.distance_km || 0) ? a : best;
                                      }, dayActivities[0])?.pace || ''
                                    : '';
                                
                                // Build TrainingSession for detail panel
                                const planSession: TrainingSession = {
                                  date: sessionDateStr,
                                  workout: `${session.type}${session.notes ? ' - ' + session.notes : ''}`,
                                  distanceKm: (() => {
                                    const m = session.distance.match(/(\d+\.?\d*)\s*mi/);
                                    return m ? parseFloat(m[1]) * 1.60934 : 0;
                                  })(),
                                  pace: session.pace,
                                  type: (() => {
                                    const t = session.type.toLowerCase();
                                    if (t.includes('recovery')) return 'recovery' as const;
                                    if (t.includes('tempo') || t.includes('marathon pace')) return 'tempo' as const;
                                    if (t.includes('long')) return 'long' as const;
                                    if (t.includes('track')) return 'track' as const;
                                    if (t.includes('race')) return 'race' as const;
                                    if (t.includes('rest')) return 'rest' as const;
                                    return 'easy' as const;
                                  })(),
                                };

                                return (
                                  <tr
                                    key={idx}
                                    className={`border-b border-border/10 last:border-0 cursor-pointer transition-colors hover:bg-muted/30 ${
                                      isRace ? 'bg-amber-500/5' : hasCompleted ? 'bg-emerald-500/5' : ''
                                    }`}
                                    onClick={() => {
                                      if (hasCompleted) {
                                        setDetailPanel({ type: 'completed', activity: dayActivities[0] });
                                      } else {
                                        setDetailPanel({ type: 'planned', session: planSession });
                                      }
                                    }}
                                  >
                                    <td className="px-3 py-2 text-foreground font-medium">
                                      {session.day}
                                    </td>
                                    <td className="px-3 py-2 text-foreground">
                                      <div className="flex items-center gap-1.5">
                                        {isRace && <Trophy className="h-3 w-3 text-amber-500" />}
                                        <span className={isRace ? 'text-amber-600 font-medium' : ''}>
                                          {session.type}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-foreground">
                                      {(() => {
                                        if (session.distance === '-') return '-';
                                        const match = session.distance.match(/~?(\d+\.?\d*)\s*mi/);
                                        if (!match) return session.distance;
                                        const mi = parseFloat(match[1]);
                                        const prefix = session.distance.startsWith('~') ? '~' : '';
                                        if (useMiles) return `${prefix}${mi}mi`;
                                        return `${prefix}${(mi * 1.60934).toFixed(1)}km`;
                                      })()}
                                    </td>
                                    <td className="px-3 py-2 text-foreground">
                                      {useMiles ? session.pace : (() => {
                                        return session.pace.replace(/(\d+:\d+)\/mi/g, (_match: string, p: string) => {
                                          const [min, sec] = p.split(':').map(Number);
                                          const totalSec = min * 60 + sec;
                                          const kmSec = Math.round(totalSec / 1.60934);
                                          const km = Math.floor(kmSec / 60);
                                          const ks = kmSec % 60;
                                          return `${km}:${String(ks).padStart(2, '0')}/km`;
                                        });
                                      })()}
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground">
                                      {session.notes}
                                    </td>
                                    <td className="px-3 py-2">
                                      {hasCompleted ? (
                                        <div className="flex items-center gap-1.5">
                                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                          <div className="text-emerald-700">
                                            <div className="text-[11px] font-semibold">
                                              {formatDistance(totalDistance)}
                                            </div>
                                            <div className="text-[10px] text-emerald-600/80">
                                              {mainPace ? formatPaceDisplay(mainPace) : ''}
                                            </div>
                                          </div>
                                        </div>
                                      ) : isRest ? (
                                        <span className="text-[11px] text-muted-foreground">Rest</span>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground">—</span>
                                      )}
                                    </td>
                                    {dbSessions.length > 0 && (
                                      <td className="px-3 py-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                          onClick={() => {
                                            if (session.dbId) {
                                              const dbSession = dbSessions.find(s => s.id === session.dbId);
                                              if (dbSession) handleEditSession(dbSession);
                                            } else {
                                              const dbSession = dbSessions.find(s => s.date === sessionDateStr);
                                              if (dbSession) handleEditSession(dbSession);
                                            }
                                          }}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              }).filter(Boolean)}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Tab 3: Races & Stats */}
          <TabsContent value="stats" className="space-y-4">
            {/* Stats cards - 3-4 column grid, denser layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* PBs - smaller inline layout */}
              <Card className="rounded-lg border border-border/20 bg-card px-4 py-3">
                <h3 className="text-[13px] font-semibold text-foreground mb-2">Personal Bests</h3>
                <div className="space-y-1">
                  {Object.entries(PBs).map(([distance, time]) => (
                    <div key={distance} className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{distance}</span>
                      <span className="text-[13px] font-semibold text-foreground">{time}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* London Marathon countdown - smaller */}
              <Card className="rounded-lg border border-border/20 bg-card px-4 py-3">
                <h3 className="text-[13px] font-semibold text-foreground mb-2">London Marathon</h3>
                {daysToLondon !== null && daysToLondon > 0 ? (
                  <>
                    <p className="text-3xl font-bold text-primary">{daysToLondon}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">days away</p>
                    <p className="text-[11px] text-amber-600 font-medium mt-1">Goal: {raceGoals['London Marathon'] || 'sub 2:30'}</p>
                  </>
                ) : (
                  <p className="text-[13px] text-muted-foreground">Race complete!</p>
                )}
              </Card>

              {/* This week/month - inline */}
              <Card className="rounded-lg border border-border/20 bg-card px-4 py-3">
                <h3 className="text-[13px] font-semibold text-foreground mb-2">This Week</h3>
                <p className="text-2xl font-bold text-foreground">{formatDistance(thisWeekKm)}</p>
              </Card>

              <Card className="rounded-lg border border-border/20 bg-card px-4 py-3">
                <h3 className="text-[13px] font-semibold text-foreground mb-2">This Month</h3>
                <p className="text-2xl font-bold text-foreground">{formatDistance(thisMonthKm)}</p>
              </Card>

              {/* Training phase */}
              <Card className="rounded-lg border border-border/20 bg-card px-4 py-3">
                <h3 className="text-[13px] font-semibold text-foreground mb-2">Training Phase</h3>
                <p className="text-2xl font-bold text-foreground">{trainingPhase}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {daysToLondon !== null && daysToLondon > 0 ? `${daysToLondon} days to London` : 'Off-season'}
                </p>
              </Card>
            </div>

            {/* Upcoming races */}
            <Card className="rounded-lg border border-border/20 bg-card px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Upcoming Races
                </h2>
                {upcomingRaces.length > 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllRaces(!showAllRaces)}
                  >
                    {showAllRaces ? 'Show less' : 'View all'}
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                {displayedRaces.map((race, idx) => {
                  const days = daysUntil(race.date);
                  const { prediction } = generateRacePrediction(race);
                  const userGoal = raceGoals[race.name];
                  
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 cursor-pointer hover:bg-muted/30 transition-colors rounded px-2 -mx-2"
                      onClick={() => setDetailPanel({ type: 'race', race })}
                    >
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-foreground">{race.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(race.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          · {race.distance}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {userGoal && (
                            <p className="text-[11px] text-amber-600 font-medium">Goal: {userGoal}</p>
                          )}
                          {prediction && (
                            <p className="text-[11px] text-muted-foreground">Predicted: {prediction}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xl font-bold text-primary">{days}</p>
                        <p className="text-[11px] text-muted-foreground">days</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Weekly mileage bars - last 12 weeks, Monday-labeled */}
            <Card className="rounded-lg border border-border/20 bg-card px-4 py-3">
              <h3 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Weekly Mileage (Last 12 Weeks)
              </h3>
              <div className="space-y-2">
                {last12Weeks.map((week, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="text-[11px] text-muted-foreground w-14 shrink-0">
                      {format(week.monday, 'd MMM')}
                    </div>
                    <div className="flex-1 h-5 bg-muted/30 rounded-md overflow-hidden">
                      <div
                        className="h-full bg-emerald-500/70 transition-all duration-300"
                        style={{ width: `${(week.km / maxWeekKm) * 100}%` }}
                      />
                    </div>
                    <div className="text-[13px] font-semibold text-foreground w-12 text-right">
                      {formatDistance(week.km)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Panel */}
      <Sheet open={!!detailPanel} onOpenChange={(open) => !open && setDetailPanel(null)}>
        <SheetContent 
          side="right"
          className="bg-card border-l border-border/20 p-0 overflow-y-auto [&>button]:hidden rounded-none md:rounded-tl-2xl md:rounded-bl-2xl !w-full md:!w-[600px] md:!max-w-[900px] md:!top-3 md:!bottom-3 md:!h-auto"
          showCloseButton={false}
          onOpenAutoFocus={e => e.preventDefault()}
        >
          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-border/20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">
                {detailPanel?.type === 'completed' && detailPanel.activity?.name}
                {detailPanel?.type === 'planned' && detailPanel.session?.workout}
                {detailPanel?.type === 'race' && detailPanel.race?.name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-muted/60"
                onClick={() => setDetailPanel(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-0">
            {/* Completed Run Detail */}
            {detailPanel?.type === 'completed' && detailPanel.activity && (
              <>
                {/* Stats section */}
                <div className="px-5 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Date</p>
                      <p className="text-[13px] font-semibold text-foreground">
                        {new Date(detailPanel.activity.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Time</p>
                      <p className="text-[13px] font-semibold text-foreground">
                        {new Date(detailPanel.activity.date).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Distance</p>
                      <p className="text-[13px] font-semibold text-foreground">
                        {formatDistance(detailPanel.activity.distance_km)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Duration</p>
                      <p className="text-[13px] font-semibold text-foreground">{detailPanel.activity.duration}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Avg Pace</p>
                      <p className="text-[13px] font-semibold text-foreground">
                        {formatPaceDisplay(detailPanel.activity.pace)}
                      </p>
                    </div>
                    {detailPanel.activity.hr && (
                      <div>
                        <p className="text-[11px] text-muted-foreground">Avg HR</p>
                        <p className="text-[13px] font-semibold text-foreground">{detailPanel.activity.hr} bpm</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/20" />

                {/* Lap Breakdown section */}
                <div className="px-5 py-4">
                  <h3 className="text-[13px] font-semibold text-foreground mb-3">Lap Breakdown</h3>
                  {loadingLaps ? (
                    <p className="text-[13px] text-muted-foreground">Loading laps...</p>
                  ) : laps.length > 0 ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border/20 overflow-hidden">
                        <table className="w-full text-[13px]">
                          <thead className="bg-muted/30 border-b border-border/20">
                            <tr>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Lap</th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Distance</th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Pace</th>
                              {laps.some(l => l.hr) && (
                                <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">HR</th>
                              )}
                              <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {laps.map((lap, idx) => (
                              <tr key={idx} className="border-b border-border/10 last:border-0">
                                <td className="px-3 py-2 text-foreground">{lap.lap}</td>
                                <td className="px-3 py-2 text-foreground">{formatDistance(lap.distance_km)}</td>
                                <td className="px-3 py-2 text-foreground">{formatPaceDisplay(lap.pace)}</td>
                                {laps.some(l => l.hr) && (
                                  <td className="px-3 py-2 text-foreground">{lap.hr || '—'}</td>
                                )}
                                <td className="px-3 py-2 text-foreground">{lap.time}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Session Summary */}
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/20">
                        <h4 className="text-[13px] font-semibold text-muted-foreground mb-2">Coach Summary</h4>
                        <p className="text-[13px] text-foreground leading-relaxed">
                          {generateSessionSummary(laps, detailPanel.activity.name, useMiles)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">No lap data available for this activity.</p>
                  )}
                </div>
              </>
            )}

            {/* Planned Session Detail */}
            {detailPanel?.type === 'planned' && detailPanel.session && (
              <>
                {/* Stats section */}
                <div className="px-5 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Date</p>
                      <p className="text-[13px] font-semibold text-foreground">
                        {new Date(detailPanel.session.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    {detailPanel.session.distanceKm > 0 && (
                      <>
                        <div>
                          <p className="text-[11px] text-muted-foreground">Planned Distance</p>
                          <p className="text-[13px] font-semibold text-foreground">
                            {formatDistance(detailPanel.session.distanceKm)}
                          </p>
                        </div>
                        {detailPanel.session.pace && (
                          <div>
                            <p className="text-[11px] text-muted-foreground">Planned Pace</p>
                            <p className="text-[13px] font-semibold text-foreground">
                              {formatPaceDisplay(detailPanel.session.pace)}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <p className="text-[11px] text-muted-foreground">Type</p>
                      <p className="text-[13px] font-semibold text-foreground capitalize">{detailPanel.session.type}</p>
                    </div>
                    {(() => {
                      const dur = calculateSessionDuration(detailPanel.session!);
                      return dur ? (
                        <div>
                          <p className="text-[11px] text-muted-foreground">Est. Duration</p>
                          <p className="text-[13px] font-semibold text-foreground">~{formatDuration(dur)}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div className="border-t border-border/20" />

                {/* Description section */}
                <div className="px-5 py-4">
                  {(() => {
                    const desc = generatePlannedDescription(detailPanel.session!);
                    return (
                      <div className="space-y-3">
                        <div className="p-4 rounded-lg bg-muted/30 border border-border/20">
                          <h4 className="text-[13px] font-bold text-foreground mb-1">{desc.title}</h4>
                        </div>
                        
                        {desc.structure && desc.structure.length > 0 && (
                          <div className="p-4 rounded-lg bg-muted/30 border border-border/20">
                            <h4 className="text-[11px] font-semibold text-muted-foreground tracking-wide mb-2">Structure</h4>
                            <ol className="space-y-1.5">
                              {desc.structure.map((step, i) => (
                                <li key={i} className="flex items-start gap-2 text-[13px] text-foreground">
                                  <span className="text-[11px] font-bold text-muted-foreground mt-0.5 min-w-[16px]">{i + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {desc.effort && (
                          <div className="p-4 rounded-lg bg-muted/30 border border-border/20">
                            <h4 className="text-[11px] font-semibold text-muted-foreground tracking-wide mb-1">Effort</h4>
                            <p className="text-[13px] text-foreground">{desc.effort}</p>
                          </div>
                        )}

                        {desc.tip && (
                          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                            <h4 className="text-[11px] font-semibold text-primary tracking-wide mb-1">Tip</h4>
                            <p className="text-[13px] text-foreground">{desc.tip}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Edit button */}
                {dbSessions.length > 0 && (
                  <div className="px-5 pb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[13px] gap-2"
                      onClick={() => {
                        const dbSession = dbSessions.find((s: any) => s.date === detailPanel.session!.date);
                        if (dbSession) {
                          handleEditSession(dbSession);
                          setDetailPanel(null);
                        }
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit session
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Race Detail */}
            {detailPanel?.type === 'race' && detailPanel.race && (() => {
              const { prediction, strategy } = generateRacePrediction(detailPanel.race);
              const days = daysUntil(detailPanel.race.date);
              const currentGoal = raceGoals[detailPanel.race.name] || detailPanel.race.goal;
              const isEditing = editingGoal === detailPanel.race.name;

              // TODO: Auto-adapt training paces based on race results and goals

              return (
                <>
                  {/* Stats section */}
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Date</p>
                        <p className="text-[13px] font-semibold text-foreground">
                          {new Date(detailPanel.race.date + 'T00:00:00').toLocaleDateString('en-GB', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Distance</p>
                        <p className="text-[13px] font-semibold text-foreground">{detailPanel.race.distance} ({formatDistance(detailPanel.race.distanceKm)})</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{days > 0 ? 'Days Away' : 'Status'}</p>
                        <p className="text-[13px] font-semibold text-foreground">{days > 0 ? days : 'Complete'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Goal</p>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={goalInput}
                              onChange={(e) => {
                                // Auto-format as time: only allow digits and colons
                                const raw = e.target.value.replace(/[^\d:]/g, '');
                                // Auto-insert colons: 1 → 1, 12 → 12, 123 → 1:23, 1234 → 12:34, 12345 → 1:23:45, 123456 → 1:23:45:6 etc.
                                const digits = raw.replace(/:/g, '');
                                let formatted = digits;
                                if (digits.length <= 2) {
                                  formatted = digits;
                                } else if (digits.length <= 4) {
                                  formatted = digits.slice(0, -2) + ':' + digits.slice(-2);
                                } else if (digits.length <= 6) {
                                  formatted = digits.slice(0, -4) + ':' + digits.slice(-4, -2) + ':' + digits.slice(-2);
                                } else {
                                  formatted = digits.slice(0, 6);
                                  formatted = formatted.slice(0, -4) + ':' + formatted.slice(-4, -2) + ':' + formatted.slice(-2);
                                }
                                setGoalInput(formatted);
                              }}
                              placeholder={detailPanel.race?.distance === 'Marathon' ? 'H:MM:SS' : 'MM:SS'}
                              className="h-7 text-[13px] px-2 py-1 w-24 font-mono"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveGoal(detailPanel.race!.name);
                                if (e.key === 'Escape') setEditingGoal(null);
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleSaveGoal(detailPanel.race!.name)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold text-amber-600">{currentGoal || 'Not set'}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-muted/60"
                              onClick={() => handleStartEditGoal(detailPanel.race!.name, currentGoal)}
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Prediction section */}
                  {prediction && (
                    <>
                      <div className="border-t border-border/20" />
                      <div className="px-5 py-4">
                        <h4 className="text-[13px] font-semibold text-foreground mb-2">Race Prediction</h4>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">{prediction}</p>
                        {currentGoal && (
                          <p className="text-[13px] text-amber-600 font-medium mt-2">Your goal: {currentGoal}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Strategy section */}
                  {strategy && (
                    <>
                      <div className="border-t border-border/20" />
                      <div className="px-5 py-4">
                        <h4 className="text-[13px] font-semibold text-foreground mb-2">Race Strategy</h4>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">{strategy}</p>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Session Dialog */}
      <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-session">Current Session</Label>
              <div className="text-[13px] text-muted-foreground">
                {editingSession && (
                  <>
                    <p><strong>{editingSession.session_type}</strong></p>
                    <p>{editingSession.distance_miles ? `${editingSession.distance_miles.toFixed(1)}mi` : '—'} • {editingSession.pace || '—'}</p>
                    <p className="text-[11px] mt-1">{editingSession.notes}</p>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-text">Describe the change</Label>
              <Input
                id="edit-text"
                placeholder="e.g., change to 8 mile tempo at 3:50/km"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveSessionEdit();
                  if (e.key === 'Escape') setEditingSession(null);
                }}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Examples: "change to 10 miles easy", "make it a rest day", "8 x 1K at 3:30"
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingSession(null)}>Cancel</Button>
            <Button onClick={handleSaveSessionEdit} disabled={!editText.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
