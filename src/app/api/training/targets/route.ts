import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('race_targets')
      .select('*')
      .order('race_date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ targets: data || [] });
  } catch (error) {
    console.error('Get targets error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, target_time, target_pace, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Race target ID required' }, { status: 400 });
    }

    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (target_time !== undefined) updates.target_time = target_time;
    if (target_pace !== undefined) updates.target_pace = target_pace;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabaseAdmin
      .from('race_targets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ target: data });
  } catch (error) {
    console.error('Update target error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
