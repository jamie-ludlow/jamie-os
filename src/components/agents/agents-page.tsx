'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { AgentStatus } from '@/lib/types';
import { AgentsPageSkeleton } from '@/components/ui/skeleton-loaders';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { UsageSection } from '@/components/usage/usage-section';
// import { PerformanceSection } from '@/components/agents/performance-section';
import { AgentFlowView } from '@/components/agents/agent-flow-view';
// import { ActivityFeed } from '@/components/agents/activity-feed';

/* ── Rich agent definition from API ── */
interface AgentDef {
  id: string;
  name: string;
  role: string;
  model: string;
  tier: 'owner' | 'orchestrator' | 'manager' | 'worker';
  status: 'active' | 'idle';
  emoji: string;
  description: string;
  skills: string[];
}

/* ── Merged agent (API enrichment + DB live status) ── */
interface EnrichedAgent extends AgentDef {
  current_task: string | null;
  last_active_at: string | null;
  liveStatus: 'active' | 'idle';
}

interface Task {
  id: string;
  title: string;
  status: string;
  assignee: string;
  priority?: string;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

const STATUS_DOT: Record<string, string> = {
  active: 'bg-status-success',
  idle: 'bg-muted-foreground/70 bg-muted-foreground',
};

const TIER_LABEL: Record<string, string> = {
  owner: 'Owner',
  orchestrator: 'Orchestrator',
  manager: 'Manager',
  worker: 'Worker',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const monday = new Date(now);
  const dow = monday.getDay(); // 0=Sun..6=Sat
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return d >= monday;
}

/* ═══════════════════════════════════════════════════
   AGENT CARDS GRID
   ═══════════════════════════════════════════════════ */

/* AgentCard removed — replaced by AgentFlowView */

/* ═══════════════════════════════════════════════════
   SIMPLE MARKDOWN RENDERER
   ═══════════════════════════════════════════════════ */

function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const k = key++;
    if (line.startsWith('### ')) {
      elements.push(<p key={k} className="text-[13px] font-semibold text-muted-foreground mt-3 mb-1">{line.slice(4)}</p>);
    } else if (line.startsWith('## ')) {
      elements.push(<p key={k} className="text-[13px] font-bold text-foreground mt-4 mb-1">{line.slice(3)}</p>);
    } else if (line.startsWith('# ')) {
      elements.push(<p key={k} className="text-base font-bold text-foreground mt-4 mb-2">{line.slice(2)}</p>);
    } else if (line.match(/^[-*]\s*\[x\]/i)) {
      elements.push(<div key={k} className="flex items-center gap-2 text-[13px] text-muted-foreground ml-2"><span className="text-status-success">✓</span><span className="line-through opacity-60">{line.replace(/^[-*]\s*\[x\]\s*/i, '')}</span></div>);
    } else if (line.match(/^[-*]\s*\[\s*\]/)) {
      elements.push(<div key={k} className="flex items-center gap-2 text-[13px] text-muted-foreground ml-2"><span className="text-muted-foreground">○</span><span>{line.replace(/^[-*]\s*\[\s*\]\s*/, '')}</span></div>);
    } else if (line.match(/^[-*]\s+/)) {
      elements.push(<div key={k} className="flex items-start gap-2 text-[13px] text-muted-foreground ml-2"><span className="text-muted-foreground mt-0.5">•</span><span>{line.replace(/^[-*]\s+/, '')}</span></div>);
    } else if (line.match(/^\d+\.\s+/)) {
      const match = line.match(/^(\d+)\.\s+(.*)/);
      if (match) elements.push(<div key={k} className="flex items-start gap-2 text-[13px] text-muted-foreground ml-2"><span className="text-muted-foreground font-mono">{match[1]}.</span><span>{match[2]}</span></div>);
    } else if (line.trim() === '') {
      elements.push(<div key={k} className="h-1.5" />);
    } else {
      elements.push(<p key={k} className="text-[13px] text-muted-foreground">{line}</p>);
    }
  }

  return <>{elements}</>;
}

/* ═══════════════════════════════════════════════════
   AGENT DETAIL PANEL
   ═══════════════════════════════════════════════════ */

