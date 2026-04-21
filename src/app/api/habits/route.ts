import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/** Calculate current streak from sorted completed dates (consecutive days up to today) */
function computeCurrentStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;

  const completedSet = new Set(sortedDates);
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  const current = new Date();

  // If today not completed, start from yesterday
  if (!completedSet.has(today)) {
    current.setDate(current.getDate() - 1);
  }

  while (true) {
    const dateStr = current.toISOString().split('T')[0];
    if (!completedSet.has(dateStr)) break;
    streak++;
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

/** Calculate best ever streak from sorted completed dates */
function computeBestStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1] + 'T00:00:00');
    const curr = new Date(sortedDates[i] + 'T00:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      current++;
      if (current > best) best = current;
    } else if (diffDays > 1) {
      current = 1;
    }
    // diffDays === 0 means duplicate date — skip (shouldn't happen)
  }

  return best;
}

export async function GET() {
  // Fetch active habits
  const { data: habits, error: habitsError } = await supabaseAdmin
    .from('habits')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (habitsError) {
    return NextResponse.json({ error: habitsError.message }, { status: 500 });
  }

  if (!habits || habits.length === 0) {
    return NextResponse.json([]);
  }

  const habitIds = habits.map((h) => h.id);

  // Fetch last 7 days of completions for the grid UI
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const fromDate = sevenDaysAgo.toISOString().split('T')[0];

  const { data: recentCompletions, error: recentError } = await supabaseAdmin
    .from('habit_completions')
    .select('*')
    .in('habit_id', habitIds)
    .gte('completed_date', fromDate)
    .order('completed_date', { ascending: true });

  if (recentError) {
    return NextResponse.json({ error: recentError.message }, { status: 500 });
  }

  // Fetch ALL completions for analytics (streak, best streak, completion rate)
  const { data: allCompletions, error: allError } = await supabaseAdmin
    .from('habit_completions')
    .select('habit_id, completed_date')
    .in('habit_id', habitIds)
    .order('completed_date', { ascending: true });

  if (allError) {
    return NextResponse.json({ error: allError.message }, { status: 500 });
  }

  // Group all completions by habit
  const allByHabit = new Map<string, string[]>();
  for (const c of allCompletions || []) {
    if (!allByHabit.has(c.habit_id)) allByHabit.set(c.habit_id, []);
    allByHabit.get(c.habit_id)!.push(c.completed_date);
  }

  // Build result with stats attached
  const result = habits.map((habit) => {
    const dates = allByHabit.get(habit.id) || [];
    const totalCompletions = dates.length;
    const bestStreak = computeBestStreak(dates);
    const currentStreak = computeCurrentStreak(dates);

    // Completion rate: total completed / days since creation (capped at today)
    const createdAt = new Date(habit.created_at);
    const today = new Date();
    const daysSinceCreation = Math.max(
      1,
      Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const completionRate = Math.round((totalCompletions / daysSinceCreation) * 100);

    return {
      ...habit,
      completions: (recentCompletions || []).filter((c) => c.habit_id === habit.id),
      stats: {
        current_streak: currentStreak,
        best_streak: bestStreak,
        total_completions: totalCompletions,
        completion_rate: completionRate,
        days_since_creation: daysSinceCreation,
      },
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, icon, color, sort_order } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('habits')
    .insert({
      title,
      icon: icon || null,
      color: color || null,
      sort_order: sort_order ?? 0,
      active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ...data,
      completions: [],
      stats: {
        current_streak: 0,
        best_streak: 0,
        total_completions: 0,
        completion_rate: 0,
        days_since_creation: 1,
      },
    },
    { status: 201 }
  );
}
