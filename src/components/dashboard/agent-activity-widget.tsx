'use client';

import { Bot, Zap } from 'lucide-react';

interface AgentActivity {
  agent_id: string;
  agent_name: string;
  task_count: number;
  completed_count: number;
  rejected_count: number;
  completion_rate: number;
}

interface AgentActivityProps {
  activities: AgentActivity[];
}

/**
 * Agent visualization colours for activity bars
 * Hardcoded for data visualization consistency — these need to be actual colour values
 * (not Tailwind classes) for inline backgroundColor styles. Aligned with design system
 * where possible (casper uses --primary, others match ASSIGNEE_COLORS intent).
 */
const AGENT_COLORS: Record<string, string> = {
  casper: 'hsl(var(--primary))', // teal — matches design system primary
  'ui-designer': 'rgb(139 92 246)', // violet-500 — matches design system
  designer: 'rgb(139 92 246)', // violet-500 — matches design system
  developer: 'rgb(59 130 246)', // blue-500 — matches design system
  'qa-tester': 'rgb(16 185 129)', // emerald-500 — matches design system
  qa: 'rgb(16 185 129)', // emerald-500 — matches design system
  researcher: 'rgb(245 158 11)', // amber-500 — matches design system
};

export function AgentActivityWidget({ activities }: AgentActivityProps) {
  const maxTasks = Math.max(...activities.map(a => a.task_count), 1);
  
  return (
    <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h2 className="text-[13px] font-semibold">Agent Activity</h2>
        </div>
        <span className="text-[11px] text-muted-foreground/60">Last 7 days</span>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Zap className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-[13px] text-muted-foreground/60">No agent activity</p>
          <p className="text-[11px] text-muted-foreground/40 mt-1">Agents will appear here once they start working</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((agent) => {
            const agentColor = AGENT_COLORS[agent.agent_id.toLowerCase()] || 'hsl(var(--muted-foreground))';
            const barWidth = (agent.task_count / maxTasks) * 100;
            
            return (
              <div key={agent.agent_id} className="space-y-1.5">
                {/* Agent header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: agentColor }}
                    />
                    <span className="text-[13px] font-medium text-foreground">
                      {agent.agent_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-muted-foreground/60">
                      {agent.task_count} task{agent.task_count !== 1 ? 's' : ''}
                    </span>
                    {agent.completion_rate > 0 && (
                      <span className="text-status-success font-medium">
                        {Math.round(agent.completion_rate)}% complete
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Activity bar */}
                <div className="h-2 rounded-full bg-muted/20">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${barWidth}%`,
                      backgroundColor: agentColor,
                      opacity: 0.8
                    }}
                  />
                </div>
                
                {/* Stats breakdown */}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                  {agent.completed_count > 0 && (
                    <span>
                      <span className="text-status-success font-medium">{agent.completed_count}</span> completed
                    </span>
                  )}
                  {agent.rejected_count > 0 && (
                    <span>
                      <span className="text-destructive font-medium">{agent.rejected_count}</span> rejected
                    </span>
                  )}
                  {agent.task_count - agent.completed_count - agent.rejected_count > 0 && (
                    <span>
                      <span className="text-status-info font-medium">
                        {agent.task_count - agent.completed_count - agent.rejected_count}
                      </span> active
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
