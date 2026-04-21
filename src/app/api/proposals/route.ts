import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function createNotification(type: string, title: string, message: string, taskId?: string) {
  await supabaseAdmin.from('notifications').insert({
    user_id: 'jamie',
    type,
    title,
    message,
    task_id: taskId ?? null,
    read: false,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const app = searchParams.get('app');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false });

    if (app && app !== 'all') query = query.eq('app', app);
    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title, description, reasoning, category, priority, status,
      created_by, order_index, app, commit_sha, shipped_at, feedback,
    } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (title.trim().length > 500) {
      return NextResponse.json({ error: 'Title too long' }, { status: 400 });
    }

    const insertStatus = status ?? 'request';

    const { data, error } = await supabaseAdmin
      .from('proposals')
      .insert({
        title: title.trim(),
        description: description?.trim() ?? null,
        reasoning: reasoning?.trim() ?? null,
        category: category ?? 'feature',
        priority: priority ?? 'medium',
        status: insertStatus,
        created_by: created_by ?? 'casper',
        order_index: order_index ?? 0,
        app: app ?? 'mission-control',
        commit_sha: commit_sha ?? null,
        shipped_at: insertStatus === 'shipped' ? (shipped_at ?? new Date().toISOString()) : null,
        feedback: feedback ?? null,
        reverted: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const sanitised: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (updates.title !== undefined) {
      const trimmed = String(updates.title).trim();
      if (!trimmed) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      if (trimmed.length > 500) return NextResponse.json({ error: 'Title too long' }, { status: 400 });
      sanitised.title = trimmed;
    }
    if (updates.description !== undefined) sanitised.description = updates.description?.trim() ?? null;
    if (updates.reasoning !== undefined) sanitised.reasoning = updates.reasoning?.trim() ?? null;
    if (updates.category !== undefined) sanitised.category = updates.category;
    if (updates.priority !== undefined) sanitised.priority = updates.priority;
    if (updates.status !== undefined) sanitised.status = updates.status;
    if (updates.created_by !== undefined) sanitised.created_by = updates.created_by;
    if (updates.order_index !== undefined) sanitised.order_index = updates.order_index;
    if (updates.task_id !== undefined) sanitised.task_id = updates.task_id;
    if (updates.app !== undefined) sanitised.app = updates.app;
    if (updates.feedback !== undefined) sanitised.feedback = updates.feedback?.trim() ?? null;
    if (updates.commit_sha !== undefined) sanitised.commit_sha = updates.commit_sha?.trim() ?? null;
    if (updates.reverted !== undefined) sanitised.reverted = updates.reverted;
    if (updates.shipped_at !== undefined) sanitised.shipped_at = updates.shipped_at;

    // Auto-set shipped_at when moving to 'shipped'
    if (updates.status === 'shipped' && existing.status !== 'shipped') {
      sanitised.shipped_at = new Date().toISOString();
    }

    // Auto-set reverted flag when moving to 'reverted'
    if (updates.status === 'reverted') {
      sanitised.reverted = true;
    }

    const { data, error } = await supabaseAdmin
      .from('proposals')
      .update(sanitised)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Side effects on status change
    if (updates.status && updates.status !== existing.status) {
      const newStatus = updates.status as string;
      const itemTitle = data.title as string;

      if (newStatus === 'shipped') {
        await createNotification(
          'changelog_shipped',
          'Item Shipped 🚀',
          `"${itemTitle}" has been shipped.`
        );
      } else if (newStatus === 'reverted') {
        await createNotification(
          'changelog_reverted',
          'Item Reverted ↩️',
          `"${itemTitle}" has been reverted.`
        );
      }
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // Delete comments first
    await supabaseAdmin.from('proposal_comments').delete().eq('proposal_id', id);

    const { error } = await supabaseAdmin.from('proposals').delete().eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
