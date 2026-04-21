import { supabaseAdmin } from '@/lib/supabase';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import type { ExecutionLedgerEntry } from '@/components/dashboard/execution-ledger-widget';

export const dynamic = 'force-dynamic';

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const startOfTomorrow = () => {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
};

type FlatTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string | null;
  project_name: string | null;
  project_color: string | null;
  due_date: string | null;
};

interface VelocityTask {
  completed_at: string;
}

interface ProjectTask {
  project_id: string;
  status: string;
  projects: { name: string; color: string } | { name: string; color: string }[] | null;
}

interface FlowLogEntry {
  agent_id: string;
  action: string;
  created_at: string;
}

const flattenTask = (t: Record<string, unknown>): FlatTask => {
  const p = t.projects as { name: string; color: string } | null;
  return {
    id: t.id as string,
    title: t.title as string,
    status: t.status as string,
    priority: t.priority as string,
    assignee: (t.assignee as string) || null,
    project_name: p?.name || null,
    project_color: p?.color || null,
    due_date: (t.due_date as string) || null,
  };
};

export interface AgentStatus {
  id: string;
  name: string;
  role: string | null;
  status: string;
  current_task: string | null;
  model: string | null;
  last_active_at: string | null;
}

export default async function Dashboard() {
  const today = startOfToday();
  const tomorrow = startOfTomorrow();
  const todayIso = today.toISOString();
  const tomorrowIso = tomorrow.toISOString();
  
  // Calculate dates for velocity data
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const fourteenDaysAgoIso = fourteenDaysAgo.toISOString();
  
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();

  const [
    { data: dueTodayTasks },
    { data: overdueTasks },
    { data: activityLogs },
    { data: agents },
    { data: upcomingTasks },
    { count: dueTodayCount },
    { count: overdueCount },
    { count: completedToday },
    { count: activeTasksCount },
    { count: inProgressCount },
    { count: activeAgents },
    { count: totalCount },
    { count: doneCount },
    { count: todoCount },
    { count: doingCount },
    { data: velocityTasks },
    { data: projectBreakdownData },
    { data: agentActivityData },
    { data: executionLedgerPlannedData, error: executionLedgerPlannedQueryError },
    { data: executionLedgerShippedData, error: executionLedgerShippedQueryError },
  ] = await Promise.all([
    supabaseAdmin
      .from('tasks')
      .select('id, title, status, priority, assignee, due_date, projects(name, color)')
      .not('due_date', 'is', null)
      .gte('due_date', todayIso)
      .lt('due_date', tomorrowIso)
      .order('due_date', { ascending: true })
      .limit(20),
    supabaseAdmin
      .from('tasks')
      .select('id, title, status, priority, assignee, due_date, projects(name, color)')
      .not('due_date', 'is', null)
      .lt('due_date', todayIso)
      .neq('status', 'done')
      .order('due_date', { ascending: true })
      .limit(20),
    supabaseAdmin
      .from('activity_log')
      .select('id, action, description, agent, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('agent_status')
      .select('id, name, role, status, current_task, model, last_active_at')
      .order('last_active_at', { ascending: false }),
    supabaseAdmin
      .from('tasks')
      .select('id, title, status, priority, assignee, due_date, projects(name, color)')
      .not('due_date', 'is', null)
      .gte('due_date', tomorrowIso)
      .neq('status', 'done')
      .order('due_date', { ascending: true })
      .limit(3),
    supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .not('due_date', 'is', null)
      .gte('due_date', todayIso)
      .lt('due_date', tomorrowIso)
      .neq('status', 'done'),
    supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .not('due_date', 'is', null)
      .lt('due_date', todayIso)
      .neq('status', 'done'),
    supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done')
      .gte('completed_at', todayIso)
      .lt('completed_at', tomorrowIso),
    supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('status', ['todo', 'doing']),
    supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('status', ['doing']),
    supabaseAdmin
      .from('agent_status')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done'),
    supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'todo'),
    supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'doing'),
    // Task velocity: completed tasks in last 14 days
    supabaseAdmin
      .from('tasks')
      .select('completed_at')
      .eq('status', 'done')
      .not('completed_at', 'is', null)
      .gte('completed_at', fourteenDaysAgoIso)
      .lt('completed_at', todayIso)
      .order('completed_at', { ascending: true }),
    // Project breakdown
    supabaseAdmin
      .from('tasks')
      .select('status, project_id, projects(name, color)')
      .not('project_id', 'is', null),
    // Agent activity (last 7 days)
    supabaseAdmin
      .from('agent_flow_log')
      .select('agent_id, action, created_at')
      .gte('created_at', sevenDaysAgoIso)
      .order('created_at', { ascending: false }),
    // Planned outcomes in last 7 days (created-based)
    supabaseAdmin
      .from('proposals')
      .select('id, title, status, task_id, commit_sha, shipped_at, created_at')
      .in('status', ['request', 'backlog', 'in_progress', 'pending_review', 'approved'])
      .gte('created_at', sevenDaysAgoIso)
      .order('created_at', { ascending: false })
      .limit(200),
    // Shipped outcomes in last 7 days (shipped-based, independent from created_at)
    supabaseAdmin
      .from('proposals')
      .select('id, title, status, task_id, commit_sha, shipped_at, created_at')
      .eq('status', 'shipped')
      .not('shipped_at', 'is', null)
      .gte('shipped_at', sevenDaysAgoIso)
      .order('shipped_at', { ascending: false })
      .limit(500),
  ]);

  // Process velocity data - group by date
  const velocityByDate = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const date = new Date(fourteenDaysAgo);
    date.setDate(date.getDate() + i);
    velocityByDate.set(date.toISOString().split('T')[0], 0);
  }
  (velocityTasks || []).forEach((task: VelocityTask) => {
    const dateKey = task.completed_at.split('T')[0];
    velocityByDate.set(dateKey, (velocityByDate.get(dateKey) || 0) + 1);
  });
  const velocityData = Array.from(velocityByDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Process project breakdown
  const projectMap = new Map<string, { name: string; color: string; total: number; done: number }>();
  (projectBreakdownData || []).forEach((task: ProjectTask) => {
    if (!task.project_id || !task.projects) return;
    const key = task.project_id;
    // Handle both single object and array responses from Supabase
    const projectData = Array.isArray(task.projects) ? task.projects[0] : task.projects;
    if (!projectData) return;
    if (!projectMap.has(key)) {
      projectMap.set(key, {
        name: projectData.name,
        color: projectData.color || '#6b7280',
        total: 0,
        done: 0,
      });
    }
    const project = projectMap.get(key)!;
    project.total++;
    if (task.status === 'done') project.done++;
  });
  const projectBreakdown = Array.from(projectMap.values())
    .sort((a, b) => b.total - a.total)
    .map(p => ({
      project_name: p.name,
      project_color: p.color,
      total: p.total,
      done: p.done,
    }));

  // Process agent activity
  const agentMap = new Map<string, { task_count: number; completed_count: number; rejected_count: number }>();
  (agentActivityData || []).forEach((log: FlowLogEntry) => {
    const agentId = log.agent_id;
    if (!agentMap.has(agentId)) {
      agentMap.set(agentId, { task_count: 0, completed_count: 0, rejected_count: 0 });
    }
    const agent = agentMap.get(agentId)!;
    // Count each action as a task event
    agent.task_count++;
    // Count completed actions
    if (log.action === 'completed') agent.completed_count++;
    // Count rejected actions
    if (log.action === 'qa_rejected') agent.rejected_count++;
  });
  const agentActivities = Array.from(agentMap.entries())
    .map(([agent_id, stats]) => ({
      agent_id,
      agent_name: agent_id.charAt(0).toUpperCase() + agent_id.slice(1),
      task_count: stats.task_count,
      completed_count: stats.completed_count,
      rejected_count: stats.rejected_count,
      completion_rate: stats.task_count > 0 ? (stats.completed_count / stats.task_count) * 100 : 0,
    }))
    .sort((a, b) => b.task_count - a.task_count);

  const sevenDayStart = new Date(sevenDaysAgoIso);
  sevenDayStart.setHours(0, 0, 0, 0);
  const executionLedgerEntries: ExecutionLedgerEntry[] = [
    ...((executionLedgerPlannedData || []) as ExecutionLedgerEntry[]),
    ...((executionLedgerShippedData || []) as ExecutionLedgerEntry[]),
  ]
    .filter((entry) => {
      const isShipped = entry.status === 'shipped' && !!entry.shipped_at;
      const dateSource = isShipped ? entry.shipped_at : entry.created_at;
      if (!dateSource) return false;
      return new Date(dateSource).getTime() >= sevenDayStart.getTime();
    })
    .filter((entry) =>
      entry.status === 'shipped' ||
      entry.status === 'request' ||
      entry.status === 'backlog' ||
      entry.status === 'in_progress' ||
      entry.status === 'pending_review' ||
      entry.status === 'approved',
    );

  return (
    <DashboardClient
      initialTodayTasks={(dueTodayTasks || []).map(flattenTask)}
      initialOverdueTasks={(overdueTasks || []).map(flattenTask)}
      initialActivity={activityLogs || []}
      initialCounts={{
        dueToday: dueTodayCount || 0,
        overdue: overdueCount || 0,
        completedToday: completedToday || 0,
        activeTasks: activeTasksCount || 0,
        tasksInProgress: inProgressCount || 0,
        activeAgents: activeAgents || 0,
        overdueTasks: overdueCount || 0,
        totalProjects: 0,
      }}
      initialStats={{
        total: totalCount || 0,
        done: doneCount || 0,
        todo: todoCount || 0,
        doing: doingCount || 0,
      }}
      velocityData={velocityData}
      projectBreakdown={projectBreakdown}
      agentActivities={agentActivities}
      executionLedgerEntries={executionLedgerEntries}
      executionLedgerError={Boolean(executionLedgerPlannedQueryError || executionLedgerShippedQueryError)}
    />
  );
}
