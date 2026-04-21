import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = supabaseAdmin;
  
  const { data, error } = await supabase
    .from('changelog')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = supabaseAdmin;
  const body = await request.json();

  const { data, error } = await supabase
    .from('changelog')
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const supabase = supabaseAdmin;
  const body = await request.json();
  const { id, reverted, changeIndex } = body;

  if (changeIndex !== undefined) {
    // Toggle individual change
    const { data: entry, error: fetchError } = await supabase
      .from('changelog')
      .select('changes')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const changes = entry.changes;
    if (changeIndex >= 0 && changeIndex < changes.length) {
      changes[changeIndex].reverted = reverted;

      const { data, error } = await supabase
        .from('changelog')
        .update({ changes })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    } else {
      return NextResponse.json({ error: 'Invalid changeIndex' }, { status: 400 });
    }
  } else {
    // Revert all changes in the release
    const { data: entry, error: fetchError } = await supabase
      .from('changelog')
      .select('changes')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const changes = entry.changes.map((c: any) => ({ ...c, reverted }));

    const { data, error } = await supabase
      .from('changelog')
      .update({ changes })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }
}
