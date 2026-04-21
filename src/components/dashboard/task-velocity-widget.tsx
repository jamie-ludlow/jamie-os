'use client';

import { TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts';

interface TaskVelocityProps {
  data: {
    date: string;
    count: number;
  }[];
}

export function TaskVelocityWidget({ data }: TaskVelocityProps) {
  // Calculate current week vs previous week
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysIntoWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
  
  const currentWeekTotal = data.slice(-7).reduce((sum, d) => sum + d.count, 0);
  const previousWeekTotal = data.slice(-14, -7).reduce((sum, d) => sum + d.count, 0);
  
  const change = previousWeekTotal > 0
    ? Math.round(((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100)
    : 0;
  
  const changeDirection = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
  
  // Format data for chart (last 14 days, show dates)
  const chartData = data.slice(-14).map(d => ({
    name: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    value: d.count,
  }));

  return (
    <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-[13px] font-semibold">Task Velocity</h2>
        </div>
        <span className="text-[11px] text-muted-foreground/60">Last 14 days</span>
      </div>

      {/* Current week metric */}
      <div className="mb-4">
        <p className="text-[11px] text-muted-foreground/60 mb-1">This Week</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-foreground">{currentWeekTotal}</span>
          <span className="text-[13px] text-muted-foreground">completed</span>
        </div>
        
        {/* Comparison */}
        <div className="flex items-center gap-1 mt-1">
          {changeDirection === 'up' && (
            <>
              <ArrowUp className="h-3 w-3 text-status-success" />
              <span className="text-[11px] text-status-success font-medium">{change}%</span>
            </>
          )}
          {changeDirection === 'down' && (
            <>
              <ArrowDown className="h-3 w-3 text-destructive" />
              <span className="text-[11px] text-destructive font-medium">{Math.abs(change)}%</span>
            </>
          )}
          {changeDirection === 'neutral' && (
            <>
              <Minus className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[11px] text-muted-foreground/60 font-medium">No change</span>
            </>
          )}
          <span className="text-[11px] text-muted-foreground/60">vs last week</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-20 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.6 }}
              axisLine={false}
              tickLine={false}
            />
            <Bar 
              dataKey="value" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
