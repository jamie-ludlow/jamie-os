import { NextRequest, NextResponse } from 'next/server';
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

interface AgentMatch {
  agentId: string;
  agentName: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/** Keyword → agent mapping, evaluated in order (first match wins) */
const ROUTING_RULES: Array<{
  agentId: string;
  agentName: string;
  keywords: string[];
  reason: string;
}> = [
  {
    agentId: 'ui-designer',
    agentName: 'UI/UX Designer',
    keywords: [
      'design', 'ui', 'ux', 'layout', 'visual', 'style', 'colour', 'color',
      'theme', 'component', 'icon', 'typography', 'spacing', 'figma', 'mockup',
      'wireframe', 'responsive', 'mobile', 'accessibility', 'animation',
    ],
    reason: 'Task involves UI/design work',
  },
  {
    agentId: 'developer',
    agentName: 'Developer',
    keywords: [
      'bug', 'fix', 'implement', 'build', 'code', 'api', 'route', 'endpoint',
      'database', 'migration', 'function', 'error', 'crash', 'deploy',
      'refactor', 'performance', 'integration', 'hook', 'component', 'test',
      'typescript', 'supabase', 'next', 'backend', 'frontend', 'feature',
    ],
    reason: 'Task involves software development',
  },
  {
    agentId: 'copywriter',
    agentName: 'Copywriter',
    keywords: [
      'copy', 'content', 'write', 'writing', 'text', 'docs', 'documentation',
      'sop', 'guide', 'article', 'blog', 'email', 'newsletter', 'social',
      'description', 'script', 'draft', 'edit', 'proofread', 'tone',
    ],
    reason: 'Task involves content or copy writing',
  },
  {
    agentId: 'analyst',
    agentName: 'Analyst',
    keywords: [
      'research', 'analyse', 'analyze', 'data', 'report', 'insight', 'metric',
      'kpi', 'trend', 'competitive', 'market', 'survey', 'audit', 'review',
      'investigate', 'compare', 'benchmark',
    ],
    reason: 'Task involves research or data analysis',
  },
  {
    agentId: 'qa-tester',
    agentName: 'QA Tester',
    keywords: [
      'qa', 'quality', 'test', 'testing', 'validate', 'verify', 'regression',
      'check', 'review', 'pass', 'fail', 'acceptance',
    ],
    reason: 'Task involves quality assurance or testing',
  },
];

function matchAgent(text: string): AgentMatch {
  const lower = text.toLowerCase();

  for (const rule of ROUTING_RULES) {
    const matched = rule.keywords.filter((kw) => lower.includes(kw));
    if (matched.length >= 2) {
      return {
        agentId: rule.agentId,
        agentName: rule.agentName,
        confidence: 'high',
        reason: `${rule.reason} (matched: ${matched.slice(0, 3).join(', ')})`,
      };
    }
    if (matched.length === 1) {
      // Keep going — prefer higher-confidence match, but record this one
      return {
        agentId: rule.agentId,
        agentName: rule.agentName,
        confidence: 'medium',
        reason: `${rule.reason} (matched: ${matched[0]})`,
      };
    }
  }

  // Default fallback → developer
  return {
    agentId: 'developer',
    agentName: 'Developer',
    confidence: 'low',
    reason: 'No strong keyword match — defaulting to Developer',
  };
}

export async function POST(request: NextRequest) {
  let body: { task_id?: string; assign?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { task_id, assign = false } = body;

  if (!task_id) {
    return NextResponse.json({ error: 'task_id is required' }, { status: 400 });
  }

  // Look up the task
  const { data: task, error: taskError } = await supabaseAdmin
    .from('tasks')
    .select('id, title, description, labels, pipeline_stage')
    .eq('id', task_id)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Build searchable text from title + description + labels
  const labelText = Array.isArray(task.labels) ? task.labels.join(' ') : '';
  const searchText = [task.title, task.description ?? '', labelText].join(' ');

  const recommendation = matchAgent(searchText);

  // Optionally persist the assignment and advance pipeline stage
  if (assign) {
    const newStage: PipelineStage = 'assigned';
    const { error: updateError } = await supabaseAdmin
      .from('tasks')
      .update({
        assignee: recommendation.agentId,
        pipeline_stage: newStage,
      })
      .eq('id', task_id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update task', details: updateError.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    task_id,
    task_title: task.title,
    recommendation,
    current_pipeline_stage: assign ? 'assigned' : (task.pipeline_stage ?? null),
    assigned: assign,
  });
}
