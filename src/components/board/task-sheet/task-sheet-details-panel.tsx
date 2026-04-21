'use client';

import dynamic from 'next/dynamic';
import type { Task } from '@/lib/types';
import { Paperclip, ExternalLink } from 'lucide-react';
import { getPaperclipIdentifier, getPaperclipSyncState } from '@/lib/paperclip-sync';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { CollapsibleAttachments, type TaskAttachment } from '../task-attachments';
import { InteractiveSubtasks } from '../subtask-list';

// Dynamic import to avoid SSR issues with Tiptap
const TaskDescriptionEditor = dynamic(
  () =>
    import('@/components/board/task-description-editor').then(mod => ({
      default: mod.TaskDescriptionEditor,
    })),
  { ssr: false },
);

interface TaskSheetDetailsPanelProps {
  task?: Task | null;
  description: string;
  onDescriptionChange: (html: string) => void;
  attachments: TaskAttachment[];
  onAttachmentsAdd: (files: FileList) => Promise<void>;
  onAttachmentDelete: (id: string) => Promise<void>;
  onAttachmentRename: (id: string, name: string) => Promise<void>;
  uploadingAttachment: boolean;
  subtasks: (Task & { project_name?: string; project_color?: string })[];
  onSubtasksUpdate: (
    updated: (Task & { project_name?: string; project_color?: string })[],
  ) => void;
  onSubtaskClick: (id: string) => void;
  onAddSubtask: () => Promise<void>;
}

export function TaskSheetDetailsPanel({
  task,
  description,
  onDescriptionChange,
  attachments,
  onAttachmentsAdd,
  onAttachmentDelete,
  onAttachmentRename,
  uploadingAttachment,
  subtasks,
  onSubtasksUpdate,
  onSubtaskClick,
  onAddSubtask,
}: TaskSheetDetailsPanelProps) {
  const paperclipState = getPaperclipSyncState(task ?? null);
  const paperclipIdentifier = getPaperclipIdentifier(task ?? null);

  return (
    <div>
      {paperclipState && (
        <>
          <div className="px-5 py-3">
            <div className="rounded-xl border border-border/20 bg-muted/20 px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                    <Paperclip size={13} className="text-muted-foreground/70" />
                    <span>Paperclip</span>
                  </div>
                  <div className="text-[13px] text-muted-foreground/80">
                    {paperclipState === 'synced'
                      ? 'Synced with Paperclip'
                      : paperclipState === 'failed'
                        ? 'Paperclip sync failed'
                        : paperclipState === 'local'
                          ? 'Local-only task (not linked to Paperclip)'
                          : 'Paperclip draft / not fully synced yet'}
                  </div>
                  {paperclipIdentifier && (
                    <div className="text-[12px] text-muted-foreground/70">Linked issue: {paperclipIdentifier}</div>
                  )}
                </div>
                {task?.external_url && (
                  <a
                    href={task.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border/20 px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-150"
                  >
                    <ExternalLink size={12} />
                    Open
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="mx-5 border-t border-border/20" />
        </>
      )}

      {/* Description */}
      <div className="px-5 py-3">
        <ErrorBoundary
          fallbackTitle="Editor error"
          fallbackSubtitle="The description editor encountered an error."
        >
          <TaskDescriptionEditor
            content={description}
            onChange={onDescriptionChange}
            placeholder="Add description..."
          />
        </ErrorBoundary>
      </div>

      <div className="mx-5 border-t border-border/20" />

      {/* Attachments */}
      <div className="px-5 py-3">
        <CollapsibleAttachments
          attachments={attachments}
          onAdd={onAttachmentsAdd}
          onDelete={onAttachmentDelete}
          onRename={onAttachmentRename}
          uploading={uploadingAttachment}
        />
      </div>

      <div className="mx-5 border-t border-border/20" />

      {/* Subtasks — optimistic instant updates */}
      <div className="px-5 py-3">
        <InteractiveSubtasks
          subtasks={subtasks}
          onUpdate={onSubtasksUpdate}
          onSubtaskClick={onSubtaskClick}
          onAdd={onAddSubtask}
          showProgress
        />
      </div>
    </div>
  );
}
