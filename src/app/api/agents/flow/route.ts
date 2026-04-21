import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskTitle = searchParams.get('task');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  // If specific task requested, get its flow
  if (taskTitle) {
    const { data, error } = await supabaseAdmin
      .from('agent_flow_log')
      .select('*')
      .eq('task_title', taskTitle)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ flow: data || [] });
  }

  // Otherwise return unique task titles (request history)
  const { data, error } = await supabaseAdmin
    .from('agent_flow_log')
    .select('task_title, created_at, action, agent_id')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by task_title to get unique requests with metadata
  const taskMap = new Map<string, { title: string; startedAt: string; agents: Set<string>; actions: string[]; status: string }>();
  
  for (const row of (data || [])) {
    if (!taskMap.has(row.task_title)) {
      taskMap.set(row.task_title, {
        title: row.task_title,
        startedAt: row.created_at,
        agents: new Set(),
        actions: [],
        status: 'in_progress',
      });
    }
    const entry = taskMap.get(row.task_title)!;
    entry.agents.add(row.agent_id);
    entry.actions.push(row.action);
    // Update started time to earliest
    if (row.created_at < entry.startedAt) entry.startedAt = row.created_at;
    // Determine final status
    if (row.action === 'qa_approved') entry.status = 'approved';
    if (row.action === 'qa_rejected') entry.status = 'rejected';
    if (row.action === 'completed' && entry.status !== 'approved' && entry.status !== 'rejected') entry.status = 'completed';
  }

  const requests = Array.from(taskMap.values())
    .map((r) => ({
      title: r.title,
      startedAt: r.startedAt,
      agents: Array.from(r.agents),
      actionCount: r.actions.length,
      status: r.status,
      hadRejections: r.actions.includes('qa_rejected'),
    }))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { task_id, task_title, agent_id, action, details } = body;

  if (!agent_id || !action) {
    return NextResponse.json({ error: 'agent_id and action required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('agent_flow_log')
    .insert({
      task_id: task_id || null,
      task_title: task_title || 'Unknown task',
      agent_id,
      action,
      details: details || null,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