function AgentDetailPanel({
  agent,
  queuedTasks,
  allTasks,
}: {
  agent: EnrichedAgent;
  queuedTasks: Record<string, Task[]>;
  allTasks: Task[];
}) {
  const [trainingContent, setTrainingContent] = useState<string | null>(null);
  const [trainingLoaded, setTrainingLoaded] = useState(false);

  useEffect(() => {
    setTrainingLoaded(false);
    setTrainingContent(null);
    fetch('/api/agents/training')
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        setTrainingContent(data[agent.id] ?? null);
        setTrainingLoaded(true);
      })
      .catch(() => setTrainingLoaded(true));
  }, [agent.id]);

  const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[13px] font-medium text-muted-foreground mb-2">{children}</p>
  );

  const agentQueued = queuedTasks[agent.name] ?? [];
  const agentTasks = allTasks.filter((t) => t.assignee === agent.name);
  const doingTasks = agentTasks.filter((t) => t.status === 'doing');
  const doneTasks = agentTasks
    .filter((t) => t.status === 'done')
    .sort((a, b) => (b.completed_at ?? b.updated_at ?? '').localeCompare(a.completed_at ?? a.updated_at ?? ''));
  const completedToday = doneTasks.filter((t) => t.completed_at && isToday(t.completed_at)).length;
  const completedThisWeek = doneTasks.filter((t) => t.completed_at && isThisWeek(t.completed_at)).length;
  const showCurrentTask = agent.liveStatus === 'active' || Boolean(agent.current_task);

  return (
    <>
      <SheetHeader>
        <SheetTitle asChild>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{agent.emoji}</span>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-semibold text-foreground">{agent.name}</span>
                <span className="relative flex h-2.5 w-2.5">
                  {agent.liveStatus === 'active' && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-success opacity-75" />
                  )}
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${STATUS_DOT[agent.liveStatus]}`} />
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {agent.liveStatus === 'active' ? 'Active' : timeAgo(agent.last_active_at)}
                </span>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground mt-1">{agent.role}</p>
            <span className="mt-1.5 inline-block rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-medium text-primary dark:text-primary/80">
              {TIER_LABEL[agent.tier]}
            </span>
          </div>
        </SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-6 text-[13px]">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Queued', value: agentQueued.length, color: 'text-status-warning text-status-warning' },
            { label: 'Today', value: completedToday, color: 'text-status-success text-status-success' },
            { label: 'This Week', value: completedThisWeek, color: 'text-primary dark:text-primary' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border/20 bg-muted px-3 py-2 text-center">
              <p className={`text-lg font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* About */}
        <div>
          <SectionHeader>About</SectionHeader>
          <div className="rounded-lg border border-border/20 bg-muted px-4 py-3 space-y-2">
            <p className="text-[13px] text-muted-foreground leading-relaxed">{agent.description}</p>
            <p className="text-[13px] font-mono text-muted-foreground">{agent.model}</p>
          </div>
        </div>

        {/* Skills */}
        <div>
          <SectionHeader>Skills</SectionHeader>
          <div className="flex flex-wrap gap-1.5">
            {agent.skills.map((skill) => (
              <span key={skill} className="rounded-md border border-border/20 bg-muted px-2.5 py-1 text-[13px] text-muted-foreground">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Current Task */}
        {showCurrentTask && (
          <div>
            <SectionHeader>Current Task</SectionHeader>
            <div className={`rounded-lg border px-4 py-2.5 ${agent.current_task ? 'border-status-success/20 bg-status-success/5' : 'border-border/20 bg-muted'}`}>
              <p className="text-[13px] text-muted-foreground">{agent.current_task || 'No active task'}</p>
            </div>
          </div>
        )}

        {/* In Progress */}
        {doingTasks.length > 0 && (
          <div>
            <SectionHeader>In Progress ({doingTasks.length})</SectionHeader>
            <div className="space-y-1.5">
              {doingTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <span className="text-primary mt-0.5 shrink-0">▸</span>
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Queued Tasks */}
        <div>
          <SectionHeader>Queued Tasks ({agentQueued.length})</SectionHeader>
          {agentQueued.length > 0 ? (
            <div className="space-y-1.5">
              {agentQueued.map((t) => (
                <div key={t.id} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <span className="text-muted-foreground mt-0.5 shrink-0">○</span>
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">No queued tasks</p>
          )}
        </div>

        {/* Recent Completions */}
        <div>
          <SectionHeader>Recent Completions</SectionHeader>
          {doneTasks.length > 0 ? (
            <div className="space-y-1.5">
              {doneTasks.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-2 text-[13px] text-muted-foreground">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-status-success mt-0.5 shrink-0">✓</span>
                    <span className="truncate">{t.title}</span>
                  </div>
                  {t.completed_at && (
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">{timeAgo(t.completed_at)}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">No completed tasks</p>
          )}
        </div>

        {/* Training & Knowledge */}
        <div>
          <SectionHeader>Training &amp; Knowledge</SectionHeader>
          {!trainingLoaded ? (
            <p className="text-[13px] text-muted-foreground">Loading…</p>
          ) : trainingContent ? (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border/20 bg-muted px-4 py-3 space-y-0.5">
              <SimpleMarkdown content={trainingContent} />
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">No training docs available</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */

export function AgentsPage() {
  const [agents, setAgents] = useState<EnrichedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<EnrichedAgent | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [queuedTasks, setQueuedTasks] = useState<Record<string, Task[]>>({});

  const merge = useCallback(
    (defs: AgentDef[], dbRows: AgentStatus[]): EnrichedAgent[] => {
      const dbMap: Record<string, AgentStatus> = {};
      dbRows.forEach((r) => (dbMap[r.id] = r));
      return defs.map((d) => {
        const db = dbMap[d.id];
        return {
          ...d,
          liveStatus: db?.status ?? d.status,
          current_task: db?.current_task ?? null,
          last_active_at: db?.last_active_at ?? null,
        };
      });
    },
    [],
  );

  const fetchAll = useCallback(async () => {
    try {
      const [apiRes, statusRes, tasksRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/agents/status'),
        fetch('/api/tasks'),
      ]);
      const apiData = apiRes.ok ? await apiRes.json() : { agents: [] };
      const statusData: AgentStatus[] = statusRes.ok ? await statusRes.json() : [];
      const tasksData: Task[] = tasksRes.ok ? await tasksRes.json() : [];

      setAllTasks(tasksData);

      // Queued tasks: todo (includes legacy backlog)
      const taskMap: Record<string, Task[]> = {};
      tasksData
        .filter((t) => (t.status === 'todo') && t.assignee)
        .forEach((t) => {
          if (!taskMap[t.assignee]) taskMap[t.assignee] = [];
          taskMap[t.assignee].push(t);
        });
      setQueuedTasks(taskMap);

      const defs: AgentDef[] = apiData.agents ?? [];
      setAgents(merge(defs, statusData));
    } catch (e) {
      console.error('Failed to fetch agents:', e);
    } finally {
      setLoading(false);
    }
  }, [merge]);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('agents-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_status' }, (payload) => {
        try {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as AgentStatus;
            setAgents((prev) =>
              prev.map((a) =>
                a.id === updated.id
                  ? { ...a, liveStatus: updated.status, current_task: updated.current_task, last_active_at: updated.last_active_at }
                  : a,
              ),
            );
            setSelectedAgent((sel) =>
              sel && sel.id === updated.id
                ? { ...sel, liveStatus: updated.status, current_task: updated.current_task, last_active_at: updated.last_active_at }
                : sel,
            );
          }
        } catch (e) {
          console.error('Realtime agent_status error:', e);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const cardAgents = useMemo(() => agents.filter((a) => a.tier !== 'owner'), [agents]);
  const activeCount = useMemo(() => cardAgents.filter((a) => a.liveStatus === 'active').length, [cardAgents]);

  if (loading) return <AgentsPageSkeleton />;
  if (!agents.length) return <div className="p-8 text-muted-foreground">No agents found</div>;

  return (
    <div className="text-foreground space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">Agents</p>
          <h1 className="text-2xl font-bold tracking-tight">Operations</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {cardAgents.length} agents · {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-status-success" />
            </span>
            Active
          </span>
          <span className="flex items-center gap-2">
            <span 
              className="h-2 w-2 rounded-full shadow-sm" 
              style={{ 
                backgroundColor: 'var(--flow-planned)', 
                boxShadow: '0 1px 2px 0 color-mix(in oklch, var(--flow-planned) 40%, transparent)'
              }} 
            />
            Planned
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/70" />
            Idle
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="live" className="w-full">
        <TabsList>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-5 space-y-5 animate-in fade-in duration-300">
          <AgentFlowView 
            agents={agents.map(a => ({
              id: a.id,
              name: a.name,
              role: a.role,
              emoji: a.emoji,
              model: a.model,
              status: a.liveStatus,
              current_task: a.current_task,
              last_active_at: a.last_active_at,
            }))}
            defaultView="live"
            onAgentClick={(agentId) => {
              const agent = agents.find(a => a.id === agentId);
              if (agent) setSelectedAgent(agent);
            }}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-5 space-y-5 animate-in fade-in duration-300">
          <AgentFlowView 
            agents={agents.map(a => ({
              id: a.id,
              name: a.name,
              role: a.role,
              emoji: a.emoji,
              model: a.model,
              status: a.liveStatus,
              current_task: a.current_task,
              last_active_at: a.last_active_at,
            }))}
            defaultView="history"
            onAgentClick={(agentId) => {
              const agent = agents.find(a => a.id === agentId);
              if (agent) setSelectedAgent(agent);
            }}
          />
        </TabsContent>

        <TabsContent value="usage" className="mt-5 space-y-8 animate-in fade-in duration-300">
          <UsageSection />
        </TabsContent>
      </Tabs>

      {/* Sheet Detail Panel */}
      <Sheet open={Boolean(selectedAgent)} onOpenChange={(open) => !open && setSelectedAgent(null)}>
        <SheetContent side="right" className="w-full max-w-lg bg-background text-foreground overflow-y-auto">
          {selectedAgent && (
            <AgentDetailPanel agent={selectedAgent} queuedTasks={queuedTasks} allTasks={allTasks} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
