'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface RequestSummary {
  title: string;
  startedAt: string;
  completedAt?: string;
  agents: string[];
  actionCount: number;
  status: string;
  hadRejections: boolean;
}

interface FlowEntry {
  id: string;
  task_id: string | null;
  task_title: string;
  agent_id: string;
  action: string;
  details: string | null;
  created_at: string;
}

interface AgentDef {
  id: string;
  name: string;
  role: string;
  emoji: string;
  model: string;
  status: 'active' | 'idle';
  current_task: string | null;
  last_active_at: string | null;
}

// Tier mapping based on agent ID
const AGENT_TIER: Record<string, 'orchestrator' | 'worker' | 'qa'> = {
  'casper': 'orchestrator',
  'developer': 'worker',
  'ui-designer': 'worker',
  'analyst': 'worker',
  'copywriter': 'worker',
  'qa-tester': 'qa',
};

// Agents to show (filter out unused ones)
const VISIBLE_AGENTS = ['casper', 'developer', 'ui-designer', 'qa-tester', 'analyst', 'copywriter'];

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatTimeRange(start: string, end?: string): string {
  if (!end) return formatTime(start);
  return `${formatTime(start)} → ${formatTime(end)}`;
}

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

interface AgentFlowViewProps {
  agents: AgentDef[];
  defaultView?: 'live' | 'history';
  onAgentClick?: (agentId: string) => void;
}

