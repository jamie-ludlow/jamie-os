'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronDown, ChevronUp, Check, Search } from 'lucide-react';
import { FilterAgentPopover } from './filter-agent-popover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface FlowEntry {
  id: string;
  task_id: string | null;
  task_title: string;
  agent_id: string;
  agent_name: string;
  agent_emoji: string;
  action: string;
  details: string | null;
  created_at: string;
}

interface CombinedEntry {
  id: string; // Use completed id if exists, otherwise started id
  task_id: string | null;
  task_title: string;
  agent_id: string;
  agent_name: string;
  agent_emoji: string;
  action: string; // 'completed' if completed, 'started' if only started
  details: string | null;
  created_at: string; // Completed timestamp if exists, otherwise started
  started_at: string | null; // Store start time for duration calculation
}

type StatusFilter = 'all' | 'active' | 'completed';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // If today, show time
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  
  // If within 24h, show relative
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h ago`;
  }
  
  // Otherwise show date
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function formatDuration(startTime: string, endTime?: string): string {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

function stripCommonPrefixes(title: string): string {
  // Strip common prefixes to make descriptions more concise
  const prefixes = ['Activity feed:', 'Activity Feed:', 'activity feed:'];
  for (const prefix of prefixes) {
    if (title.startsWith(prefix)) {
      return title.slice(prefix.length).trim();
    }
  }
  return title;
}

function formatFriendlyDescription(entry: CombinedEntry): string {
  const taskTitle = stripCommonPrefixes(entry.task_title);
  const truncated = taskTitle.length > 50 ? taskTitle.slice(0, 50) + '...' : taskTitle;
  
  switch (entry.action) {
    case 'started':
      return `Working on: ${truncated}`;
    case 'completed':
      // Use past tense, make task description the focus
      // Convert first char to lowercase for natural flow
      const desc = truncated.charAt(0).toLowerCase() + truncated.slice(1);
      return `Completed: ${desc}`;
    case 'qa_approved':
      return `Approved: ${truncated}`;
    case 'qa_rejected':
      return `Rejected: ${truncated}`;
    default:
      return truncated;
  }
}

function getActionColor(action: string): string {
  if (action === 'started') return 'text-emerald-500';
  if (action === 'qa_rejected') return 'text-destructive';
  return 'text-muted-foreground';
}

function StatusFilterButton({ 
  value, 
  onChange 
}: { 
  value: StatusFilter; 
  onChange: (value: StatusFilter) => void;
}) {
  const [open, setOpen] = useState(false);

  const options: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
  ];

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          aria-label="Filter by status" 
          className={`h-8 px-3 text-[13px] rounded-lg border transition-colors duration-150 flex items-center gap-1.5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none ${
            value !== 'all' ? 'border-primary text-primary' : 'border-border/20 bg-secondary text-foreground hover:border-primary/50'
          }`}
        >
          <span>{selectedOption.label}</span>
          <ChevronDown size={12} className="text-muted-foreground/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[13px] hover:bg-muted/60 transition-colors duration-150 ${
                isSelected ? 'bg-muted/50' : ''
              }`}
            >
              <span>{option.label}</span>
              {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function ActivityFeed() {
  const [entries, setEntries] = useState<CombinedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [agentFilter, setAgentFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [displayLimit, setDisplayLimit] = useState(20);

  // Update current time every second for live duration updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      // Fetch agents metadata first (single call)
      const agentsRes = await fetch('/api/agents');
      if (!agentsRes.ok) throw new Error('Failed to fetch agents');
      const agentsData = await agentsRes.json();
      const agentMap = new Map(
        (agentsData.agents || []).map((a: { id: string; name: string; emoji: string }) => [
          a.id,
          { name: a.name, emoji: a.emoji },
        ])
      );

      // Fetch current agent_status to determine truly active agents
      const { data: statusData } = await supabase
        .from('agent_status')
        .select('id, status, current_task');
      
      const activeAgentIds = new Set(
        (statusData || [])
          .filter((s) => s.status === 'active')
          .map((s) => s.id)
      );

      // Fetch all recent flow entries directly from Supabase
      const { data: flowData, error } = await supabase
        .from('agent_flow_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Fetch more to ensure we get pairs

      if (error) throw error;

      // Enrich with agent metadata
      const enriched: FlowEntry[] = (flowData || []).map((entry) => {
        const agent = agentMap.get(entry.agent_id) as { name: string; emoji: string } | undefined;
        return {
          ...entry,
          agent_name: agent?.name || entry.agent_id,
          agent_emoji: agent?.emoji || '👤',
        };
      });

      // Filter out internal noise early: received, queued, dispatched
      const filtered = enriched.filter(
        (e) => !['received', 'queued', 'dispatched'].includes(e.action)
      );

      // Group by task_title + agent_id to find started+completed pairs
      const grouped = new Map<string, FlowEntry[]>();
      for (const entry of filtered) {
        // QA actions are separate events, don't group them
        if (['qa_approved', 'qa_rejected'].includes(entry.action)) {
          grouped.set(`${entry.id}::${entry.action}`, [entry]);
        } else {
          const key = `${entry.task_title}::${entry.agent_id}`;
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(entry);
        }
      }

      // Create combined entries
      const combined: CombinedEntry[] = [];
      for (const [key, group] of grouped) {
        // Sort by created_at (newest first already, but ensure)
        group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const startedEntry = group.find((e) => e.action === 'started');
        const completedEntry = group.find((e) => e.action === 'completed');

        if (completedEntry) {
          // Show as completed with start time for duration
          combined.push({
            ...completedEntry,
            started_at: startedEntry?.created_at || null,
          });
        } else if (startedEntry) {
          // Only show as active if agent_status confirms it's truly active
          if (activeAgentIds.has(startedEntry.agent_id)) {
            combined.push({
              ...startedEntry,
              started_at: startedEntry.created_at,
            });
          }
          // Otherwise it's stale — agent is idle but flow log hasn't been updated
        } else {
          // QA or other single events
          combined.push({
            ...group[0],
            started_at: null,
          });
        }
      }

      // Sort combined by created_at (newest first)
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setEntries(combined);
    } catch (e) {
      console.error('Failed to fetch activity:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();

    // Realtime subscription for both flow log and agent status
    const channel = supabase
      .channel('activity-feed-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_flow_log' }, () => {
        fetchEntries().catch(() => {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_status' }, () => {
        fetchEntries().catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEntries]);

  // Unique agents for filter
  const uniqueAgents = useMemo(() => {
    const seen = new Map<string, { name: string; emoji: string }>();
    entries.forEach((e) => {
      if (!seen.has(e.agent_id)) seen.set(e.agent_id, { name: e.agent_name, emoji: e.agent_emoji });
    });
    return Array.from(seen.entries()).map(([id, a]) => ({ id, ...a }));
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let result = entries;
    
    // Agent filter
    if (agentFilter.length > 0) {
      result = result.filter((e) => agentFilter.includes(e.agent_id));
    }
    
    // Status filter
    if (statusFilter === 'active') {
      result = result.filter((e) => e.action === 'started');
    } else if (statusFilter === 'completed') {
      result = result.filter((e) => e.action === 'completed');
    }
    
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => {
        const friendlyDesc = formatFriendlyDescription(e).toLowerCase();
        return (
          friendlyDesc.includes(q) ||
          e.task_title.toLowerCase().includes(q) ||
          (e.details?.toLowerCase().includes(q)) ||
          e.action.toLowerCase().includes(q)
        );
      });
    }
    
    return result;
  }, [entries, agentFilter, statusFilter, searchQuery]);

  // Display entries (limited)
  const displayedEntries = useMemo(() => {
    return filteredEntries.slice(0, displayLimit);
  }, [filteredEntries, displayLimit]);

  const hasMore = filteredEntries.length > displayLimit;

  if (loading) {
    return (
      <div className="rounded-lg border border-border/20 bg-card/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-medium text-muted-foreground">Activity</p>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-12 rounded bg-muted animate-pulse" />
              <div className="h-3 w-6 rounded bg-muted animate-pulse" />
              <div className="h-3 flex-1 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/20 bg-card/50 backdrop-blur-sm">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors duration-150 rounded-t-lg"
      >
        <p className="text-[13px] font-medium text-muted-foreground">Activity</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground/60">{filteredEntries.length} events</span>
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Filters + Search */}
      {!collapsed && (
        <div className="px-3 pb-2 flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activity..."
              aria-label="Search activity"
              className="h-7 w-[180px] pl-7 pr-3 text-[11px] bg-secondary border border-border/20 rounded-lg outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors duration-150 placeholder:text-muted-foreground/60"
            />
          </div>
          {/* Status filter */}
          <StatusFilterButton value={statusFilter} onChange={setStatusFilter} />
          {/* Agent filter popover */}
          <FilterAgentPopover
            agents={uniqueAgents}
            value={agentFilter}
            onChange={setAgentFilter}
          />
        </div>
      )}

      {/* Feed */}
      {!collapsed && (
        <div className="activity-feed-scroll max-h-[200px] overflow-y-auto px-2 pb-2">
          {filteredEntries.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/40 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-1">
              {displayedEntries.map((entry, idx) => {
                const isExpanded = expandedId === entry.id;
                const friendlyDesc = formatFriendlyDescription(entry);
                const isActive = entry.action === 'started';
                
                return (
                  <div
                    key={entry.id}
                    className="animate-in fade-in slide-in-from-top-2"
                    style={{ animationDelay: `${idx * 20}ms` }}
                  >
                    {/* Main row - clickable */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      aria-expanded={isExpanded}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors duration-150 cursor-pointer text-left"
                    >
                      {/* Timestamp */}
                      <span className="text-[11px] text-muted-foreground/60 font-mono tabular-nums shrink-0 min-w-[45px]">
                        {formatTime(entry.created_at)}
                      </span>

                      {/* Agent emoji */}
                      <span className="text-sm shrink-0">{entry.agent_emoji}</span>

                      {/* Friendly description */}
                      <span className={`text-[11px] truncate ${getActionColor(entry.action)}`}>
                        {friendlyDesc}
                      </span>
                    </button>

                    {/* Expanded detail panel */}
                    <div className={`grid transition-all duration-200 ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <div className="ml-4 border-t border-border/10 mt-1 pt-1 pb-1 space-y-1">
                          {/* Full task title */}
                          <p className="text-[11px] text-muted-foreground/60">
                            <span className="font-medium">Task:</span> {entry.task_title}
                          </p>

                          {/* Duration (if we have start time) */}
                          {entry.started_at && (
                            <p className="text-[11px] text-muted-foreground/60">
                              <span className="font-medium">Duration:</span>{' '}
                              {isActive ? (
                                <span className="text-emerald-500">
                                  In progress — {formatDuration(entry.started_at)} so far
                                </span>
                              ) : (
                                formatDuration(entry.started_at, entry.created_at)
                              )}
                            </p>
                          )}

                          {/* Full details */}
                          {entry.details && (
                            <p className="text-[11px] text-muted-foreground/60">
                              <span className="font-medium">Details:</span> {entry.details}
                            </p>
                          )}

                          {/* Full timestamp with date */}
                          <p className="text-[11px] text-muted-foreground/60">
                            <span className="font-medium">Time:</span>{' '}
                            {new Date(entry.created_at).toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Show more button */}
              {hasMore && (
                <div className="pt-2">
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 20)}
                    className="w-full px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-border/20 rounded-md hover:bg-muted/40 transition-colors duration-150"
                  >
                    Show more ({filteredEntries.length - displayLimit} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Scrollbar styles injected at runtime (Tailwind v4 purges attribute selectors) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .activity-feed-scroll::-webkit-scrollbar { width: 6px; }
        .activity-feed-scroll::-webkit-scrollbar-track { background: transparent; }
        .activity-feed-scroll::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.2); border-radius: 3px; }
        .activity-feed-scroll::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.3); }
      `}} />
    </div>
  );
}
