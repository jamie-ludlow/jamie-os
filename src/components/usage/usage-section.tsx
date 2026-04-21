'use client';

import { useEffect, useState, useMemo } from 'react';
import type { TokenUsageResponse, Project } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { FilterProjectPopover } from '@/components/board/filter-project-popover';

type Period = 'day' | 'week' | 'month' | 'all';
type TimeGrouping = 'day' | 'week' | 'month';

interface ChartDataPoint {
  date: string;
  value: number;
  tokens: number;
  label: string;
}

export function UsageSection() {
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [data, setData] = useState<TokenUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeGrouping, setTimeGrouping] = useState<TimeGrouping>('day');
  const [activePeriod, setActivePeriod] = useState<Period | null>('all');
  const [earliestDate, setEarliestDate] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  // Fetch projects on mount
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => { if (!r.ok) throw new Error('Failed to fetch'); return r.json(); })
      .then((projects: Project[]) => setAllProjects(projects))
      .catch(() => setAllProjects([]));
  }, []);

  // Fetch earliest record date for "All Time"
  useEffect(() => {
    fetch('/api/token-usage')
      .then((r) => { if (!r.ok) throw new Error('Failed to fetch'); return r.json(); })
      .then((d: TokenUsageResponse) => {
        if (d.breakdown_by_day && d.breakdown_by_day.length > 0) {
          // breakdown_by_day is sorted descending, so last item is earliest
          const earliest = d.breakdown_by_day[d.breakdown_by_day.length - 1].date;
          setEarliestDate(earliest || null);
        } else {
          // No data yet, set to today
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          setEarliestDate(todayStr);
        }
      })
      .catch(() => {
        // On error, default to 30 days ago
        const fallback = new Date();
        fallback.setDate(fallback.getDate() - 30);
        setEarliestDate(fallback.toISOString().split('T')[0]);
      });
  }, []);

  // Initialize with "All Time" once we have earliest date
  useEffect(() => {
    if (!earliestDate) return;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setFromDate(earliestDate);
    setToDate(todayStr);
  }, [earliestDate]);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    
    setLoading(true);
    
    // Build API URL with filters
    const params = new URLSearchParams();
    params.set('from', fromDate);
    params.set('to', toDate);
    
    // For single project, use API filter (efficient)
    // For multiple projects or no filter, fetch all and filter client-side
    if (selectedProjects.length === 1) {
      params.set('project_id', selectedProjects[0]);
    }
    
    fetch(`/api/token-usage?${params}`)
      .then((r) => { if (!r.ok) throw new Error('Failed to fetch'); return r.json(); })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fromDate, toDate, selectedProjects]);

  const setPeriodPreset = (period: Period) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    const to = today.toISOString().split('T')[0];
    
    let from: string;
    if (period === 'day') {
      from = to; // Same day
    } else if (period === 'week') {
      const monday = new Date(today);
      const dow = monday.getDay(); // 0=Sun,1=Mon...6=Sat
      const diff = dow === 0 ? 6 : dow - 1; // days since Monday
      monday.setDate(monday.getDate() - diff);
      from = monday.toISOString().split('T')[0];
    } else if (period === 'month') {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      from = monthAgo.toISOString().split('T')[0];
    } else {
      // all — use earliest date from data
      from = earliestDate || new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
    
    setFromDate(from);
    setToDate(to);
    setActivePeriod(period);
  };

  // Smart grouping logic
  const getAvailableGroupings = (): TimeGrouping[] => {
    if (!fromDate || !toDate) return ['day'];
    
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    
    const fromMonth = from.getMonth();
    const fromYear = from.getFullYear();
    const toMonth = to.getMonth();
    const toYear = to.getFullYear();
    const spansDifferentMonths = fromYear !== toYear || fromMonth !== toMonth;
    
    if (daysDiff <= 7) {
      return ['day'];
    } else if (!spansDifferentMonths) {
      return ['day', 'week'];
    } else {
      return ['day', 'week', 'month'];
    }
  };

  const availableGroupings = getAvailableGroupings();
  
  // Auto-select most granular option when date range changes
  useEffect(() => {
    if (availableGroupings.length > 0 && !availableGroupings.includes(timeGrouping)) {
      setTimeGrouping(availableGroupings[0]);
    }
  }, [availableGroupings, timeGrouping]);

  // Filter data by selected projects (client-side for multiple projects)
  const filteredData = useMemo((): TokenUsageResponse | null => {
    if (!data) return null;
    if (selectedProjects.length === 0) return data;
    if (selectedProjects.length === 1) return data; // Already filtered by API
    
    // Multiple projects selected — filter breakdown_by_project and recalculate totals
    // Note: This is a simplified approach. Agent/model/provider breakdowns will show
    // data for ALL projects, not just selected ones, because we don't have that granularity
    // without raw records. This is acceptable for v1.
    
    const filteredProjects = data.breakdown_by_project.filter(p => 
      p.project_id && selectedProjects.includes(p.project_id)
    );
    
    const totalTokens = filteredProjects.reduce((sum, p) => sum + p.total_tokens, 0);
    const totalCost = filteredProjects.reduce((sum, p) => sum + p.total_cost, 0);
    
    return {
      total_tokens: totalTokens,
      total_cost: totalCost,
      breakdown_by_agent: data.breakdown_by_agent, // Not project-filtered (limitation)
      breakdown_by_project: filteredProjects,
      breakdown_by_model: data.breakdown_by_model, // Not project-filtered (limitation)
      breakdown_by_provider: data.breakdown_by_provider, // Not project-filtered (limitation)
      breakdown_by_day: data.breakdown_by_day, // Not project-filtered (limitation)
    };
  }, [data, selectedProjects]);

  const formatUSD = (value: number) => `$${value.toFixed(2)}`;
  const formatTokens = (value: number) => value.toLocaleString();

  // Aggregate data by time grouping
  const getChartData = (): ChartDataPoint[] => {
    if (!filteredData || !filteredData.breakdown_by_day || filteredData.breakdown_by_day.length === 0) return [];
    
    if (timeGrouping === 'day') {
      return filteredData.breakdown_by_day.map((d) => ({
        date: d.date || '',
        value: d.total_cost,
        tokens: d.total_tokens,
        label: new Date(d.date || '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      })).reverse();
    } else if (timeGrouping === 'week') {
      const weekMap = new Map<string, { cost: number; tokens: number }>();
      filteredData.breakdown_by_day.forEach((d) => {
        const date = new Date(d.date || '');
        const weekStart = new Date(date);
        const dow = date.getDay(); // 0=Sun..6=Sat
        weekStart.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1));
        const weekKey = weekStart.toISOString().split('T')[0];
        const existing = weekMap.get(weekKey) || { cost: 0, tokens: 0 };
        weekMap.set(weekKey, { cost: existing.cost + d.total_cost, tokens: existing.tokens + d.total_tokens });
      });
      return Array.from(weekMap.entries())
        .map(([date, v]) => ({
          date,
          value: v.cost,
          tokens: v.tokens,
          label: `Week of ${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } else {
      const monthMap = new Map<string, { cost: number; tokens: number }>();
      filteredData.breakdown_by_day.forEach((d) => {
        const date = new Date(d.date || '');
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthMap.get(monthKey) || { cost: 0, tokens: 0 };
        monthMap.set(monthKey, { cost: existing.cost + d.total_cost, tokens: existing.tokens + d.total_tokens });
      });
      return Array.from(monthMap.entries())
        .map(([date, v]) => ({
          date,
          value: v.cost,
          tokens: v.tokens,
          label: new Date(date + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
  };

  const chartData = getChartData();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Token Usage</p>
            <h2 className="text-xl font-bold tracking-tight">Usage</h2>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!filteredData || filteredData.total_tokens === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Token Usage</p>
            <h2 className="text-xl font-bold tracking-tight">Usage</h2>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-[13px] text-muted-foreground">
            {selectedProjects.length > 0 ? 'No usage data for selected projects' : 'No usage data yet'}
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            {selectedProjects.length > 0 ? 'Try selecting different projects or date range' : 'Token usage will appear here once logged'}
          </p>
        </div>
      </div>
    );
  }

  // Calculate percentages for Claude Max vs API spend
  const maxModelsTokens = filteredData.breakdown_by_model
    .filter((m) => m.is_claude_max)
    .reduce((sum, m) => sum + m.total_tokens, 0);
  const apiModelsTokens = filteredData.breakdown_by_model
    .filter((m) => !m.is_claude_max)
    .reduce((sum, m) => sum + m.total_tokens, 0);
  const maxPercentage = filteredData.total_tokens > 0 ? (maxModelsTokens / filteredData.total_tokens) * 100 : 0;
  const apiPercentage = filteredData.total_tokens > 0 ? (apiModelsTokens / filteredData.total_tokens) * 100 : 0;

  const maxAgentTokens = Math.max(...filteredData.breakdown_by_agent.map((a) => a.total_tokens), 1);
  const maxProjectTokens = Math.max(...filteredData.breakdown_by_project.map((p) => p.total_tokens), 1);
  const maxModelTokens = Math.max(...filteredData.breakdown_by_model.map((m) => m.total_tokens), 1);
  const maxProviderTokens = Math.max(...filteredData.breakdown_by_provider.map((p) => p.total_tokens), 1);

  // Provider colours
  const getProviderColour = (provider: string | undefined) => {
    switch (provider) {
      case 'Anthropic':
        return 'from-indigo-500 to-indigo-400';
      case 'OpenAI':
        return 'from-emerald-500 to-emerald-400';
      case 'Google':
        return 'from-amber-500 to-amber-400';
      default:
        return 'from-slate-500 to-slate-400';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header with Date Range Picker */}
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Token Usage</p>
            <h2 className="text-xl font-bold tracking-tight">Usage</h2>
            <p className="text-[13px] text-muted-foreground mt-1">
              Track token consumption and costs across agents, projects, and models
            </p>
          </div>
        </div>

        {/* Date Range Controls */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Quick Presets */}
          <div className="flex items-center gap-1 rounded-lg border border-border/20 bg-muted p-1">
            {(['day', 'week', 'month', 'all'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodPreset(p)}
                className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors duration-150 ${
                  activePeriod === p
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/60'
                }`}
              >
                {p === 'day' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Date Inputs */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">From</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setActivePeriod(null); }}
                className="h-8 bg-card border-border/20 text-[13px] text-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">To</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setActivePeriod(null); }}
                className="h-8 bg-card border-border/20 text-[13px] text-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
          </div>

          {/* Project Filter */}
          <FilterProjectPopover
            value={selectedProjects}
            projects={allProjects}
            onChange={setSelectedProjects}
          />
        </div>
      </div>

      {/* Line Chart */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-border/20 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-medium text-muted-foreground">Spend Over Time</p>
            <div className="flex items-center gap-1 rounded-lg border border-border/20 bg-muted p-1">
              {availableGroupings.map((g) => (
                <button
                  key={g}
                  onClick={() => setTimeGrouping(g)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors duration-150 ${
                    timeGrouping === g
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <LineChart 
            data={chartData} 
            projectNames={selectedProjects.length > 0 && selectedProjects.length <= 3 
              ? selectedProjects.map(id => allProjects.find(p => p.id === id)?.name || 'Unknown').join(', ')
              : undefined
            }
          />
          {selectedProjects.length > 0 && (
            <p className="text-[11px] text-muted-foreground/60 italic mt-3">Chart shows usage across all projects</p>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border/20 bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground mb-1">Total Tokens</p>
          <p className="text-xl font-semibold text-foreground">{formatTokens(filteredData.total_tokens)}</p>
        </div>
        <div className="rounded-lg border border-border/20 bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground mb-1">Total Cost</p>
          <p className="text-xl font-semibold text-indigo-500">{formatUSD(filteredData.total_cost)}</p>
        </div>
        <div className="rounded-lg border border-border/20 bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground mb-1">Max Included</p>
          <p className="text-xl font-semibold text-emerald-500">{maxPercentage.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-border/20 bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground mb-1">API Spend</p>
          <p className="text-xl font-semibold text-amber-500">{apiPercentage.toFixed(1)}%</p>
        </div>
      </div>

      {/* Four Breakdown Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* By Agent */}
        {filteredData.breakdown_by_agent.length > 0 && (
          <div className="rounded-lg border border-border/20 bg-card p-5">
            <p className="text-[11px] font-medium text-muted-foreground mb-4">By Agent</p>
            <div className="space-y-2.5">
              {filteredData.breakdown_by_agent
                .sort((a, b) => b.total_tokens - a.total_tokens)
                .map((agent) => {
                  const widthPercent = (agent.total_tokens / maxAgentTokens) * 100;
                  return (
                    <div key={agent.agent} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-foreground truncate">{agent.agent}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-muted-foreground">{formatTokens(agent.total_tokens)}</span>
                          <span className="text-[11px] text-muted-foreground/60">{formatUSD(agent.total_cost)}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-300"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* By Project */}
        {filteredData.breakdown_by_project.length > 0 && (
          <div className="rounded-lg border border-border/20 bg-card p-5">
            <p className="text-[11px] font-medium text-muted-foreground mb-4">By Project</p>
            <div className="space-y-2.5">
              {filteredData.breakdown_by_project
                .sort((a, b) => b.total_tokens - a.total_tokens)
                .map((project) => {
                  const widthPercent = (project.total_tokens / maxProjectTokens) * 100;
                  return (
                    <div key={project.project_id} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-foreground truncate">{project.project_name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-muted-foreground">{formatTokens(project.total_tokens)}</span>
                          <span className="text-[11px] text-muted-foreground/60">{formatUSD(project.total_cost)}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* By Model */}
        {filteredData.breakdown_by_model.length > 0 && (
          <div className="rounded-lg border border-border/20 bg-card p-5">
            <p className="text-[11px] font-medium text-muted-foreground mb-4">By Model</p>
            <div className="space-y-2.5">
              {filteredData.breakdown_by_model
                .sort((a, b) => b.total_tokens - a.total_tokens)
                .map((model) => {
                  const widthPercent = (model.total_tokens / maxModelTokens) * 100;
                  return (
                    <div key={model.model} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-medium text-foreground truncate">{model.model}</span>
                          {model.is_claude_max ? (
                            <span className="shrink-0 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                              Max
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-md bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                              API
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-muted-foreground">{formatTokens(model.total_tokens)}</span>
                          <span className="text-[11px] text-muted-foreground/60">{formatUSD(model.total_cost)}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            model.is_claude_max
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                              : 'bg-gradient-to-r from-amber-500 to-amber-400'
                          }`}
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* By Provider */}
        {filteredData.breakdown_by_provider.length > 0 && (
          <div className="rounded-lg border border-border/20 bg-card p-5">
            <p className="text-[11px] font-medium text-muted-foreground mb-4">By Provider</p>
            <div className="space-y-2.5">
              {filteredData.breakdown_by_provider
                .sort((a, b) => b.total_tokens - a.total_tokens)
                .map((provider) => {
                  const widthPercent = (provider.total_tokens / maxProviderTokens) * 100;
                  return (
                    <div key={provider.provider} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-foreground truncate">{provider.provider}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-muted-foreground">{formatTokens(provider.total_tokens)}</span>
                          <span className="text-[11px] text-muted-foreground/60">{formatUSD(provider.total_cost)}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${getProviderColour(provider.provider)}`}
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Daily Breakdown Table */}
      {filteredData.breakdown_by_day.length > 0 && (
        <div className="rounded-lg border border-border/20 bg-card p-5">
          <p className="text-[11px] font-medium text-muted-foreground mb-4">Daily Breakdown</p>
          <div className="rounded-lg border border-border/20 bg-muted overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-muted">
                  <tr className="border-b border-border/20">
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Date</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-medium">Tokens</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.breakdown_by_day.map((day) => (
                    <tr key={day.date} className="border-b border-border/20 last:border-0 hover:bg-muted/60 transition-colors duration-150">
                      <td className="px-3 py-2 text-muted-foreground">{day.date}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatTokens(day.total_tokens)}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatUSD(day.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Line Chart Component
function LineChart({ data, projectNames }: { data: ChartDataPoint[]; projectNames?: string }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  if (data.length === 0) return null;
  
  const width = 1200;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = 0;
  
  // Generate Y-axis labels (5 ticks)
  const yTicks = 5;
  const yStep = maxValue / (yTicks - 1);
  const yLabels = Array.from({ length: yTicks }, (_, i) => ({
    value: maxValue - i * yStep,
    y: padding.top + (i * chartHeight) / (yTicks - 1),
  }));
  
  // Calculate points — always start from left edge
  const points = data.map((d, i) => {
    const x = data.length === 1 ? padding.left : padding.left + (i / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.value - minValue) / (maxValue - minValue)) * chartHeight;
    return { x, y, data: d };
  });
  
  // Create path for line
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  // Create path for gradient fill
  const areaPath = `M ${padding.left} ${padding.top + chartHeight} L ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${padding.left + chartWidth} ${padding.top + chartHeight} Z`;
  
  return (
    <div className="relative w-full" style={{ maxHeight: '220px' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {yLabels.map((label, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={label.y}
            x2={padding.left + chartWidth}
            y2={label.y}
            className="stroke-border/20"
            strokeWidth="1"
          />
        ))}
        
        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGradient)" />
        
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          className="stroke-indigo-500"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Hover vertical line */}
        {hoveredIndex !== null && (
          <line
            x1={points[hoveredIndex].x}
            y1={padding.top}
            x2={points[hoveredIndex].x}
            y2={padding.top + chartHeight}
            className="stroke-border/40"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        )}
        
        {/* Data points */}
        {points.map((p, i) => {
          // Calculate column width for hover area
          const columnWidth = Math.min(chartWidth / data.length, 80);
          
          return (
            <g key={i}>
              {/* Full-height invisible hit area */}
              <rect
                x={p.x - columnWidth / 2}
                y={padding.top}
                width={columnWidth}
                height={chartHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === i ? 5 : 3}
                className="fill-indigo-500 transition-all duration-150 pointer-events-none"
              />
            </g>
          );
        })}
        
        {/* Y-axis labels */}
        {yLabels.map((label, i) => (
          <text
            key={i}
            x={padding.left - 8}
            y={label.y}
            textAnchor="end"
            alignmentBaseline="middle"
            fontSize="11"
            className="fill-muted-foreground"
          >
            ${label.value.toFixed(2)}
          </text>
        ))}
        
        {/* X-axis labels */}
        {points.map((p, i) => {
          const showLabel = data.length <= 10 || i % Math.ceil(data.length / 10) === 0 || i === data.length - 1;
          if (!showLabel) return null;
          
          return (
            <text
              key={i}
              x={p.x}
              y={padding.top + chartHeight + 18}
              textAnchor="middle"
              fontSize="11"
              className="fill-muted-foreground"
            >
              {p.data.label}
            </text>
          );
        })}
      </svg>
      
      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div
          className="absolute bg-card border border-border/20 rounded-lg px-3 py-2 shadow-lg pointer-events-none z-10"
          style={{
            left: `${(points[hoveredIndex].x / width) * 100}%`,
            top: `${(points[hoveredIndex].y / height) * 100}%`,
            transform: `translate(${points[hoveredIndex].x > width * 0.8 ? '-100%' : points[hoveredIndex].x < width * 0.2 ? '0%' : '-50%'}, -120%)`,
          }}
        >
          <p className="text-[11px] font-medium text-foreground whitespace-nowrap">{data[hoveredIndex].label}</p>
          <p className="text-[13px] font-semibold text-primary">${data[hoveredIndex].value.toFixed(2)}</p>
          <p className="text-[11px] text-muted-foreground whitespace-nowrap">{data[hoveredIndex].tokens.toLocaleString()} tokens</p>
          {projectNames && (
            <p className="text-[11px] text-muted-foreground/60 whitespace-nowrap mt-1">Projects: {projectNames}</p>
          )}
        </div>
      )}
    </div>
  );
}
