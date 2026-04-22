import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface CleanupRequest {
  agent_id: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CleanupRequest = await req.json();
    const { agent_id } = body;

    if (!agent_id) {
      return NextResponse.json(
        { error: 'Missing required field: agent_id' },
        { status: 400 }
      );
    }

    // 1. Get all "started" entries for this agent
    const { data: startedEntries, error: startedError } = await supabaseAdmin
      .from('agent_flow_log')
      .select('id, task_title, agent_id, created_at')
      .eq('agent_id', agent_id)
      .eq('action', 'started')
      .order('created_at', { ascending: false });

    if (startedError) {
      return NextResponse.json(
        { error: 'Failed to fetch started entries', details: startedError.message },
        { status: 500 }
      );
    }

    if (!startedEntries || startedEntries.length === 0) {
      return NextResponse.json({ closed: 0 }, { status: 200 });
    }

    // 2. Get all "completed" entries for this agent
    const { data: completedEntries, error: completedError } = await supabaseAdmin
      .from('agent_flow_log')
      .select('task_title, agent_id, created_at')
      .eq('agent_id', agent_id)
      .eq('action', 'completed')
      .order('created_at', { ascending: false });

    if (completedError) {
      return NextResponse.json(
        { error: 'Failed to fetch completed entries', details: completedError.message },
        { status: 500 }
      );
    }

    // 3. Find stale entries (started without matching completed)
    const staleEntries = startedEntries.filter((started) => {
      // Check if there's a completed entry with the same task_title and agent_id
      // that was created after this started entry
      const hasMatchingCompleted = completedEntries?.some(
        (completed) =>
          completed.task_title === started.task_title &&
          completed.agent_id === started.agent_id &&
          new Date(completed.created_at) > new Date(started.created_at)
      );
      return !hasMatchingCompleted;
    });

    if (staleEntries.length === 0) {
      return NextResponse.json({ closed: 0 }, { status: 200 });
    }

    // 4. Insert "completed" entries for each stale entry
    const completionEntries = staleEntries.map((entry) => ({
      agent_id: entry.agent_id,
      task_title: entry.task_title,
      action: 'completed',
      details: 'Auto-closed: agent went idle',
    }));

    const { error: insertError } = await supabaseAdmin
      .from('agent_flow_log')
      .insert(completionEntries);

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to insert completion entries', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ closed: staleEntries.length }, { status: 200 });
  } catch (err) {
    console.error('Cleanup error:', err);
    return NextResponse.json(
      { error: 'Failed to clean up flow log entries', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
