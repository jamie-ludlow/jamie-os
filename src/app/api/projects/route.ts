import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

export async function GET() {
  // Get projects with task counts
  const { data: projects, error: pErr } = await supabaseAdmin
    .from('projects')
    .select('*')
    .order('name');

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // Get task counts per project
  const { data: counts, error: cErr } = await supabaseAdmin
    .from('tasks')
    .select('project_id, status, assignee');

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const countMap: Record<string, number> = {};
  const doneMap: Record<string, number> = {};
  const todoMap: Record<string, number> = {};
  const doingMap: Record<string, number> = {};
  const assigneeMap: Record<string, Set<string>> = {};
  for (const t of counts || []) {
    if (t.project_id) {
      const rec = t as Record<string, unknown>;
      countMap[t.project_id] = (countMap[t.project_id] || 0) + 1;
      if (rec.status === 'done') {
        doneMap[t.project_id] = (doneMap[t.project_id] || 0) + 1;
      }
      if (rec.status === 'backlog' || rec.status === 'todo') {
        todoMap[t.project_id] = (todoMap[t.project_id] || 0) + 1;
      }
      if (rec.status === 'doing') {
        doingMap[t.project_id] = (doingMap[t.project_id] || 0) + 1;
        if (rec.assignee) {
          if (!assigneeMap[t.project_id]) assigneeMap[t.project_id] = new Set();
          assigneeMap[t.project_id].add(rec.assignee as string);
        }
      }
    }
  }

  const result = (projects || []).map(p => ({
    ...p,
    task_count: countMap[p.id] || 0,
    done_count: doneMap[p.id] || 0,
    todo_count: todoMap[p.id] || 0,
    doing_count: doingMap[p.id] || 0,
    active_agents: assigneeMap[p.id] ? Array.from(assigneeMap[p.id]) : [],
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const insert: Record<string, unknown> = {
    name: body.name,
    color: body.color || 'rgb(99, 102, 241)',
  };
  if (body.id) insert.id = body.id;

  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity({
    action: 'project_created',
    description: `Project created: ${data.name}`,
    agent: body.agent || 'casper',
    metadata: { project_id: data.id, colour: data.color },
  });
  return NextResponse.json(data, { status: 201 });
}
