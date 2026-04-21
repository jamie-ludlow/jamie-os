import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id, path, title, category, deleted_at, created_at, updated_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
