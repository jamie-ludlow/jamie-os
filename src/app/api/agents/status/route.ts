import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('agent_status')
    .select('*')
    .order('status', { ascending: true }) // active < idle < offline alphabetically works
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Custom sort: active first, then idle, then offline
  const order: Record<string, number> = { active: 0, idle: 1, offline: 2 };
  const sorted = (data || []).sort((a, b) => {
    const diff = (order[a.status] ?? 2) - (order[b.status] ?? 2);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json(sorted);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const allowedFields = ['status', 'current_task', 'current_session_key', 'last_active_at'];
  const filtered: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) filtered[key] = updates[key];
  }
  filtered.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('agent_status')
    .update(filtered)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
