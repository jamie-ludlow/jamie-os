import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

type PaperclipTaskPayload = {
  external_id?: string;
  id?: string;
  title?: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  assignee?: string | null;
  project_id?: string | null;
  parent_id?: string | null;
  due_date?: string | null;
  start_date?: string | null;
  labels?: string[];
  url?: string | null;
  external_url?: string | null;
  updated_at?: string | null;
  external_updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
  external_metadata?: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getSharedSecret() {
  return process.env.PAPERCLIP_SYNC_SECRET || null;
}

type ExistingExternalTask = {
  id: string;
  external_id: string;
  status: string | null;
  priority: string | null;
  assignee: string | null;
  project_id: string | null;
  parent_id: string | null;
  due_date: string | null;
  start_date: string | null;
  labels: string[] | null;
};

function toUpsertRow(task: PaperclipTaskPayload, existing?: ExistingExternalTask) {
  const externalId = task.external_id || task.id;
  const title = task.title?.trim();

  if (!externalId) {
    return { error: 'external_id is required' } as const;
  }

  if (!title) {
    return { error: 'title is required' } as const;
  }

  if (title.length > 500) {
    return { error: 'title too long' } as const;
  }

  const description = task.description ?? null;
  if (typeof description === 'string' && description.length > 50000) {
    return { error: 'description too long' } as const;
  }

  return {
    row: {
      title,
      description,
      status: task.status ?? existing?.status ?? 'todo',
      priority: task.priority ?? existing?.priority ?? null,
      assignee: task.assignee ?? existing?.assignee ?? null,
      project_id: task.project_id ?? existing?.project_id ?? null,
      parent_id: task.parent_id ?? existing?.parent_id ?? null,
      due_date: task.due_date ?? existing?.due_date ?? null,
      start_date: task.start_date ?? existing?.start_date ?? null,
      labels: Array.isArray(task.labels) ? task.labels : (existing?.labels ?? []),
      external_source: 'paperclip',
      external_id: externalId,
      external_url: task.external_url || task.url || null,
      external_metadata:
        (isRecord(task.external_metadata) ? task.external_metadata : null) ||
        (isRecord(task.metadata) ? task.metadata : {}) ||
        {},
      external_updated_at: task.external_updated_at || task.updated_at || null,
      updated_at: new Date().toISOString(),
    },
  } as const;
}

export async function POST(request: NextRequest) {
  const expectedSecret = getSharedSecret();
  if (!expectedSecret) {
    return NextResponse.json({ error: 'Sync secret not configured' }, { status: 500 });
  }

  const providedSecret = request.headers.get('x-paperclip-secret');
  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = isRecord(body) ? body : {};
  const rawTasks = Array.isArray(payload.tasks)
    ? payload.tasks
    : payload.task
      ? [payload.task]
      : [payload];

  if (rawTasks.length === 0) {
    return NextResponse.json({ error: 'No tasks provided' }, { status: 400 });
  }

  const normalizedTasks: PaperclipTaskPayload[] = [];
  const externalIds: string[] = [];

  for (const rawTask of rawTasks) {
    if (!isRecord(rawTask)) {
      return NextResponse.json({ error: 'Each task must be an object' }, { status: 400 });
    }

    const task = rawTask as PaperclipTaskPayload;
    const externalId = task.external_id || task.id;
    if (!externalId) {
      return NextResponse.json({ error: 'external_id is required' }, { status: 400 });
    }

    normalizedTasks.push(task);
    externalIds.push(externalId);
  }

  const { data: existingTasks, error: existingError } = await supabaseAdmin
    .from('tasks')
    .select('id, external_id, status, priority, assignee, project_id, parent_id, due_date, start_date, labels')
    .eq('external_source', 'paperclip')
    .in('external_id', externalIds);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existingByExternalId = new Map(
    (existingTasks || []).map((task) => [task.external_id, task as ExistingExternalTask])
  );

  const rows: Record<string, unknown>[] = [];
  for (const task of normalizedTasks) {
    const existing = existingByExternalId.get(task.external_id || task.id || '');
    const prepared = toUpsertRow(task, existing);
    if ('error' in prepared) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }

    rows.push(prepared.row);
  }

  const existingIdsByExternalId = new Map(
    (existingTasks || []).map((task) => [task.external_id, task.id])
  );

  const rowsWithIds = rows.map((row) => {
    const externalId = String(row.external_id || '');
    const existingId = existingIdsByExternalId.get(externalId);
    return existingId ? { ...row, id: existingId } : row;
  });

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .upsert(rowsWithIds)
    .select('id, title, external_source, external_id, status');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    action: 'tasks_synced',
    description: `Synced ${rows.length} Paperclip task${rows.length === 1 ? '' : 's'} into Mission Control`,
    agent: 'paperclip',
    metadata: {
      source: 'paperclip',
      synced_count: rows.length,
      task_ids: (data || []).map((task) => task.id),
    },
  });

  return NextResponse.json({
    success: true,
    source: 'paperclip',
    count: data?.length || 0,
    tasks: data || [],
  });
}
