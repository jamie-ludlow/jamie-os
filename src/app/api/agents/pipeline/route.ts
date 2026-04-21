import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// SQL migration (run once in Supabase SQL editor):
//
// ALTER TABLE tasks
//   ADD COLUMN IF NOT EXISTS pipeline_stage TEXT
//     CHECK (pipeline_stage IN ('manager-review','assigned','in-progress','qa-review','approved','rejected'))
//     DEFAULT NULL;
//
// CREATE INDEX IF NOT EXISTS idx_tasks_pipeline_stage ON tasks(pipeline_stage);

type PipelineStage =
  | 'manager-review'
  | 'assigned'
  | 'in-progress'
  | 'qa-review'
  | 'approved'
  | 'rejected';

const PIPELINE_STAGES: PipelineStage[] = [
  'manager-review',
  'assigned',
  'in-progress',
  'qa-review',
  'approved',
  'rejected',
];

interface PipelineTask {
  id: string;
  title: string;
  assignee: string | null;
  priority: string | null;
  pipeline_stage: PipelineStage | null;
}

interface PipelineStageData {
  stage: PipelineStage;
  label: string;
  count: number;
  tasks: PipelineTask[];
}

interface PipelineResponse {
  stages: PipelineStageData[];
  untracked_count: number;
  total_pipeline_count: number;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  'manager-review': 'Manager Review',
  assigned: 'Assigned',
  'in-progress': 'In Progress',
  'qa-review': 'QA Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export async function GET() {
  // Fetch all tasks that have a pipeline_stage set
  const { data: pipelineTasks, error: pipelineError } = await supabaseAdmin
    .from('tasks')
    .select('id, title, assignee, priority, pipeline_stage')
    .not('pipeline_stage', 'is', null)
    .order('updated_at', { ascending: false });

  if (pipelineError) {
    return NextResponse.json(
      { error: 'Failed to fetch pipeline tasks', details: pipelineError.message },
      { status: 500 },
    );
  }

  // Count tasks without a pipeline_stage (untracked)
  const { count: untrackedCount, error: untrackedError } = await supabaseAdmin
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .is('pipeline_stage', null);

  if (untrackedError) {
    return NextResponse.json(
      { error: 'Failed to count untracked tasks', details: untrackedError.message },
      { status: 500 },
    );
  }

  // Group by stage
  const tasksByStage: Record<string, PipelineTask[]> = {};
  for (const stage of PIPELINE_STAGES) {
    tasksByStage[stage] = [];
  }

  for (const task of pipelineTasks ?? []) {
    const stage = task.pipeline_stage as PipelineStage;
    if (tasksByStage[stage]) {
      tasksByStage[stage].push(task as PipelineTask);
    }
  }

  const stages: PipelineStageData[] = PIPELINE_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: tasksByStage[stage].length,
    tasks: tasksByStage[stage],
  }));

  const totalPipelineCount = (pipelineTasks ?? []).length;

  const response: PipelineResponse = {
    stages,
    untracked_count: untrackedCount ?? 0,
    total_pipeline_count: totalPipelineCount,
  };

  return NextResponse.json(response);
}
