import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface SessionDef {
  day: string;
  type: string;
  distanceMi: number;
  pace: string;
  notes: string;
}

interface WeekDef {
  week: number;
  startDate: string; // YYYY-MM-DD (Monday)
  phase: string;
  sessions: SessionDef[];
}

const DAY_OFFSETS: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

const PLAN: WeekDef[] = [
  {
    week: 1, startDate: '2026-02-23', phase: 'BUILD',
    sessions: [
      { day: 'Tue', type: 'Track', distanceMi: 7, pace: '-', notes: 'Club Track Session (Woking AC)' },
      { day: 'Wed', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Wed', type: 'Easy', distanceMi: 5, pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Thu', type: 'Steady', distanceMi: 10, pace: '6:42/mi', notes: 'Evening steady' },
      { day: 'Fri', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Fri', type: 'Steady', distanceMi: 8, pace: '6:42-6:58/mi', notes: 'PM steady' },
      { day: 'Sat', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Sat', type: 'Easy', distanceMi: 5, pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Sun', type: 'Long Run', distanceMi: 20, pace: 'Progressive', notes: '10mi @ 7:14, 5mi @ 6:34, 5mi @ 6:02' },
    ]
  },
  {
    week: 2, startDate: '2026-03-02', phase: 'BUILD',
    sessions: [
      { day: 'Mon', type: 'Rest', distanceMi: 0, pace: '-', notes: 'Rest day — recover from Sunday long run' },
      { day: 'Tue', type: 'Track', distanceMi: 7, pace: '-', notes: 'Club Track Session (Woking AC)' },
      { day: 'Wed', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Wed', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Thu', type: 'Marathon Pace', distanceMi: 14, pace: '5:46/mi MP', notes: '2mi w/up, 3mi-2.5mi-2mi-1.2mi @ 5:46 (800m @ 6:50 recovery), 2mi c/down' },
      { day: 'Fri', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Fri', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Sat', type: 'Moderate', distanceMi: 11, pace: '6:26-6:42/mi', notes: 'Steady aerobic' },
      { day: 'Sun', type: 'Long Run', distanceMi: 23, pace: '6:02/mi', notes: '2mi w/up, 19mi @ 6:02 (95% MP) steady, 2mi c/down' },
    ]
  },
  {
    week: 3, startDate: '2026-03-09', phase: 'PEAK',
    sessions: [
      { day: 'Mon', type: 'Recovery', distanceMi: 5, pace: '8:03/mi', notes: 'AM recovery' },
      { day: 'Mon', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Tue', type: 'Track', distanceMi: 7, pace: '-', notes: 'Club Track Session (Woking AC)' },
      { day: 'Tue', type: 'Easy', distanceMi: 5, pace: '7:14/mi', notes: 'PM easy shakeout' },
      { day: 'Wed', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Wed', type: 'Steady', distanceMi: 7, pace: '6:42/mi', notes: 'PM steady' },
      { day: 'Thu', type: 'Tempo', distanceMi: 12, pace: '6:10/mi', notes: '2mi w/up, 8mi @ 6:10, 2mi c/down' },
      { day: 'Fri', type: 'Easy', distanceMi: 7, pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Fri', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Sat', type: 'Moderate + Hills', distanceMi: 11, pace: '6:34/mi', notes: '7mi moderate + 8 x 40m hill sprints + 4mi easy' },
      { day: 'Sun', type: 'Long Run', distanceMi: 23, pace: 'MP Finish', notes: '10mi @ 6:58, 11mi @ 5:46 (MP), 2mi c/down — PEAK SESSION' },
    ]
  },
  {
    week: 4, startDate: '2026-03-16', phase: 'RECOVERY',
    sessions: [
      { day: 'Mon', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Mon', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Tue', type: 'Track', distanceMi: 7, pace: '-', notes: 'Club Track Session (Woking AC) — may feel flat, OK' },
      { day: 'Tue', type: 'Easy', distanceMi: 4, pace: '7:14/mi', notes: 'PM easy shakeout' },
      { day: 'Wed', type: 'Rest', distanceMi: 0, pace: '-', notes: 'Rest day — recovery week breather before Thursday tempo' },
      { day: 'Thu', type: 'Tempo', distanceMi: 11, pace: '6:19/mi', notes: '2mi w/up, 7mi @ 6:19, 2mi c/down' },
      { day: 'Fri', type: 'Shakeout', distanceMi: 6, pace: '7:31/mi', notes: '+ 4 x 100m strides' },
      { day: 'Sat', type: 'Easy', distanceMi: 5, pace: '7:31/mi', notes: 'Pre-race shakeout + strides' },
      { day: 'Sun', type: 'Easy', distanceMi: 2, pace: '7:31/mi', notes: 'Race warm-up jog + strides' },
      { day: 'Sun', type: 'Race', distanceMi: 13.1, pace: 'Race', notes: 'Surrey Half Marathon (target 70:30)' },
    ]
  },
  {
    week: 5, startDate: '2026-03-23', phase: 'SPECIFIC',
    sessions: [
      { day: 'Mon', type: 'Recovery', distanceMi: 5, pace: '8:19/mi', notes: 'AM post-half recovery' },
      { day: 'Mon', type: 'Easy', distanceMi: 5, pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Tue', type: 'Track', distanceMi: 7, pace: '-', notes: 'Club Track Session (Woking AC)' },
      { day: 'Tue', type: 'Easy', distanceMi: 4, pace: '7:14/mi', notes: 'PM easy shakeout' },
      { day: 'Wed', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Wed', type: 'Easy', distanceMi: 5, pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Thu', type: 'Marathon Pace', distanceMi: 13, pace: '5:46/mi MP', notes: '2mi w/up, 4mi @ 5:46, 1mi recovery, 4mi @ 5:46, 2mi c/down' },
      { day: 'Fri', type: 'Easy', distanceMi: 5, pace: '7:31/mi', notes: 'AM easy' },
      { day: 'Fri', type: 'Shakeout', distanceMi: 5, pace: '7:31/mi', notes: 'PM pre-race easy + strides' },
      { day: 'Sat', type: 'Easy', distanceMi: 1.5, pace: '7:31/mi', notes: 'Race warm-up jog + strides' },
      { day: 'Sat', type: 'Race', distanceMi: 6.2, pace: 'Race', notes: 'Kew 10K (target 32:00)' },
      { day: 'Sat', type: 'Easy', distanceMi: 1.5, pace: '7:31/mi', notes: 'Race cool-down jog' },
      { day: 'Sun', type: 'Long Run', distanceMi: 22, pace: 'Specific', notes: '4mi @ 6:58, 14mi @ 5:54-6:02 (92-95% MP), 4mi @ 6:26 — CRITICAL SESSION' },
    ]
  },
  {
    week: 6, startDate: '2026-03-30', phase: 'SPECIFIC',
    sessions: [
      { day: 'Mon', type: 'Recovery', distanceMi: 5, pace: '8:03/mi', notes: 'AM recovery after Sunday long run' },
      { day: 'Mon', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Tue', type: 'Track', distanceMi: 7, pace: '-', notes: 'Club Track Session (Woking AC) — last hard track' },
      { day: 'Tue', type: 'Easy', distanceMi: 5, pace: '7:14/mi', notes: 'PM easy shakeout' },
      { day: 'Wed', type: 'Rest', distanceMi: 0, pace: '-', notes: 'Rest day — absorb quality, prep for Thursday MP session' },
      { day: 'Thu', type: 'Marathon Pace', distanceMi: 14, pace: '5:46/mi MP', notes: '2mi w/up, 10mi @ 5:46 (MP), 2mi c/down — key session' },
      { day: 'Fri', type: 'Easy', distanceMi: 7, pace: '7:14/mi', notes: 'AM easy' },
      { day: 'Fri', type: 'Easy', distanceMi: 6, pace: '7:14/mi', notes: 'PM easy' },
      { day: 'Sat', type: 'Moderate', distanceMi: 11, pace: '6:34/mi', notes: 'Steady aerobic' },
      { day: 'Sun', type: 'Long Run', distanceMi: 20, pace: '6:02/mi', notes: '2mi w/up, 16mi @ 6:02 (95% MP), 2mi c/down — final quality long run' },
    ]
  },
  {
    week: 7, startDate: '2026-04-06', phase: 'TAPER',
    sessions: [
      { day: 'Mon', type: 'Easy', distanceMi: 6, pace: '7:23/mi', notes: 'AM easy' },
      { day: 'Mon', type: 'Easy', distanceMi: 5, pace: '7:23/mi', notes: 'PM easy' },
      { day: 'Tue', type: 'Track', distanceMi: 7, pace: '-', notes: 'Club Track Session (Woking AC) — reduced volume, keep sharp' },
      { day: 'Tue', type: 'Easy', distanceMi: 5, pace: '7:23/mi', notes: 'PM easy shakeout' },
      { day: 'Wed', type: 'Easy', distanceMi: 6, pace: '7:23/mi', notes: '' },
      { day: 'Thu', type: 'Marathon Pace', distanceMi: 10, pace: '5:46/mi MP', notes: '2mi w/up, 6mi @ MP (dress rehearsal), 2mi c/down' },
      { day: 'Fri', type: 'Easy', distanceMi: 6, pace: '7:23/mi', notes: 'AM easy' },
      { day: 'Fri', type: 'Easy', distanceMi: 5, pace: '7:23/mi', notes: 'PM easy' },
      { day: 'Sat', type: 'Easy + Strides', distanceMi: 8, pace: '7:23/mi', notes: '+ 6 x 100m strides' },
      { day: 'Sun', type: 'Long Run', distanceMi: 14, pace: '6:50-7:14/mi', notes: 'Relaxed, conversational — NOT a workout' },
    ]
  },
  {
    week: 8, startDate: '2026-04-13', phase: 'TAPER',
    sessions: [
      { day: 'Mon', type: 'Easy', distanceMi: 7, pace: '7:23/mi', notes: 'AM easy' },
      { day: 'Mon', type: 'Easy', distanceMi: 5, pace: '7:23/mi', notes: 'PM easy' },
      { day: 'Tue', type: 'Sharpener', distanceMi: 8, pace: '5:38-5:43/mi', notes: '2mi w/up, 6 x 1K @ 5:38-5:43 (90s jog), 2mi c/down — last quality' },
      { day: 'Wed', type: 'Rest', distanceMi: 0, pace: '-', notes: 'Rest day — taper week, save legs for Sutton 10K' },
      { day: 'Thu', type: 'Easy', distanceMi: 7, pace: '7:23/mi', notes: '' },
      { day: 'Fri', type: 'Shakeout', distanceMi: 5, pace: '7:31/mi', notes: '+ 4 x 100m strides' },
      { day: 'Sat', type: 'Easy', distanceMi: 4, pace: '7:31/mi', notes: 'Pre-race shakeout' },
      { day: 'Sun', type: 'Easy', distanceMi: 1, pace: '7:31/mi', notes: 'Race warm-up jog + strides' },
      { day: 'Sun', type: 'Race', distanceMi: 6.2, pace: 'Race', notes: 'Sutton 10K (target 32:00)' },
      { day: 'Sun', type: 'Easy', distanceMi: 1, pace: '7:31/mi', notes: 'Race cool-down jog' },
    ]
  },
  {
    week: 9, startDate: '2026-04-20', phase: 'RACE WEEK',
    sessions: [
      { day: 'Mon', type: 'Easy + Strides', distanceMi: 5, pace: '7:23/mi', notes: '+ 6 x 100m strides' },
      { day: 'Tue', type: 'Easy', distanceMi: 5, pace: '7:31/mi', notes: '' },
      { day: 'Wed', type: 'Easy', distanceMi: 4, pace: '7:31/mi', notes: '+ 4 x 20s pick-ups @ race pace' },
      { day: 'Thu', type: 'Shakeout', distanceMi: 3, pace: '7:31/mi', notes: 'Very easy shake-out' },
      { day: 'Fri', type: 'Shakeout', distanceMi: 2, pace: '8:03/mi', notes: '15 min easy + 4 x 20s pick-ups' },
      { day: 'Sat', type: 'Shakeout', distanceMi: 3, pace: '7:31/mi', notes: 'Pre-marathon shakeout + 4 x 100m strides' },
      { day: 'Sun', type: 'Race', distanceMi: 26.2, pace: '5:41/mi', notes: 'LONDON MARATHON — Target: Sub 2:30 (aim 2:29:30)' },
    ]
  },
];

const RACES = [
  { name: 'Surrey HM', date: '2026-03-22', distance: 'Half Marathon', distanceKm: 21.1, targetTime: '70:30', targetPace: '5:22/mi' },
  { name: 'Kew 10K', date: '2026-03-28', distance: '10K', distanceKm: 10, targetTime: '32:00', targetPace: '5:09/mi' },
  { name: 'Sutton 10K', date: '2026-04-19', distance: '10K', distanceKm: 10, targetTime: '32:00', targetPace: '5:09/mi' },
  { name: 'London Marathon', date: '2026-04-26', distance: 'Marathon', distanceKm: 42.2, targetTime: '2:29:30', targetPace: '5:41/mi' },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

export async function POST() {
  try {
    // Delete existing and re-seed
    await supabaseAdmin.from('training_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('race_targets').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const sessions = [];
    for (const week of PLAN) {
      for (const s of week.sessions) {
        const offset = DAY_OFFSETS[s.day] ?? 0;
        const date = addDays(week.startDate, offset);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dow = days[new Date(date + 'T12:00:00Z').getUTCDay()];

        sessions.push({
          date,
          day_of_week: dow,
          week_number: week.week,
          phase: week.phase,
          session_type: s.type,
          distance_miles: s.distanceMi > 0 ? s.distanceMi : null,
          distance_km: s.distanceMi > 0 ? s.distanceMi * 1.60934 : null,
          pace: s.pace,
          notes: s.notes,
          is_completed: false,
        });
      }
    }

    const { error: sessionsError } = await supabaseAdmin.from('training_sessions').insert(sessions);
    if (sessionsError) throw sessionsError;

    const raceTargets = RACES.map(r => ({
      race_name: r.name,
      race_date: r.date,
      distance: r.distance,
      distance_km: r.distanceKm,
      target_time: r.targetTime,
      target_pace: r.targetPace,
    }));

    const { error: racesError } = await supabaseAdmin.from('race_targets').insert(raceTargets);
    if (racesError) throw racesError;

    return NextResponse.json({
      success: true,
      sessionsInserted: sessions.length,
      racesInserted: raceTargets.length,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
