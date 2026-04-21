import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, type, title, message, task_id } = body;

    if (!user_id || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if a similar notification already exists to avoid duplicates
    const { data: existing } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('user_id', user_id)
      .eq('type', type)
      .eq('task_id', task_id)
      .eq('read', false)
      .limit(1);

    if (existing && existing.length > 0) {
      // Notification already exists, don't create duplicate
      return NextResponse.json({ message: 'Notification already exists' });
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        message,
        task_id: task_id || null,
        read: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
