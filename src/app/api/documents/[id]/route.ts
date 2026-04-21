import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.category !== undefined) updates.category = body.category;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('documents')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.category !== undefined) updates.category = body.category;
  if (body.path !== undefined) {
    updates.path = body.path;
    // Update category from new path
    updates.category = body.path.includes('/') ? body.path.split('/')[0] : 'general';
  }
  updates.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('documents')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get('permanent') === 'true';

  if (permanent) {
    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Soft delete
    const { error } = await supabaseAdmin
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Restore from trash
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (body.action === 'restore') {
    const { error } = await supabaseAdmin
      .from('documents')
      .update({ deleted_at: null })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
