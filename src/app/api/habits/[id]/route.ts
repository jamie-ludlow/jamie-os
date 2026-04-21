import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { title, icon, color, sort_order, active } = body;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (icon !== undefined) updates.icon = icon;
  if (color !== undefined) updates.color = color;
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (active !== undefined) updates.active = active;

  const { data, error } = await supabaseAdmin
    .from('habits')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Delete all completion records first
  const { error: completionsError } = await supabaseAdmin
    .from('habit_completions')
    .delete()
    .eq('habit_id', id);

  if (completionsError) {
    return NextResponse.json({ error: completionsError.message }, { status: 500 });
  }

  // Hard delete the habit
  const { error: habitError } = await supabaseAdmin
    .from('habits')
    .delete()
    .eq('id', id);

  if (habitError) {
    return NextResponse.json({ error: habitError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
