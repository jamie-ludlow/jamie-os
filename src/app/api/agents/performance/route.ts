import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface FlowLogEntry {
  agent_id: string;
  action: string;
  task_title: string;
  created_at: string;
}

interface AgentMetrics {
  id: string;
  name: string;
  emoji: string;
  tasksCompleted: number;
  qaApprovalRate: number | null;
  qaRejections: number;
  avgDurationMs: number | null;
}

export async function GET(request: Request) {
  try {
    const { data: flowLogs, error: flowError } = await supabaseAdmin
      .from('agent_flow_log')
      .select('agent_id, action, task_title, created_at')
      .order('created_at', { ascending: true });

    if (flowError) {
      return NextResponse.json({ error: flowError.message }, { status: 500 });
    }

    // Fetch agent metadata
    const { data: agentStatuses, error: statusError } = await supabaseAdmin
      .from('agent_status')
      .select('id, name, emoji');

    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 500 });
    }

    // Build agent metadata map
    const agentMap = new Map<string, { name: string; emoji: string }>();
    (agentStatuses || []).forEach((agent) => {
      agentMap.set(agent.id, { name: agent.name, emoji: agent.emoji });
    });

    // Calculate metrics per agent
    const metricsMap = new Map<string, {
      completed: number;
      qaApproved: number;
      qaRejections: number;
      taskDurations: number[];
      taskStarts: Map<string, number>;
    }>();

    (flowLogs || []).forEach((log: FlowLogEntry) => {
      if (!metricsMap.has(log.agent_id)) {
        metricsMap.set(log.agent_id, {
          completed: 0,
          qaApproved: 0,
          qaRejections: 0,
          taskDurations: [],
          taskStarts: new Map(),
        });
      }

      const metrics = metricsMap.get(log.agent_id)!;
      const taskKey = `${log.agent_id}-${log.task_title}`;

      switch (log.action) {
        case 'started':
          metrics.taskStarts.set(taskKey, new Date(log.created_at).getTime());
          break;
        case 'completed':
          metrics.completed++;
          const startTime = metrics.taskStarts.get(taskKey);
          if (startTime) {
            const duration = new Date(log.created_at).getTime() - startTime;
            metrics.taskDurations.push(duration);
            metrics.taskStarts.delete(taskKey);
          }
          break;
        case 'qa_approved':
          metrics.qaApproved++;
          break;
        case 'qa_rejected':
          metrics.qaRejections++;
          break;
      }
    });

    // Build final metrics array
    const agents: AgentMetrics[] = Array.from(metricsMap.entries())
      .map(([agentId, metrics]) => {
        const metadata = agentMap.get(agentId);
        const qaTotal = metrics.qaApproved + metrics.qaRejections;
        const avgDuration = metrics.taskDurations.length > 0
          ? metrics.taskDurations.reduce((sum, d) => sum + d, 0) / metrics.taskDurations.length
          : null;

        return {
          id: agentId,
          name: metadata?.name || agentId,
          emoji: metadata?.emoji || '🤖',
          tasksCompleted: metrics.completed,
          qaApprovalRate: qaTotal > 0 ? (metrics.qaApproved / qaTotal) * 100 : null,
          qaRejections: metrics.qaRejections,
          avgDurationMs: avgDuration,
        };
      })
      .sort((a, b) => b.tasksCompleted - a.tasksCompleted);

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
