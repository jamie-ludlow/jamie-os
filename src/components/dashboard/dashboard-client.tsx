'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  GitCommit,
  PlusCircle,
  Zap,
  Bot,
  Clock,
  TrendingUp,
  Target,
  Flame,
  ArrowRight,
  ListTodo,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PRIORITY_BADGE, normalisePriority } from '@/lib/constants';
import { formatRelative, formatTimeUK } from '@/lib/date';
import type { AgentStatus } from '@/app/page';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { WeatherWidget } from './weather-widget';
import { RunningWidget } from './running-widget';
import { HabitTrackerWidget } from './habit-tracker-widget';
import { RaceCountdownWidget } from './race-countdown-widget';
import { TaskVelocityWidget } from './task-velocity-widget';
import { CompletionRateWidget } from './completion-rate-widget';
import { AgentActivityWidget } from './agent-activity-widget';
import { ExecutionLedgerWidget, type ExecutionLedgerEntry } from './execution-ledger-widget';
import { AutomationRoiWidget } from './automation-roi-widget';

interface FlatTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string | null;
  project_name: string | null;
  project_color: string | null;
  due_date: string | null;
}

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  agent: string;
  created_at: string;
}

interface DashboardCounts {
  dueToday: number;
  overdue: number;
  completedToday: number;
  activeTasks: number;
  tasksInProgress: number;
  activeAgents: number;
  overdueTasks: number;
  totalProjects: number;
}

interface InitialStats {
  total: number;
  done: number;
  todo: number;
  doing: number;
}

interface VelocityData {
  date: string;
  count: number;
}

interface ProjectBreakdown {
  project_name: string;
  project_color: string;
  total: number;
  done: number;
}

interface AgentActivity {
  agent_id: string;
  agent_name: string;
  task_count: number;
  completed_count: number;
  rejected_count: number;
  completion_rate: number;
}

interface DashboardClientProps {
  initialTodayTasks: FlatTask[];
  initialOverdueTasks: FlatTask[];
  initialActivity: ActivityItem[];
  initialCounts: DashboardCounts;
  initialStats?: InitialStats;
  velocityData: VelocityData[];
  projectBreakdown: ProjectBreakdown[];
  agentActivities: AgentActivity[];
  executionLedgerEntries: ExecutionLedgerEntry[];
  executionLedgerError?: boolean;
}

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

