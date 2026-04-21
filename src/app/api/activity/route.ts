import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent');
  const action = searchParams.get('action');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = Number(searchParams.get('limit') || 100);
  const offset = Number(searchParams.get('offset') || 0);

  let query = supabaseAdmin
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false });

  const safeLimit = Number.isNaN(limit) ? 100 : limit;
  const safeOffset = Number.isNaN(offset) ? 0 : offset;
  query = query.range(safeOffset, safeOffset + safeLimit - 1);

  if (agent && agent !== 'all') query = query.eq('agent', agent);
  if (action && action !== 'all') query = query.eq('action', action);
  if (from) {
    const fromValue = from.length === 10 ? `${from}T00:00:00` : from;
    query = query.gte('created_at', new Date(fromValue).toISOString());
  }
  if (to) {
    const toValue = to.length === 10 ? `${to}T23:59:59` : to;
    query = query.lte('created_at', new Date(toValue).toISOString());
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
