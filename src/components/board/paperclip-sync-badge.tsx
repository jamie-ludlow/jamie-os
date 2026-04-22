'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Paperclip } from 'lucide-react';
import { getPaperclipIdentifier, getPaperclipSyncState } from '@/lib/paperclip-sync';

interface PaperclipSyncBadgeProps {
  task: Pick<Task, 'external_source' | 'external_id' | 'external_url' | 'external_metadata' | 'external_updated_at'> | null;
  compact?: boolean;
}

export function PaperclipSyncBadge({ task, compact = false }: PaperclipSyncBadgeProps) {
  const state = getPaperclipSyncState(task);
  if (!state) return null;

  const identifier = getPaperclipIdentifier(task);
  const isSynced = state === 'synced';
  const isFailed = state === 'failed';
  const isLocal = state === 'local';
  const label = isSynced
    ? (identifier ? `${identifier} · synced` : 'Paperclip synced')
    : isFailed
      ? 'Paperclip sync failed'
      : isLocal
        ? 'Local task'
        : 'Paperclip draft';
  const tooltip = isSynced
    ? 'This task is linked to a Paperclip issue and has been synced into Jamie OS.'
    : isFailed
      ? 'Jamie OS has Paperclip metadata for this task, but the latest sync failed.'
      : isLocal
        ? 'This task is local-only and is not linked to Paperclip.'
        : 'This task carries Paperclip metadata but has not fully synced yet.';
  const updatedAt = task?.external_updated_at
    ? new Date(task.external_updated_at).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'h-5 rounded-full border px-1.5 py-0 text-[10px] font-medium leading-none',
              isSynced
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : isFailed
                  ? 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  : isLocal
                    ? 'border-slate-500/25 bg-slate-500/10 text-slate-700 dark:text-slate-300'
                    : 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
              compact ? 'gap-0.5' : 'gap-1',
            )}
          >
            <Paperclip className="h-2.5 w-2.5" aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-[13px]">
          <div className="space-y-1">
            <p>{tooltip}</p>
            {identifier && <p className="text-muted-foreground/70 text-[12px]">Linked issue {identifier}</p>}
            {updatedAt && isSynced && (
              <p className="text-muted-foreground/70 text-[12px]">Last sync {updatedAt}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
