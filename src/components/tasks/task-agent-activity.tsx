'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X } from 'lucide-react';

interface AgentFlowEntry {
  id: string;
  task_id: string | null;
  task_title: string | null;
  agent_id: string;
  action: string;
  details: string | null;
  created_at: string;
}

// Agent display info mapping
const AGENT_INFO: Record<string, { name: string; emoji: string }> = {
  casper: { name: 'Casper', emoji: '👻' },
  developer: { name: 'Developer', emoji: '💻' },
  'ui-designer': { name: 'Designer', emoji: '🎨' },
  'qa-tester': { name: 'QA Tester', emoji: '🔍' },
  analyst: { name: 'Analyst', emoji: '📊' },
  copywriter: { name: 'Copywriter', emoji: '✍️' },
};

// Allowed actions to display
const ALLOWED_ACTIONS = ['completed', 'qa_approved', 'qa_rejected', 'approved', 'rejected'];
// We also need 'started' for duration calc but only show it if no completed exists
const ALL_ACTIONS = ['started', ...ALLOWED_ACTIONS];

function formatDuration(ms: number): string {
  const diffSec = Math.floor(ms / 1000);
  const minutes = Math.floor(diffSec / 60);
  const seconds = diffSec % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

interface TimelineEntry {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_emoji: string;
  action: string;
  description: string | null;
  duration: string | null;
  created_at: string;
}

interface TaskAgentActivityProps {
  taskId: string;
}

export function TaskAgentActivity({ taskId }: TaskAgentActivityProps) {
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_flow_log')
        .select('id,task_id,task_title,agent_id,action,details,created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const entries = (data || []) as AgentFlowEntry[];

      // Filter to relevant actions
      const relevant = entries.filter((e) => ALL_ACTIONS.includes(e.action));

      // Build timeline
      const timeline: TimelineEntry[] = [];

      for (let i = 0; i < relevant.length; i++) {
        const entry = relevant[i];
        const agentInfo = AGENT_INFO[entry.agent_id] || { name: entry.agent_id, emoji: '👤' };

        // Skip 'started' entries — we only use them for duration calculation
        if (entry.action === 'started') {
          // Check if there's a later completed/qa entry for this agent
          const hasLater = relevant.some(
            (e, j) =>
              j > i &&
              e.agent_id === entry.agent_id &&
              ['completed', 'qa_approved', 'qa_rejected', 'approved', 'rejected'].includes(e.action)
          );
          if (hasLater) continue; // Skip — will show duration on the completed entry

          // No completed entry yet — show as in progress (no timer)
          timeline.push({
            id: entry.id,
            agent_id: entry.agent_id,
            agent_name: agentInfo.name,
            agent_emoji: agentInfo.emoji,
            action: 'started',
            description: null,
            duration: null,
            created_at: entry.created_at,
          });
          continue;
        }

        // For completed/approved/rejected — find the most recent 'started' before this
        let duration: string | null = null;
        const startedEntry = relevant
          .filter(
            (e) =>
              e.agent_id === entry.agent_id &&
              e.action === 'started' &&
              new Date(e.created_at).getTime() < new Date(entry.created_at).getTime()
          )
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        if (startedEntry) {
          const ms = new Date(entry.created_at).getTime() - new Date(startedEntry.created_at).getTime();
          duration = formatDuration(ms);
        }

        // For QA entries, if no started entry exists for qa-tester, try to calc from
        // the previous entry (the completed developer entry) to this QA entry
        if (!startedEntry && ['qa_approved', 'qa_rejected', 'approved', 'rejected'].includes(entry.action)) {
          // Find the previous entry in timeline order
          const prevEntry = relevant.filter(
            (e) => new Date(e.created_at).getTime() < new Date(entry.created_at).getTime()
          ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

          if (prevEntry) {
            const ms = new Date(entry.created_at).getTime() - new Date(prevEntry.created_at).getTime();
            duration = formatDuration(ms);
          }
        }

        timeline.push({
          id: entry.id,
          agent_id: entry.agent_id,
          agent_name: agentInfo.name,
          agent_emoji: agentInfo.emoji,
          action: entry.action,
          description: entry.details,
          duration,
          created_at: entry.created_at,
        });
      }

      // Newest first
      setTimelineEntries(timeline.reverse());
    } catch (e) {
      console.error('Failed to fetch agent activity:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();

    const channel = supabase
      .channel(`agent-activity-${taskId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_flow_log', filter: `task_id=eq.${taskId}` },
        () => fetchEntries()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [taskId]);

  if (loading) {
    return (
      <div className="px-5 py-3">
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
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

  if (timelineEntries.length === 0) {
    return (
      <div className="px-5 py-8">
        <p className="text-[13px] text-muted-foreground/40 text-center">No agent activity yet</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-3">
      <div className="space-y-1.5">
        {timelineEntries.map((entry) => {
          const isQaApproved = entry.action === 'qa_approved' || entry.action === 'approved';
          const isQaRejected = entry.action === 'qa_rejected' || entry.action === 'rejected';
          const isStarted = entry.action === 'started';
          const isCompleted = entry.action === 'completed';

          return (
            <div key={entry.id} className="flex items-start gap-2 px-2 py-1.5">
              <span className="text-[11px] text-muted-foreground/60 font-mono tabular-nums shrink-0 min-w-[40px] pt-0.5">
                {formatTime(entry.created_at)}
              </span>
              <span className="text-sm shrink-0">{entry.agent_emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground/80 font-medium">
                    {entry.agent_name}
                  </span>

                  {isCompleted && (
                    <>
                      <span className="text-[11px] text-muted-foreground">completed</span>
                      {entry.duration && (
                        <span className="text-[11px] text-muted-foreground/60">— {entry.duration}</span>
                      )}
                    </>
                  )}

                  {isStarted && (
                    <span className="text-[11px] text-muted-foreground/60">In progress</span>
                  )}

                  {isQaApproved && (
                    <>
                      {entry.duration && (
                        <span className="text-[11px] text-muted-foreground/60">{entry.duration} —</span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <Check className="h-3 w-3" />
                        Approved
                      </span>
                    </>
                  )}

                  {isQaRejected && (
                    <>
                      {entry.duration && (
                        <span className="text-[11px] text-muted-foreground/60">{entry.duration} —</span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-red-400">
                        <X className="h-3 w-3" />
                        Rejected
                      </span>
                    </>
                  )}
                </div>
                {entry.description && (isQaRejected || isQaApproved) && (
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5 line-clamp-2">
                    {entry.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
