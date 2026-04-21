'use client';

import { Target, CheckCircle2, Circle, Clock } from 'lucide-react';

interface CompletionRateProps {
  stats: {
    total: number;
    done: number;
    todo: number;
    doing: number;
  };
  projectBreakdown?: {
    project_name: string;
    project_color: string;
    total: number;
    done: number;
  }[];
}

export function CompletionRateWidget({ stats, projectBreakdown }: CompletionRateProps) {
  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  
  // SVG circle parameters
  const size = 120;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (completionRate / 100) * circumference;

  return (
    <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-primary" />
        <h2 className="text-[13px] font-semibold">Completion Rate</h2>
      </div>

      {/* Circular progress */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
              opacity={0.2}
            />
            {/* Progress circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{completionRate}%</span>
            <span className="text-[10px] text-muted-foreground/60">complete</span>
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />
            <span className="text-muted-foreground">Done</span>
          </div>
          <span className="font-medium text-foreground">{stats.done}</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-status-info" />
            <span className="text-muted-foreground">In Progress</span>
          </div>
          <span className="font-medium text-foreground">{stats.doing}</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
            <span className="text-muted-foreground">To Do</span>
          </div>
          <span className="font-medium text-foreground">{stats.todo}</span>
        </div>
      </div>

      {/* Project breakdown if available */}
      {projectBreakdown && projectBreakdown.length > 0 && (
        <>
          <div className="border-t border-border/20 my-3" />
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground/60 mb-2">By Project</p>
            {projectBreakdown.slice(0, 3).map((project) => {
              const projectRate = project.total > 0 
                ? Math.round((project.done / project.total) * 100) 
                : 0;
              
              return (
                <div key={project.project_name} className="space-y-1">
                  <div className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span 
                        className="h-1.5 w-1.5 rounded-full shrink-0" 
                        style={{ backgroundColor: project.project_color }}
                      />
                      <span className="text-muted-foreground truncate">{project.project_name}</span>
                    </div>
                    <span className="text-[11px] text-foreground font-medium ml-2">{projectRate}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted/20 ml-3">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${projectRate}%`,
                        backgroundColor: project.project_color 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
