'use client';

import { useEffect, useState } from 'react';

interface AgentPerformance {
  id: string;
  name: string;
  emoji: string;
  tasksCompleted: number;
  qaApprovalRate: number | null;
  qaRejections: number;
  avgDurationMs: number | null;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return 'N/A';
  
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return '<1m';
}

function getQaRateColour(rate: number | null): string {
  if (rate === null) return 'text-muted-foreground';
  if (rate >= 90) return 'text-status-success';
  if (rate >= 70) return 'text-status-warning';
  return 'text-status-error';
}

export function PerformanceSection() {
  const [agents, setAgents] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents/performance')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      })
      .then((data) => {
        setAgents(data.agents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border/20 bg-card/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-muted/40 animate-pulse" />
                <div className="h-4 w-20 rounded bg-muted/40 animate-pulse" />
              </div>
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex justify-between">
                  <div className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
                  <div className="h-4 w-10 rounded bg-muted/40 animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-[11px] font-medium text-muted-foreground">Performance</p>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-[13px] text-muted-foreground">No performance data yet</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">Agent performance metrics will appear here once tasks are completed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-medium text-muted-foreground">Performance</p>
      
      {/* Agent Performance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="rounded-lg border border-border/20 bg-card/50 p-4 transition-colors duration-150 hover:border-border/40"
          >
            {/* Agent Header */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/20">
              <span className="text-xl shrink-0">{agent.emoji}</span>
              <span className="text-[13px] font-medium text-foreground truncate">{agent.name}</span>
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              {/* Tasks Completed */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-muted-foreground">Completed</span>
                <span className="text-lg font-semibold text-foreground shrink-0">{agent.tasksCompleted}</span>
              </div>

              {/* QA Approval Rate */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-muted-foreground">QA rate</span>
                <span className={`text-lg font-semibold shrink-0 ${getQaRateColour(agent.qaApprovalRate)}`}>
                  {agent.qaApprovalRate !== null ? `${agent.qaApprovalRate.toFixed(0)}%` : 'N/A'}
                </span>
              </div>

              {/* QA Rejections */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-muted-foreground">Rejections</span>
                <span className="text-lg font-semibold text-foreground shrink-0">{agent.qaRejections}</span>
              </div>

              {/* Avg Duration */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-muted-foreground">Avg duration</span>
                <span className="text-lg font-semibold text-foreground shrink-0">
                  {formatDuration(agent.avgDurationMs)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