export function AgentFlowView({ agents, defaultView = 'live', onAgentClick }: AgentFlowViewProps) {
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [flow, setFlow] = useState<FlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view] = useState<'live' | 'history'>(defaultView);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/flow');
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (e) {
      console.error('Failed to fetch requests:', e);
    }
  }, []);

  const fetchFlow = useCallback(async (taskTitle: string) => {
    try {
      const res = await fetch(`/api/agents/flow?task=${encodeURIComponent(taskTitle)}`);
      if (!res.ok) throw new Error('Failed to fetch flow');
      const data = await res.json();
      setFlow(data.flow || []);
    } catch (e) {
      console.error('Failed to fetch flow:', e);
      setFlow([]);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    setLoading(false);

    const channel = supabase
      .channel('agent-flow-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_flow_log' }, () => {
        try {
          fetchRequests();
          if (selectedRequest) {
            fetchFlow(selectedRequest);
          }
        } catch (e) {
          console.error('Realtime flow_log error:', e);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests, selectedRequest, fetchFlow]);

  useEffect(() => {
    if (selectedRequest) {
      fetchFlow(selectedRequest);
    }
  }, [selectedRequest, fetchFlow]);

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center text-muted-foreground">
        <p className="text-[13px]">Loading flow data...</p>
      </div>
    );
  }

  // Filter agents: only show visible ones, and remove those inactive for 7+ days (unless currently active)
  const visibleAgents = agents.filter(agent => {
    if (!VISIBLE_AGENTS.includes(agent.id)) return false;
    if (agent.status === 'active') return true;
    if (!agent.last_active_at) return false;
    const daysSinceActive = (Date.now() - new Date(agent.last_active_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceActive < 7;
  });

  return (
    <div className="space-y-4">
      {view === 'live' ? (
        <div className="rounded-lg border border-border/20 bg-card p-6">
          <OrgChart agents={visibleAgents} agentMap={agentMap} onAgentClick={onAgentClick} />
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Request History List */}
          <div className="w-[300px] shrink-0 space-y-3">
            <p className="text-[13px] font-medium text-muted-foreground/60">Request History</p>
            <div className="space-y-2 overflow-y-auto max-h-[600px] pr-2">
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[13px] text-muted-foreground/40">No request history yet</p>
                </div>
              ) : (
                requests.map((req) => (
                  <button
                    key={req.title}
                    onClick={() => setSelectedRequest(req.title)}
                    className={`w-full text-left rounded-lg border px-4 py-3 transition-all duration-150 ${
                      selectedRequest === req.title
                        ? 'border-primary/50 bg-primary/5 shadow-sm'
                        : 'border-border/20 bg-card hover:border-border/40 hover:bg-muted/40'
                    }`}
                  >
                    <p className="text-[13px] font-medium truncate mb-1">{req.title}</p>
                    <p className="text-[11px] text-muted-foreground/60 font-mono">
                      {formatTimeRange(req.startedAt, req.completedAt)}
                    </p>
                    {req.hadRejections && (
                      <span className="inline-block mt-1.5 text-[9px] text-destructive font-medium">
                        Had rejections
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Flow Visualization */}
          <div className="flex-1 rounded-lg border border-border/20 bg-card p-6">
            {!selectedRequest ? (
              <p className="text-center text-muted-foreground/40 py-8 text-[13px]">
                Select a request to view its flow
              </p>
            ) : (
              <div className="space-y-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRequest(null)}
                  className="text-[13px] -ml-2"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Back to List
                </Button>
                <FlowDiagram flow={flow} agentMap={agentMap} taskTitle={selectedRequest} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ORG CHART (3-tier: Casper → Workers → QA)
   ═══════════════════════════════════════════════════ */

function OrgChart({ 
  agents, 
  agentMap, 
  onAgentClick 
}: { 
  agents: AgentDef[]; 
  agentMap: Map<string, AgentDef>; 
  onAgentClick?: (agentId: string) => void;
}) {
  const casper = agentMap.get('casper');
  const workers = agents.filter((a) => AGENT_TIER[a.id] === 'worker');
  const qa = agentMap.get('qa-tester');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const casperRef = useRef<HTMLDivElement>(null);
  const workerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const qaRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<Array<{ d: string; agentId: string; glow: 'none' | 'active' | 'planned' }>>([]);

  // Calculate SVG paths after layout
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const container = containerRef.current;
      const casperEl = casperRef.current;
      const qaEl = qaRef.current;
      if (!container || !casperEl) return;

      const cRect = container.getBoundingClientRect();
      const casperRect = casperEl.getBoundingClientRect();
      const R = 16; // corner radius for smooth curves

      const newPaths: Array<{ d: string; agentId: string; glow: 'none' | 'active' | 'planned' }> = [];

      // Casper bottom center
      const cx = casperRect.left + casperRect.width / 2 - cRect.left;
      const cy = casperRect.bottom - cRect.top;

      workers.forEach((worker) => {
        const el = workerRefs.current.get(worker.id);
        if (!el) return;
        const wRect = el.getBoundingClientRect();
        const wx = wRect.left + wRect.width / 2 - cRect.left;
        const wy = wRect.top - cRect.top;
        const midY = cy + (wy - cy) / 2;

        // Determine if QA is currently reviewing this worker's output
        const qaIsReviewingThisWorker = qa?.status === 'active' && 
          worker.status === 'idle' && 
          worker.last_active_at && 
          (Date.now() - new Date(worker.last_active_at).getTime()) < 10 * 60 * 1000;

        // Casper→Worker: glow green if worker is active OR if QA is reviewing this worker
        const glow: 'none' | 'active' | 'planned' = 
          worker.status === 'active' ? 'active' : 
          qaIsReviewingThisWorker ? 'active' : 
          'none';

        // Draw curved path from Casper to Worker
        if (Math.abs(wx - cx) < 2) {
          // Directly below — straight line
          newPaths.push({ d: `M ${cx} ${cy} L ${cx} ${wy}`, agentId: worker.id, glow });
        } else {
          const dir = wx > cx ? 1 : -1;
          newPaths.push({
            d: `M ${cx} ${cy} L ${cx} ${midY - R} Q ${cx} ${midY} ${cx + dir * R} ${midY} L ${wx - dir * R} ${midY} Q ${wx} ${midY} ${wx} ${midY + R} L ${wx} ${wy}`,
            agentId: worker.id,
            glow,
          });
        }

        // Worker → QA paths
        if (qaEl && qa) {
          const qaIsActive = qa.status === 'active';
          const thisWorkerActive = worker.status === 'active';
          const now = Date.now();
          const workerLastActive = worker.last_active_at ? new Date(worker.last_active_at).getTime() : 0;
          const workerRecentlyActive = (now - workerLastActive) < 10 * 60 * 1000;

          // Green: QA is actively reviewing this worker's output
          const isQaTarget = qaIsActive && worker.status === 'idle' && workerRecentlyActive;
          // Blue/Planned: This worker is currently active (QA will be next)
          const isQaPlanned = thisWorkerActive && !qaIsActive;
          
          const pathGlow: 'none' | 'active' | 'planned' = 
            isQaTarget ? 'active' : 
            isQaPlanned ? 'planned' : 
            'none';

          const qaRect = qaEl.getBoundingClientRect();
          const qx = qaRect.left + qaRect.width / 2 - cRect.left;
          const qy = qaRect.top - cRect.top;
          const wBottom = wRect.bottom - cRect.top;
          const midY2 = wBottom + (qy - wBottom) / 2;

          if (Math.abs(wx - qx) < 2) {
            newPaths.push({ d: `M ${wx} ${wBottom} L ${wx} ${qy}`, agentId: `${worker.id}-qa`, glow: pathGlow });
          } else {
            const dir2 = qx > wx ? 1 : -1;
            newPaths.push({
              d: `M ${wx} ${wBottom} L ${wx} ${midY2 - R} Q ${wx} ${midY2} ${wx + dir2 * R} ${midY2} L ${qx - dir2 * R} ${midY2} Q ${qx} ${midY2} ${qx} ${midY2 + R} L ${qx} ${qy}`,
              agentId: `${worker.id}-qa`,
              glow: pathGlow,
            });
          }
        }
      });

      setPaths(newPaths);
    });

    return () => cancelAnimationFrame(id);
  }, [agents, workers, casper, qa]);

  if (!casper) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[13px] text-muted-foreground/40">Casper orchestrator not found</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div ref={containerRef} className="relative py-6">
        {/* SVG overlay for all connecting paths */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
          <defs>
            {/* Active gradient (green) */}
            <linearGradient id="path-glow-active" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--status-success)' }} stopOpacity="0.1" />
              <stop offset="50%" style={{ stopColor: 'var(--status-success)' }} stopOpacity="0.7" />
              <stop offset="100%" style={{ stopColor: 'var(--status-success)' }} stopOpacity="0.1" />
            </linearGradient>
            {/* Planned gradient (blue) */}
            <linearGradient id="path-glow-planned" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--flow-planned)' }} stopOpacity="0.1" />
              <stop offset="50%" style={{ stopColor: 'var(--flow-planned)' }} stopOpacity="0.5" />
              <stop offset="100%" style={{ stopColor: 'var(--flow-planned)' }} stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {paths.map((p, i) => (
            <g key={i}>
              {/* Base subtle line */}
              <path 
                d={p.d} 
                fill="none" 
                stroke="var(--border)" 
                strokeOpacity="0.12" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
              />
              {/* Glow line */}
              {p.glow !== 'none' && (
                <path 
                  d={p.d} 
                  fill="none" 
                  stroke={`url(#path-glow-${p.glow})`} 
                  strokeWidth="2" 
                  strokeLinecap="round"
                >
                  <animate 
                    attributeName="stroke-opacity" 
                    values={p.glow === 'active' ? '0.4;0.9;0.4' : '0.3;0.7;0.3'} 
                    dur={p.glow === 'active' ? '2s' : '2.5s'} 
                    repeatCount="indefinite" 
                  />
                </path>
              )}
            </g>
          ))}
        </svg>

        {/* Layout tiers */}
        <div className="flex flex-col items-center gap-6 relative z-10">
          {/* TIER 1: Casper (Orchestrator) */}
          <div ref={casperRef}>
            <AgentNode agent={casper} tier="orchestrator" allAgents={agents} onAgentClick={onAgentClick} />
          </div>

          {/* TIER 2: Workers */}
          {workers.length > 0 && (
            <div className="flex gap-6 items-start flex-wrap justify-center">
              {workers.map((agent) => (
                <div 
                  key={agent.id} 
                  ref={(el) => { 
                    if (el) workerRefs.current.set(agent.id, el); 
                  }}
                >
                  <AgentNode agent={agent} tier="worker" allAgents={agents} onAgentClick={onAgentClick} />
                </div>
              ))}
            </div>
          )}

          {/* TIER 3: QA */}
          {qa && (
            <div ref={qaRef}>
              <AgentNode agent={qa} tier="qa" allAgents={agents} onAgentClick={onAgentClick} />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * Determine pipeline-aware visual state
 */
function getPipelineState(agent: AgentDef, allAgents: AgentDef[]): 'active' | 'planned' | 'idle' {
  if (agent.status === 'active') return 'active';

  const tier = AGENT_TIER[agent.id];
  const anyWorkerActive = allAgents.some(
    (a) => AGENT_TIER[a.id] === 'worker' && a.status === 'active'
  );

  // QA is planned when any worker is actively building
  if (tier === 'qa' && anyWorkerActive) return 'planned';

  return 'idle';
}

function AgentNode({ 
  agent, 
  tier, 
  allAgents,
  onAgentClick 
}: { 
  agent: AgentDef; 
  tier: 'orchestrator' | 'worker' | 'qa'; 
  allAgents: AgentDef[];
  onAgentClick?: (agentId: string) => void;
}) {
  const visualState = getPipelineState(agent, allAgents);
  
  // State-based styles with clear visual differences
  const stateStyles = {
    active: 'border-status-success/60 bg-card shadow-lg shadow-status-success/20',
    planned: 'border-sky-500/50 bg-card shadow-md shadow-sky-500/10',
    idle: 'border-border/20 bg-card opacity-75',
  };

  const dotStyles = {
    active: 'bg-status-success shadow-sm shadow-status-success/50',
    planned: 'bg-sky-500 shadow-sm shadow-sky-500/40',
    idle: 'bg-muted-foreground/30',
  };

  // Format model name: strip provider prefix, show full name
  const formatModelName = (model: string): string => {
    return model.replace(/^(anthropic|openai|google)\//i, '');
  };
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          onClick={() => onAgentClick?.(agent.id)}
          className={`
            relative rounded-xl border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer
            ${stateStyles[visualState]}
            ${tier === 'orchestrator' ? 'min-w-[220px] px-4 py-3' : 'min-w-[180px] px-4 py-2.5'}
          `}
        >
          <div className="relative">
            {/* Row 1: Emoji + Name + Status dot */}
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className={tier === 'orchestrator' ? 'text-xl' : 'text-lg'}>{agent.emoji}</span>
                <span className="text-[13px] font-semibold tracking-tight truncate">{agent.name}</span>
              </div>
              <span className="relative flex h-2 w-2 shrink-0">
                {visualState === 'active' && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-success opacity-75" />
                )}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${dotStyles[visualState]}`} />
              </span>
            </div>

            {/* Row 2: Role + Full Model Name */}
            <p className="text-[11px] text-muted-foreground/60 mb-1">
              {agent.role} · <span className="font-mono">{formatModelName(agent.model)}</span>
            </p>

            {/* Row 3: Current task OR last active */}
            {agent.current_task ? (
              <div className="rounded-md bg-primary/10 border border-primary/20 px-2 py-1 mt-1">
                <p className="text-[11px] text-primary font-medium truncate">{agent.current_task}</p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/30 text-center py-1">
                {timeAgo(agent.last_active_at)}
              </p>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px]">
        <div className="space-y-1.5">
          <p className="font-semibold text-[13px]">{agent.name}</p>
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            <p>Model: <span className="font-mono">{formatModelName(agent.model)}</span></p>
            <p>Current: {agent.current_task || 'Idle'}</p>
            <p>Last active: {timeAgo(agent.last_active_at)}</p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/* ═══════════════════════════════════════════════════
   FLOW DIAGRAM (History tab — when request selected)
   ═══════════════════════════════════════════════════ */

interface FlowNode {
  agent: AgentDef;
  entries: FlowEntry[];
}

function FlowDiagram({
  flow,
  agentMap,
  taskTitle,
}: {
  flow: FlowEntry[];
  agentMap: Map<string, AgentDef>;
  taskTitle: string;
}) {
  // Group flow entries by agent in chronological order
  const seenAgents = new Set<string>();
  const orderedAgents: string[] = [];
  
  flow.forEach((entry) => {
    if (!seenAgents.has(entry.agent_id)) {
      seenAgents.add(entry.agent_id);
      orderedAgents.push(entry.agent_id);
    }
  });

  const nodes: FlowNode[] = orderedAgents
    .map((agentId) => {
      const agent = agentMap.get(agentId);
      if (!agent) return null;
      const entries = flow.filter((e) => e.agent_id === agentId);
      return { agent, entries };
    })
    .filter((n): n is FlowNode => n !== null);

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center gap-0 py-4">
        <div className="text-center mb-6">
          <h2 className="text-[15px] font-semibold text-foreground">{taskTitle}</h2>
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            {flow.length} action{flow.length !== 1 ? 's' : ''} · {nodes.length} agent{nodes.length !== 1 ? 's' : ''}
          </p>
        </div>

        {nodes.length === 0 ? (
          <p className="text-[13px] text-muted-foreground/40 py-8">No flow data available</p>
        ) : (
          <div className="flex flex-col items-center gap-0">
            {nodes.map((node, idx) => (
              <div key={node.agent.id} className="flex flex-col items-center">
                <FlowNodeCard node={node} />

                {/* Connecting line to next node */}
                {idx < nodes.length - 1 && (
                  <div className="h-6 w-px bg-border/15 relative">
                    <div 
                      className="absolute inset-0 w-px" 
                      style={{ 
                        background: 'linear-gradient(to bottom, transparent, var(--primary), transparent)', 
                        opacity: 0.3 
                      }} 
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function FlowNodeCard({ node }: { node: FlowNode }) {
  const latestEntry = node.entries[node.entries.length - 1];
  const firstEntry = node.entries[0];
  const hasRejection = node.entries.some((e) => e.action === 'qa_rejected');
  
  const getActionStyle = (action: string): string => {
    if (action === 'qa_approved' || action === 'completed') 
      return 'border-status-success/40 bg-card';
    if (action === 'qa_rejected') 
      return 'border-destructive/40 bg-card';
    if (action === 'started' || action === 'dispatched') 
      return 'border-primary/40 bg-card';
    return 'border-border/20 bg-card';
  };

  // Format model name
  const formatModelName = (model: string): string => {
    return model.replace(/^(anthropic|openai|google)\//i, '');
  };

  return (
    <div
      className={`relative rounded-xl border px-4 py-3 min-w-[220px] max-w-[400px] transition-all duration-150 ${getActionStyle(latestEntry.action)}`}
    >
      <div className="relative">
        {/* Header: emoji + name + time range */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{node.agent.emoji}</span>
            <div>
              <p className="text-[13px] font-semibold">{node.agent.name}</p>
              <p className="text-[10px] text-muted-foreground/50 font-mono">{formatModelName(node.agent.model)}</p>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground/50 font-mono tabular-nums">
            {formatTimeRange(firstEntry.created_at, node.entries.length > 1 ? latestEntry.created_at : undefined)}
          </span>
        </div>

        {/* Action + details */}
        <div className="mt-2 space-y-1">
          {node.entries.map((entry, idx) => (
            <div key={entry.id} className="text-[11px]">
              <span className="text-muted-foreground/60 capitalize">
                {entry.action.replace(/_/g, ' ')}
              </span>
              {entry.details && (
                <span className="text-muted-foreground/40"> · {entry.details}</span>
              )}
            </div>
          ))}
        </div>

        {/* QA rejection indicator */}
        {hasRejection && (
          <div className="mt-2 pt-2 border-t border-destructive/20">
            <p className="text-[11px] text-destructive font-medium">↻ Returned for fixes</p>
          </div>
        )}
      </div>
    </div>
  );
}