const toTitle = (value?: string | null) => {
  if (!value) return 'No assignee';
  return value
    .split(/[-_ ]/g)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getOverdueLabel = (dueDate: string | null) => {
  if (!dueDate) return 'Overdue';
  const dueMs = new Date(dueDate).getTime();
  if (Number.isNaN(dueMs)) return 'Overdue';
  const elapsedMs = Date.now() - dueMs;
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
  const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
  if (elapsedMinutes < 60) {
    return `Overdue by ${Math.max(1, elapsedMinutes)} min${elapsedMinutes === 1 ? '' : 's'}`;
  }
  if (elapsedHours < 24) {
    return `Overdue by ${elapsedHours} hour${elapsedHours === 1 ? '' : 's'}`;
  }
  const days = Math.floor(elapsedHours / 24);
  return `Overdue by ${days} day${days === 1 ? '' : 's'}`;
};

const getActionMeta = (action: string | null | undefined) => {
  const value = (action || '').toLowerCase();
  if (value.includes('complete'))
    return { label: 'Completed', icon: CheckCircle2, tone: 'bg-status-success/20 text-status-success dark:text-status-success' };
  if (value.includes('create'))
    return { label: 'Created', icon: PlusCircle, tone: 'bg-sky-500/20 text-sky-500 dark:text-sky-300' };
  if (value.includes('update'))
    return { label: 'Updated', icon: GitCommit, tone: 'bg-primary/20 text-primary dark:text-primary/70' };
  if (value.includes('delete') || value.includes('remove'))
    return { label: 'Removed', icon: AlertTriangle, tone: 'bg-destructive/20 text-destructive text-destructive' };
  return { label: 'Updated', icon: Zap, tone: 'bg-muted text-muted-foreground' };
};

// statusBadge removed — was unused dead code with hardcoded STATUS_STYLES lookup

const getDayLabel = (date: Date): string => {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dateStr = date.toDateString();
  if (dateStr === today.toDateString()) return 'Today';
  if (dateStr === tomorrow.toDateString()) return 'Tomorrow';
  
  const dayOfWeek = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const dayMonth = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${dayOfWeek}, ${dayMonth}`;
};

export function DashboardClient({
  initialTodayTasks,
  initialOverdueTasks,
  initialActivity,
  initialCounts,
  initialStats,
  velocityData,
  projectBreakdown,
  agentActivities,
  executionLedgerEntries,
  executionLedgerError,
}: DashboardClientProps) {
  const [todayTasks, setTodayTasks] = useState<FlatTask[]>(initialTodayTasks);
  const [overdueTasks, setOverdueTasks] = useState<FlatTask[]>(initialOverdueTasks);
  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [upcomingWeek, setUpcomingWeek] = useState<FlatTask[]>([]);
  const [counts, setCounts] = useState<DashboardCounts>(initialCounts);
  const [allTasks, setAllTasks] = useState<FlatTask[]>([]);

  const flattenTask = useCallback((t: Record<string, unknown>): FlatTask => {
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
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
    const today = startOfToday();
    const tomorrow = startOfTomorrow();
    const todayIso = today.toISOString();
    const tomorrowIso = tomorrow.toISOString();
    const weekFromNow = new Date(tomorrow);
    weekFromNow.setDate(weekFromNow.getDate() + 6);
    const weekFromNowIso = weekFromNow.toISOString();

    const [
      { data: dueTodayData },
      { data: overdueData },
      { data: activityData },
      { data: agentData },
      { data: upcomingWeekData },
      { data: allTasksData },
      { count: dueTodayCount },
      { count: overdueCount },
      { count: completedToday },
      { count: activeTasksCount },
      { count: inProgressCount },
      { count: activeAgents },
    ] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, status, priority, assignee, due_date, projects(name, color)')
        .not('due_date', 'is', null)
        .gte('due_date', todayIso)
        .lt('due_date', tomorrowIso)
        .order('due_date', { ascending: true })
        .limit(50),
      supabase
        .from('tasks')
        .select('id, title, status, priority, assignee, due_date, projects(name, color)')
        .not('due_date', 'is', null)
        .lt('due_date', todayIso)
        .neq('status', 'done')
        .order('due_date', { ascending: true })
        .limit(50),
      supabase
        .from('activity_log')
        .select('id, action, description, agent, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('agent_status')
        .select('id, name, role, status, current_task, model, last_active_at')
        .order('last_active_at', { ascending: false }),
      supabase
        .from('tasks')
        .select('id, title, status, priority, assignee, due_date, projects(name, color)')
        .not('due_date', 'is', null)
        .gte('due_date', tomorrowIso)
        .lt('due_date', weekFromNowIso)
        .neq('status', 'done')
        .order('due_date', { ascending: true })
        .limit(50),
      supabase
        .from('tasks')
        .select('id, title, status, priority, assignee, due_date, projects(name, color)'),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .not('due_date', 'is', null)
        .gte('due_date', todayIso)
        .lt('due_date', tomorrowIso)
        .neq('status', 'done'),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .not('due_date', 'is', null)
        .lt('due_date', todayIso)
        .neq('status', 'done'),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done')
        .gte('completed_at', todayIso)
        .lt('completed_at', tomorrowIso),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['todo', 'doing']),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['doing']),
      supabase.from('agent_status').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    setTodayTasks((dueTodayData || []).map(flattenTask));
    setOverdueTasks((overdueData || []).map(flattenTask));
    setActivity(activityData || []);
    setAgents((agentData || []) as AgentStatus[]);
    setUpcomingWeek((upcomingWeekData || []).map(flattenTask));
    setAllTasks((allTasksData || []).map(flattenTask));
    setCounts({
      dueToday: dueTodayCount || 0,
      overdue: overdueCount || 0,
      completedToday: completedToday || 0,
      activeTasks: activeTasksCount || 0,
      tasksInProgress: inProgressCount || 0,
      activeAgents: activeAgents || 0,
      overdueTasks: overdueCount || 0,
      totalProjects: 0,
    });
    } catch (err) {
      // Silently handle — dashboard still shows initialStats from SSR
    }
  }, [flattenTask]);

  useEffect(() => {
    // Load client-side data (agents, upcoming week, etc.) on mount
    loadDashboard();

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadDashboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, () => loadDashboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_status' }, () => loadDashboard())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  // Calculate enhanced stats
  const stats = useMemo(() => {
    if (allTasks.length > 0) {
      const total = allTasks.length;
      const done = allTasks.filter(t => t.status === 'done').length;
      const todo = allTasks.filter(t => t.status === 'todo' || t.status === 'backlog').length;
      const doing = allTasks.filter(t => t.status === 'doing').length;
      const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
      return { total, done, todo, doing, completionRate };
    }
    // Fallback to server-side stats
    if (initialStats) {
      const completionRate = initialStats.total > 0 ? Math.round((initialStats.done / initialStats.total) * 100) : 0;
      return { total: initialStats.total, done: initialStats.done, todo: initialStats.todo, doing: 0, completionRate };
    }
    return { total: 0, done: 0, todo: 0, doing: 0, completionRate: 0 };
  }, [allTasks, initialStats]);

  const recentCompletions = useMemo(
    () => allTasks
      .filter(t => t.status === 'done' && t.due_date)
      .sort((a, b) => (b.due_date || '').localeCompare(a.due_date || ''))
      .slice(0, 5),
    [allTasks],
  );

  // Group upcoming tasks by day
  const upcomingByDay = useMemo(() => {
    const grouped = new Map<string, FlatTask[]>();
    
    upcomingWeek.forEach(task => {
      if (!task.due_date) return;
      const date = new Date(task.due_date);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString();
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(task);
    });
    
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, tasks]) => ({
        date: new Date(dateStr),
        tasks: tasks.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')),
      }));
  }, [upcomingWeek]);

  const sortedTodayTasks = useMemo(
    () => [...todayTasks].sort((a, b) => {
      // Sort by priority first (P1 > P2 > P3 > P4), then by time
      const priorityOrder = { P1: 0, P2: 1, P3: 2, P4: 3 };
      const aPriority = normalisePriority(a.priority);
      const bPriority = normalisePriority(b.priority);
      const priorityDiff = priorityOrder[aPriority as keyof typeof priorityOrder] - priorityOrder[bPriority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) return priorityDiff;
      return (a.due_date || '').localeCompare(b.due_date || '');
    }),
    [todayTasks],
  );

  const sortedOverdue = useMemo(
    () => [...overdueTasks].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')),
    [overdueTasks],
  );

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', taskId);

    if (!error) {
      loadDashboard();
    }
  };

  const statCards = [
    { 
      label: 'Due Today',
      value: counts.dueToday,
      icon: Calendar,
      accent: false,
    },
    { 
      label: 'Overdue',
      value: counts.overdue,
      icon: AlertTriangle,
      accent: counts.overdue > 0,
    },
    { 
      label: 'Completed Today',
      value: counts.completedToday,
      icon: CheckCircle2,
      accent: false,
    },
    { 
      label: 'Active Tasks',
      value: counts.activeTasks,
      icon: ListTodo,
      accent: false,
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-medium text-muted-foreground/60">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {(() => {
            const h = new Date().getHours();
            if (h < 5) return 'Working late, Jamie';
            if (h < 12) return 'Good morning, Jamie';
            if (h < 17) return 'Good afternoon, Jamie';
            if (h < 21) return 'Good evening, Jamie';
            return 'Night owl mode, Jamie';
          })()}
        </h1>
      </div>

      {/* Quick Stats Row */}
      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const isOverdue = card.label === 'Overdue';
          const hasAccent = card.accent && typeof card.value === 'number' && card.value > 0;
          
          return (
            <div
              key={card.label}
              className={`rounded-lg border p-4 transition-all duration-150 hover:shadow-sm ${
                hasAccent && isOverdue
                  ? 'border-destructive/20 bg-destructive/5'
                  : 'border-border/20 bg-card'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`h-4 w-4 ${
                  hasAccent && isOverdue
                    ? 'text-destructive'
                    : 'text-muted-foreground/60'
                }`} />
                <p className="text-[13px] font-medium text-muted-foreground">{card.label}</p>
              </div>
              <span className={`text-3xl font-bold ${
                hasAccent && isOverdue
                  ? 'text-destructive'
                  : 'text-foreground'
              }`}>
                {card.value}
              </span>
            </div>
          );
        })}
      </section>

      {/* Two-column layout */}
      <div className="grid gap-5 lg:grid-cols-[5fr_3fr]">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Today's Tasks - Enhanced */}
          <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h2 className="text-[13px] font-semibold">Today&apos;s Tasks</h2>
                <span className="text-[11px] text-muted-foreground/60">({sortedTodayTasks.length})</span>
              </div>
              <Link href="/board" className="text-[11px] text-primary hover:text-primary/90 font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none rounded">
                View Board <ArrowRight className="inline h-3 w-3 ml-0.5" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {sortedTodayTasks.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[13px] text-muted-foreground/60">No tasks due today</p>
                  <p className="text-[11px] text-muted-foreground/40 mt-1">You&apos;re all clear!</p>
                </div>
              )}
              {sortedTodayTasks.map((task) => {
                const priority = normalisePriority(task.priority);
                const priorityStyle = PRIORITY_BADGE[priority as keyof typeof PRIORITY_BADGE];
                
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg border border-border/20 px-3 py-2.5 text-[13px] hover:bg-muted/40 transition-colors duration-150 group"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => toggleTaskStatus(task.id, task.status)}
                          className="shrink-0 h-4 w-4 rounded-full border-2 border-muted-foreground/40 hover:border-primary transition-colors duration-150 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                        >
                          {task.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{task.status === 'done' ? 'Mark incomplete' : 'Mark complete'}</TooltipContent>
                    </Tooltip>
                    
                    <Link href={`/board?task=${task.id}`} className="flex-1 flex items-center gap-2 min-w-0">
                      <span className={`font-medium truncate ${task.status === 'done' ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
                        {task.title}
                      </span>
                    </Link>
                    
                    {task.project_name && (
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span 
                          className="h-1.5 w-1.5 rounded-full" 
                          style={{ backgroundColor: task.project_color || 'rgb(100, 116, 139)' }}
                        />
                        <span className="text-[11px] text-muted-foreground/60 truncate max-w-[100px]">
                          {task.project_name}
                        </span>
                      </span>
                    )}
                    
                    {task.due_date && formatTimeUK(task.due_date) !== '00:00' && (
                      <span className="text-[11px] text-muted-foreground/60 shrink-0 font-mono">
                        {formatTimeUK(task.due_date)}
                      </span>
                    )}
                    
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase shrink-0 ${priorityStyle?.className || 'border-border/20 text-muted-foreground'}`}>
                      {priorityStyle?.label || priority}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Overdue Tasks */}
          {sortedOverdue.length > 0 && (
            <section className="rounded-lg border border-destructive/20 bg-destructive/5 px-5 py-3">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h2 className="text-[13px] font-semibold text-destructive">Overdue Tasks</h2>
                <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-medium text-destructive">
                  {sortedOverdue.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {sortedOverdue.slice(0, 5).map((task) => (
                  <Link
                    key={task.id}
                    href={`/board?task=${task.id}`}
                    className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-card px-3 py-2.5 text-[13px] hover:bg-muted/40 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                  >
                    <span className="flex-1 font-medium text-foreground truncate">{task.title}</span>
                    <span className="text-[11px] text-muted-foreground/60 shrink-0">{toTitle(task.assignee)}</span>
                    <span className="text-[10px] text-destructive shrink-0 font-medium">
                      {getOverdueLabel(task.due_date)}
                    </span>
                  </Link>
                ))}
                {sortedOverdue.length > 5 && (
                  <Link
                    href="/board"
                    className="block text-center text-[11px] text-destructive hover:text-destructive/90 font-medium py-2 transition-colors duration-150"
                  >
                    +{sortedOverdue.length - 5} more overdue
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* Upcoming This Week - Enhanced */}
          {upcomingByDay.length > 0 && (
            <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-muted-foreground/60" />
                <h2 className="text-[13px] font-semibold">Upcoming This Week</h2>
                <span className="text-[11px] text-muted-foreground/60">({upcomingWeek.length})</span>
              </div>
              <div className="space-y-4">
                {upcomingByDay.map(({ date, tasks }) => (
                  <div key={date.toISOString()} className="space-y-1.5">
                    <h3 className="text-[11px] font-medium text-muted-foreground">
                      {getDayLabel(date)}
                    </h3>
                    <div className="space-y-1.5">
                      {tasks.slice(0, 3).map((task) => {
                        const priority = normalisePriority(task.priority);
                        const priorityStyle = PRIORITY_BADGE[priority as keyof typeof PRIORITY_BADGE];
                        
                        return (
                          <Link
                            key={task.id}
                            href={`/board?task=${task.id}`}
                            className="flex items-center gap-2 rounded-lg border border-border/20 px-3 py-2 text-[13px] hover:bg-muted/40 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                          >
                            <span className="flex-1 font-medium text-foreground truncate">{task.title}</span>
                            
                            {task.project_name && (
                              <span className="flex items-center gap-1.5 shrink-0">
                                <span 
                                  className="h-1.5 w-1.5 rounded-full" 
                                  style={{ backgroundColor: task.project_color || 'rgb(100, 116, 139)' }}
                                />
                                <span className="text-[11px] text-muted-foreground/60 truncate max-w-[80px]">
                                  {task.project_name}
                                </span>
                              </span>
                            )}
                            
                            {task.due_date && formatTimeUK(task.due_date) !== '00:00' && (
                              <span className="text-[11px] text-muted-foreground/60 shrink-0 font-mono">
                                {formatTimeUK(task.due_date)}
                              </span>
                            )}
                            
                            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase shrink-0 ${priorityStyle?.className || 'border-border/20 text-muted-foreground'}`}>
                              {priority}
                            </span>
                          </Link>
                        );
                      })}
                      {tasks.length > 3 && (
                        <p className="text-[11px] text-muted-foreground/60 pl-3">
                          +{tasks.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent Activity - Enhanced */}
          <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
            <h2 className="text-[13px] font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-1">
              {activity.length === 0 && (
                <div className="text-center py-6">
                  <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[13px] text-muted-foreground/60">No recent activity</p>
                </div>
              )}
              {activity.map((item) => {
                const meta = getActionMeta(item.action);
                const Icon = meta.icon;
                return (
                  <div 
                    key={item.id} 
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors duration-150 cursor-pointer"
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground truncate">{item.description || meta.label}</p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {toTitle(item.agent)} · {formatRelative(item.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Quick Actions - Enhanced */}
          <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
            <h2 className="text-[13px] font-semibold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: 'New Task', href: '/board?new=true', icon: PlusCircle, color: 'text-primary' },
                { label: 'View Board', href: '/board', icon: ClipboardList, color: 'text-purple-400' },
                { label: 'Projects', href: '/projects', icon: Target, color: 'text-blue-400' },
                { label: 'Documents', href: '/documents', icon: FileText, color: 'text-amber-400' },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-3 rounded-lg border border-border/20 px-3 py-2.5 text-[13px] text-foreground hover:bg-muted/40 hover:border-border/20 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none group"
                  >
                    <Icon className={`h-4 w-4 ${action.color}`} />
                    <span className="font-medium flex-1">{action.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                  </Link>
                );
              })}
            </div>
          </section>

          {/* New Widgets */}
          <TaskVelocityWidget data={velocityData} />
          <ExecutionLedgerWidget entries={executionLedgerEntries} hasError={executionLedgerError} />
          <AutomationRoiWidget entries={executionLedgerEntries} hasError={executionLedgerError} />
          <CompletionRateWidget 
            stats={stats} 
            projectBreakdown={projectBreakdown}
          />
          <AgentActivityWidget activities={agentActivities} />

          {/* Pro Tip */}
          <div className="rounded-lg border border-border/20 bg-muted/20 px-4 py-3">
            <p className="text-[11px] text-muted-foreground/60">
              💡 <span className="font-medium text-muted-foreground">Pro tip:</span>{' '}
              {[
                'Press ⌘K to search everything instantly',
                'Press ? to see all keyboard shortcuts',
                'Press G then T to jump to tasks',
                'Press ⌘N to create a new task from anywhere',
                'Press ⌘\\ to toggle the sidebar',
                'Use Saved Views to save filter combos',
              ][Math.floor(Date.now() / 60000) % 6]}
            </p>
          </div>

          {/* Agent Status */}
          <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="h-4 w-4 text-primary" />
              <h2 className="text-[13px] font-semibold">Agent Status</h2>
            </div>
            <div className="space-y-2">
              {agents.length === 0 && (
                <div className="text-center py-4">
                  <Bot className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[13px] text-muted-foreground/60">No agents registered</p>
                </div>
              )}
              {agents.slice(0, 5).map((agent) => {
                const isActive = agent.status === 'active';
                return (
                  <div key={agent.id} className="rounded-lg border border-border/20 px-3 py-2.5 hover:bg-muted/40 transition-colors duration-150">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${isActive ? 'bg-status-success shadow-[0_0_6px_hsl(var(--status-success)/0.4)]' : 'bg-muted-foreground/30'}`} />
                      <span className="text-[13px] font-medium text-foreground">{toTitle(agent.name)}</span>
                      {agent.role && (
                        <span className="text-[10px] text-muted-foreground/60">· {agent.role}</span>
                      )}
                    </div>
                    {isActive && agent.current_task && (
                      <p className="mt-1 ml-4 text-[11px] text-muted-foreground/60 truncate">{agent.current_task}</p>
                    )}
                    {agent.last_active_at && (
                      <p className="mt-0.5 ml-4 text-[10px] text-muted-foreground/60">
                        {isActive ? 'Active now' : formatRelative(agent.last_active_at)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent Completions */}
          {recentCompletions.length > 0 && (
            <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="h-4 w-4 text-status-success" />
                <h2 className="text-[13px] font-semibold">Recent Completions</h2>
              </div>
              <div className="space-y-1.5">
                {recentCompletions.map((task) => (
                  <Link
                    key={task.id}
                    href={`/board?task=${task.id}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-muted/40 transition-colors duration-150"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-status-success shrink-0" />
                    <span className="flex-1 truncate text-muted-foreground/60 line-through">{task.title}</span>
                    {task.assignee && (
                      <span className="text-[10px] text-muted-foreground/30 shrink-0">{toTitle(task.assignee)}</span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Habits */}
          <HabitTrackerWidget />

          {/* Race Countdown */}
          <RaceCountdownWidget />

          {/* Weather */}
          <WeatherWidget />

          {/* Running */}
          <RunningWidget />
        </div>
      </div>
    </div>
  );
}
