import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { startOfWeek, endOfWeek, format, parseISO, isAfter, isBefore } from 'date-fns';

interface TrainingSession {
  id: string;
  date: string;
  week_number: number;
  session_type: string;
  distance_km: number;
  is_completed: boolean;
  actual_distance_km: number | null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trigger = 'manual', week_number } = body;

    // Get current week if not specified
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    // Fetch sessions for the week
    let query = supabaseAdmin
      .from('training_sessions')
      .select('*')
      .order('date', { ascending: true });

    if (week_number) {
      query = query.eq('week_number', week_number);
    } else {
      query = query
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'));
    }

    const { data: sessions, error } = await query;

    if (error) throw error;
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ message: 'No sessions found for adjustment' });
    }

    // Calculate volume
    const plannedVolume = sessions.reduce((sum, s) => sum + (s.distance_km || 0), 0);
    const completedSessions = sessions.filter(s => s.is_completed);
    const actualVolume = completedSessions.reduce((sum, s) => sum + (s.actual_distance_km || 0), 0);

    const completionRate = plannedVolume > 0 ? actualVolume / plannedVolume : 0;

    // Get remaining sessions (future + today)
    const todayStr = format(today, 'yyyy-MM-dd');
    const remainingSessions = sessions.filter(s => 
      !s.is_completed && (s.date >= todayStr)
    );

    if (remainingSessions.length === 0) {
      return NextResponse.json({ 
        message: 'No remaining sessions to adjust',
        completionRate,
        plannedVolume,
        actualVolume
      });
    }

    const adjustments: string[] = [];
    const sessionsAffected: string[] = [];

    // Rule-based adjustments
    const todayDate = parseISO(todayStr);
    const midweek = parseISO(format(new Date(weekStart.getTime() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));

    // If <60% volume done by mid-week → slight increase on Fri/Sat
    if (completionRate < 0.6 && isAfter(todayDate, midweek)) {
      for (const session of remainingSessions) {
        const sessionDate = parseISO(session.date);
        const dayOfWeek = sessionDate.getDay();
        
        // Friday (5) or Saturday (6) — add 1-2km
        if ((dayOfWeek === 5 || dayOfWeek === 6) && 
            session.session_type !== 'Rest' && 
            session.session_type !== 'Race' &&
            session.distance_km > 0) {
          
          const increase = Math.min(3, session.distance_km * 0.15); // Max 15% increase or 3km
          const newDistanceKm = session.distance_km + increase;
          const newDistanceMiles = newDistanceKm / 1.60934;

          await supabaseAdmin
            .from('training_sessions')
            .update({
              distance_km: newDistanceKm,
              distance_miles: newDistanceMiles,
              edited_by: 'ai-adjust',
              adjustment_reason: `Volume catch-up: +${increase.toFixed(1)}km (weekly volume ${(completionRate * 100).toFixed(0)}%)`,
              edited_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id);

          adjustments.push(`${session.session_type} on ${session.date}: +${increase.toFixed(1)}km`);
          sessionsAffected.push(session.id);
        }
      }
    }

    // If >120% volume → reduce next easy day slightly
    if (completionRate > 1.2) {
      const nextEasySession = remainingSessions.find(s => 
        s.session_type === 'Easy' || s.session_type === 'Recovery'
      );

      if (nextEasySession && nextEasySession.distance_km > 5) {
        const reduction = Math.min(3, nextEasySession.distance_km * 0.2); // Max 20% reduction or 3km
        const newDistanceKm = nextEasySession.distance_km - reduction;
        const newDistanceMiles = newDistanceKm / 1.60934;

        await supabaseAdmin
          .from('training_sessions')
          .update({
            distance_km: newDistanceKm,
            distance_miles: newDistanceMiles,
            edited_by: 'ai-adjust',
            adjustment_reason: `Volume reduction: -${reduction.toFixed(1)}km (weekly volume ${(completionRate * 100).toFixed(0)}%)`,
            edited_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', nextEasySession.id);

        adjustments.push(`${nextEasySession.session_type} on ${nextEasySession.date}: -${reduction.toFixed(1)}km`);
        sessionsAffected.push(nextEasySession.id);
      }
    }

    // Log adjustment
    if (adjustments.length > 0) {
      await supabaseAdmin
        .from('training_adjustments')
        .insert({
          week_number: sessions[0].week_number,
          trigger,
          summary: `Adjusted ${adjustments.length} session(s) based on ${(completionRate * 100).toFixed(0)}% weekly volume completion`,
          sessions_affected: sessionsAffected
        });
    }

    return NextResponse.json({
      success: true,
      adjustmentsMade: adjustments.length,
      adjustments,
      completionRate: (completionRate * 100).toFixed(1) + '%',
      plannedVolume: plannedVolume.toFixed(1) + 'km',
      actualVolume: actualVolume.toFixed(1) + 'km'
    });

  } catch (error) {
    console.error('Adjust error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
