import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { toDisplayName } from '@/lib/constants';

interface MeetingRequest {
  type: 'standup' | 'debrief';
}

interface AgentUpdate {
  agentId: string;
  name: string;
  emoji: string;
  status: string;
  currentTask: string | null;
  tasks: Array<{ title: string; status: string }>;
  flowEntries: Array<{ action: string; details: string | null; created_at: string }>;
}

export async function POST(req: NextRequest) {
  // API key auth
  const apiKey = req.headers.get('x-api-key');
  const expectedKey = process.env.MC_API_KEY;

  if (!expectedKey) {
    return NextResponse.json(
      { error: 'MC_API_KEY not configured' },
      { status: 500 }
    );
  }

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body: MeetingRequest = await req.json();
    const { type } = body;

    if (!type || (type !== 'standup' && type !== 'debrief')) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "standup" or "debrief"' },
        { status: 400 }
      );
    }

    // 1. Get all agents
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from('agent_status')
      .select('*')
      .order('name', { ascending: true });

    if (agentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch agents', details: agentsError.message },
        { status: 500 }
      );
    }

    // 2. Get tasks based on meeting type
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let tasksQuery = supabaseAdmin.from('tasks').select('id, title, status, assignee, completed_at');
    
    if (type === 'standup') {
      // Standup: tasks in doing + todo status (what's planned)
      tasksQuery = tasksQuery.in('status', ['doing', 'todo']);
    } else {
      // Debrief: tasks moved to done today + still in doing (what happened)
      tasksQuery = tasksQuery.or(
        `and(status.eq.done,completed_at.gte.${todayStart.toISOString()}),status.eq.doing`
      );
    }

    const { data: tasks, error: tasksError } = await tasksQuery;

    if (tasksError) {
      return NextResponse.json(
        { error: 'Failed to fetch tasks', details: tasksError.message },
        { status: 500 }
      );
    }

    // 3. Get recent flow log entries
    const hoursBack = type === 'standup' ? 12 : 24;
    const sinceTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
    
    const { data: flowLogs, error: flowError } = await supabaseAdmin
      .from('agent_flow_log')
      .select('agent_id, action, details, created_at')
      .gte('created_at', sinceTime.toISOString())
      .order('created_at', { ascending: false });

    if (flowError) {
      return NextResponse.json(
        { error: 'Failed to fetch flow logs', details: flowError.message },
        { status: 500 }
      );
    }

    // 4. Build agent updates
    const agentUpdates: AgentUpdate[] = agents.map((agent) => {
      const agentTasks = (tasks || [])
        .filter((t) => t.assignee === agent.id)
        .map((t) => ({ title: t.title, status: t.status }));

      const agentFlowEntries = (flowLogs || [])
        .filter((log) => log.agent_id === agent.id)
        .map((log) => ({
          action: log.action,
          details: log.details,
          created_at: log.created_at,
        }));

      return {
        agentId: agent.id,
        name: toDisplayName(agent.id),
        emoji: agent.emoji,
        status: agent.status,
        currentTask: agent.current_task,
        tasks: agentTasks,
        flowEntries: agentFlowEntries,
      };
    });

    // 5. Generate HTML content
    const dateStr = new Date().toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    const title = type === 'standup' ? `Daily Standup — ${dateStr}` : `Daily Debrief — ${dateStr}`;
    
    const attendees = agentUpdates.map((a) => a.name).join(', ');

    let htmlContent = `<h2>${title}</h2>\n<p><strong>Attendees:</strong> ${attendees}</p>\n\n`;

    for (const agent of agentUpdates) {
      htmlContent += `<h3>${agent.emoji} ${agent.name}</h3>\n`;
      
      const statusLabel = agent.status === 'active' ? 'Active' : 'Idle';
      const statusDesc = agent.currentTask 
        ? `${statusLabel} — ${agent.currentTask}`
        : statusLabel;
      
      htmlContent += `<p><strong>Status:</strong> ${statusDesc}</p>\n`;

      if (type === 'standup') {
        // Standup: what's planned today
        if (agent.tasks.length > 0) {
          htmlContent += `<p><strong>Today's plan:</strong></p>\n<ul>\n`;
          for (const task of agent.tasks) {
            htmlContent += `  <li>Task: ${task.title} (${task.status})</li>\n`;
          }
          htmlContent += `</ul>\n`;
        } else {
          htmlContent += `<p><em>No tasks planned</em></p>\n`;
        }
      } else {
        // Debrief: what was completed + what's in progress
        const doneTasks = agent.tasks.filter((t) => t.status === 'done');
        const doingTasks = agent.tasks.filter((t) => t.status === 'doing');

        if (doneTasks.length > 0) {
          htmlContent += `<p><strong>Completed today:</strong></p>\n<ul>\n`;
          for (const task of doneTasks) {
            htmlContent += `  <li>${task.title}</li>\n`;
          }
          htmlContent += `</ul>\n`;
        }

        if (doingTasks.length > 0) {
          htmlContent += `<p><strong>In progress:</strong></p>\n<ul>\n`;
          for (const task of doingTasks) {
            htmlContent += `  <li>${task.title}</li>\n`;
          }
          htmlContent += `</ul>\n`;
        }

        if (doneTasks.length === 0 && doingTasks.length === 0) {
          htmlContent += `<p><em>No tasks completed or in progress today</em></p>\n`;
        }

        // Show blockers/issues from flow log
        const blockerActions = agent.flowEntries.filter((e) => 
          e.action.includes('error') || 
          e.action.includes('blocked') ||
          e.action.includes('rejected')
        );

        if (blockerActions.length > 0) {
          htmlContent += `<p><strong>Blockers/Issues:</strong></p>\n<ul>\n`;
          for (const entry of blockerActions) {
            const detail = entry.details ? ` — ${entry.details}` : '';
            htmlContent += `  <li>${entry.action}${detail}</li>\n`;
          }
          htmlContent += `</ul>\n`;
        }
      }

      htmlContent += `\n`;
    }

    // 6. Save to documents table
    const path = type === 'standup' 
      ? `meetings/standup-${dateStr.replace(/ /g, '-').toLowerCase()}.md`
      : `meetings/debrief-${dateStr.replace(/ /g, '-').toLowerCase()}.md`;

    const { data: savedDoc, error: saveError } = await supabaseAdmin
      .from('documents')
      .insert({
        path,
        title,
        content: htmlContent,
        category: 'meetings',
        type: 'meeting',
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json(
        { error: 'Failed to save meeting document', details: saveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(savedDoc, { status: 201 });
  } catch (err) {
    console.error('Meeting generation error:', err);
    return NextResponse.json(
      { error: 'Failed to generate meeting', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
