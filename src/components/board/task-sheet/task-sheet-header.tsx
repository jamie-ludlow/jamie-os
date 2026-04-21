'use client';

import type { Task } from '@/lib/types';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Zap, Link2, Copy, Check, Trash2, X } from 'lucide-react';
import { KeyboardShortcutsCheatSheet } from '@/components/tasks/keyboard-shortcuts';
import { formatTimestamp } from './task-sheet-utils';

interface TaskSheetHeaderProps {
  task: (Task & { project_name?: string; project_color?: string }) | null;
  isNew?: boolean;
  onClose: () => void;
  onDelete?: () => void;
  copiedLink: boolean;
  onCopyLink: () => void;
  onDuplicate: () => void;
  onDeleteClick: () => void;
}

export function TaskSheetHeader({
  task,
  isNew,
  onClose,
  onDelete,
  copiedLink,
  onCopyLink,
  onDuplicate,
  onDeleteClick,
}: TaskSheetHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground/30">
        {task?.status === 'done' && task?.completed_at ? (
          <span className="text-emerald-400/60">Completed {formatTimestamp(task.completed_at)}</span>
        ) : (
          <>
            {task?.created_at && <span>Created {formatTimestamp(task.created_at)}</span>}
            {task?.updated_at && task.updated_at !== task.created_at && (
              <>
                <span>·</span>
                <span>Updated {formatTimestamp(task.updated_at)}</span>
              </>
            )}
          </>
        )}
        {!task && <span>New task</span>}
      </div>
      <div className="flex items-center gap-0.5">
        {/* Keyboard shortcuts */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              tabIndex={-1}
              aria-label="Keyboard shortcuts"
              className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground/30 hover:text-muted-foreground transition-colors duration-150"
            >
              <Zap size={14} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="p-0 bg-popover border-border/20">
            <KeyboardShortcutsCheatSheet />
          </TooltipContent>
        </Tooltip>

        {/* Copy link */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              tabIndex={-1}
              aria-label="Copy link"
              onClick={onCopyLink}
              className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground/30 hover:text-muted-foreground transition-colors duration-150"
            >
              {copiedLink ? (
                <Check size={14} className="text-status-success" aria-hidden="true" />
              ) : (
                <Link2 size={14} aria-hidden="true" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{copiedLink ? 'Copied!' : 'Copy link'}</TooltipContent>
        </Tooltip>

        {/* Duplicate */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              tabIndex={-1}
              aria-label="Duplicate task"
              onClick={onDuplicate}
              className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground/30 hover:text-muted-foreground transition-colors duration-150"
            >
              <Copy size={14} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Duplicate</TooltipContent>
        </Tooltip>

        {/* Delete */}
        {!isNew && onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                tabIndex={-1}
                aria-label="Delete task"
                onClick={onDeleteClick}
                className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground/30 hover:text-destructive transition-colors duration-150"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Delete</TooltipContent>
          </Tooltip>
        )}

        <button
          tabIndex={-1}
          aria-label="Close"
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted/40 transition-colors duration-150 text-muted-foreground hover:text-foreground"
        >
          <X size={11} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
