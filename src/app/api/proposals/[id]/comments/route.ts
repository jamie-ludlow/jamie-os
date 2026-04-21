import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('proposal_comments')
      .select('*')
      .eq('proposal_id', id)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, author } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.trim().length > 5000) {
      return NextResponse.json({ error: 'Comment too long' }, { status: 400 });
    }

    const allowedAuthors = ['casper', 'jamie'];
    const safeAuthor = allowedAuthors.includes(author) ? author : 'casper';

    // Verify proposal exists
    const { data: proposal, error: proposalErr } = await supabaseAdmin
      .from('proposals')
      .select('id')
      .eq('id', id)
      .single();

    if (proposalErr || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('proposal_comments')
      .insert({
        proposal_id: id,
        content: content.trim(),
        author: safeAuthor,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
