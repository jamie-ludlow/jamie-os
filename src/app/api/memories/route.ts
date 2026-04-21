import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42P01') return true;
  const message = error.message?.toLowerCase() ?? '';
  return message.includes('relation') && message.includes('does not exist');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  let query = supabaseAdmin
    .from('memories')
    .select('*')
    .order('created_at', { ascending: false });

  if (category && category !== 'all') query = query.eq('category', category);

  const { data, error } = await query;

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, category, tags } = body;

  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const tagList = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
      : [];

  const insert: Record<string, unknown> = {
    title,
    description: description || null,
    category: category || 'idea',
    tags: tagList,
  };
  if (body.id) insert.id = body.id;

  const { data, error } = await supabaseAdmin
    .from('memories')
    .insert(insert)
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: 'memories table not found' }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
