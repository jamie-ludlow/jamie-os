import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { date } = body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Valid date (YYYY-MM-DD) required' }, { status: 400 });
  }

  // Check if completion exists
  const { data: existing } = await supabaseAdmin
    .from('habit_completions')
    .select('id')
    .eq('habit_id', id)
    .eq('completed_date', date)
    .maybeSingle();

  if (existing) {
    // Toggle off — delete the completion
    const { error } = await supabaseAdmin
      .from('habit_completions')
      .delete()
      .eq('id', existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ completed: false });
  } else {
    // Toggle on — insert completion
    const { error } = await supabaseAdmin
      .from('habit_completions')
      .insert({ habit_id: id, completed_date: date });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ completed: true });
  }
}
