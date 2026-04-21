'use client';

import type { Task, Project } from '@/lib/types';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Paperclip, ChevronLeft } from 'lucide-react';
import { SubtaskDetailView } from './subtask-detail';
import { TaskSheetHeader } from './task-sheet/task-sheet-header';
import { TaskSheetTitle } from './task-sheet/task-sheet-title';
import { TaskSheetProperties } from './task-sheet/task-sheet-properties';
import { TaskSheetComments } from './task-sheet/task-sheet-comments';
import { TaskSheetActivity } from './task-sheet/task-sheet-activity';
import { TaskSheetTabs } from './task-sheet/task-sheet-tabs';
import { TaskSheetDetailsPanel } from './task-sheet/task-sheet-details-panel';
import { TaskSheetFooter } from './task-sheet/task-sheet-footer';
import { useTaskSheetLogic } from './task-sheet/use-task-sheet-logic';

interface TaskSheetProps {
  task: (Task & { project_name?: string; project_color?: string }) | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Task>, opts?: { optimistic?: boolean; taskId?: string }) => void;
  onDelete?: () => void;
  projects: Project[];
  isNew?: boolean;
  allTasks?: (Task & { project_name?: string; project_color?: string })[];
  onTaskClick?: (task: Task & { project_name?: string; project_color?: string }) => void;
  allLabels?: string[];
}

export function TaskSheet({
  task,
  open,
  onClose,
  onSave,
  onDelete,
  projects,
  isNew,
  allTasks = [],
  onTaskClick,
  allLabels: allLabelsProp,
}: TaskSheetProps) {
  const {
    form,
    setForm,
    comments,
    newComment,
    setNewComment,
    attachments,
    uploadingAttachment,
    activityLog,
    subtasks,
    activeTab,
    setActiveTab,
    copiedLink,
    isDragging,
    sheetWidth,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteCommentId,
    setDeleteCommentId,
    activeSubtaskId,
    setActiveSubtaskId,
    activeSubtask,
    closingSubtask,
    closeSubtask,
    statusOpen,
    setStatusOpen,
    priorityOpen,
    setPriorityOpen,
    assigneeOpen,
    setAssigneeOpen,
    startDateOpen,
    setStartDateOpen,
    dueDateOpen,
    setDueDateOpen,
    projectOpen,
    setProjectOpen,
    labelsOpen,
    setLabelsOpen,
    sheetRef,
    titleInputRef,
    commentInputRef,
    handleResizeMouseDown,
    handleCopyLink,
    handleDuplicate,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    addComment,
    deleteComment,
    uploadAttachments,
    deleteAttachment,
    renameAttachment,
    handleSubtasksUpdate,
    handleSubtaskUpdate,
    handleAddSubtask,
    handleDiscard,
    handleCreate,
    handleSheetOpenChange,
    allLabels,
  } = useTaskSheetLogic({
    task,
    open,
    onClose,
    onSave,
    onDelete,
    projects,
    isNew,
    allTasks,
    onTaskClick,
    allLabelsProp,
  });

  return (
    <TooltipProvider delayDuration={0}>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="right"
          className="bg-card border-l border-border/20 p-0 overflow-y-auto [&>button]:hidden rounded-none md:rounded-tl-2xl md:rounded-bl-2xl !w-full md:!w-[var(--sheet-width)] md:!max-w-[900px] md:!top-3 md:!bottom-3 md:!h-auto"
          style={{ '--sheet-width': `${sheetWidth}px` } as React.CSSProperties}
          showCloseButton={false}
          onOpenAutoFocus={e => e.preventDefault()}
          ref={sheetRef}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <ErrorBoundary
            fallbackTitle="Task details failed to load"
            fallbackSubtitle="Something went wrong loading this task. Try again."
          >
            {/* Resize drag handle */}
            <div
              onMouseDown={handleResizeMouseDown}
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group"
            >
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-primary/50 transition-colors duration-150" />
            </div>

            {/* Relative wrapper for absolute subtask panel overlay */}
            <div className="relative min-h-full">
              {/* Main content wrapper — dims when subtask panel is open */}
              <div
                className={`transition-all duration-300 ease-out ${activeSubtaskId ? 'opacity-15 scale-[0.96] cursor-pointer hover:opacity-70 hover:scale-[0.98]' : ''}`}
                onClick={activeSubtaskId ? closeSubtask : undefined}
              >
                {/* Header with close + actions */}
                <div className="px-5 pt-4 pb-3">
                  <TaskSheetHeader
                    task={task}
                    isNew={isNew}
                    onClose={onClose}
                    onDelete={onDelete}
                    copiedLink={copiedLink}
                    onCopyLink={handleCopyLink}
                    onDuplicate={handleDuplicate}
                    onDeleteClick={() => setDeleteDialogOpen(true)}
                  />

                  {/* Title input */}
                  <TaskSheetTitle
                    value={form.title}
                    onChange={title => setForm({ ...form, title })}
                    titleInputRef={titleInputRef}
                  />
                </div>

                {/* Property grid */}
                <TaskSheetProperties
                  form={form}
                  assigneeMetadata={task?.external_metadata ?? null}
                  onStatusChange={status => setForm({ ...form, status })}
                  onPriorityChange={priority => setForm({ ...form, priority })}
                  onAssigneeChange={assignee => setForm({ ...form, assignee })}
                  onProjectChange={project_id => setForm({ ...form, project_id })}
                  onStartDateChange={start_date => setForm(prev => ({ ...prev, start_date }))}
                  onDueDateChange={due_date => setForm(prev => ({ ...prev, due_date }))}
                  onDueTimeChange={due_time => setForm(prev => ({ ...prev, due_time }))}
                  onClearStartDate={() => setForm(prev => ({ ...prev, start_date: null }))}
                  onClearDueDate={() => setForm(prev => ({ ...prev, due_date: null, due_time: '' }))}
                  onLabelsChange={labels => setForm({ ...form, labels })}
                  projects={projects}
                  statusOpen={statusOpen}
                  setStatusOpen={setStatusOpen}
                  priorityOpen={priorityOpen}
                  setPriorityOpen={setPriorityOpen}
                  assigneeOpen={assigneeOpen}
                  setAssigneeOpen={setAssigneeOpen}
                  startDateOpen={startDateOpen}
                  setStartDateOpen={setStartDateOpen}
                  dueDateOpen={dueDateOpen}
                  setDueDateOpen={setDueDateOpen}
                  projectOpen={projectOpen}
                  setProjectOpen={setProjectOpen}
                  labelsOpen={labelsOpen}
                  setLabelsOpen={setLabelsOpen}
                  allLabels={allLabels}
                />

                <div className="mx-5 border-t border-border/20" />

                {/* Tab bar */}
                <TaskSheetTabs
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  commentCount={comments.length}
                  taskId={task?.id}
                />

                {/* Tab content */}
                {activeTab === 'details' && (
                  <TaskSheetDetailsPanel
                    description={form.description}
                    onDescriptionChange={html => setForm({ ...form, description: html })}
                    attachments={attachments}
                    onAttachmentsAdd={uploadAttachments}
                    onAttachmentDelete={deleteAttachment}
                    onAttachmentRename={renameAttachment}
                    uploadingAttachment={uploadingAttachment}
                    subtasks={subtasks}
                    onSubtasksUpdate={handleSubtasksUpdate}
                    onSubtaskClick={id => setActiveSubtaskId(id)}
                    onAddSubtask={handleAddSubtask}
                  />
                )}

                {activeTab === 'comments' && (
                  <TaskSheetComments
                    comments={comments}
                    newComment={newComment}
                    setNewComment={setNewComment}
                    onAddComment={addComment}
                    onDeleteComment={id => setDeleteCommentId(id)}
                    commentInputRef={commentInputRef}
                  />
                )}

                {activeTab === 'activity' && (
                  <TaskSheetActivity activityLog={activityLog} taskId={task?.id} />
                )}

                {/* Footer: Create / Discard for new tasks */}
                {isNew && (
                  <TaskSheetFooter onDiscard={handleDiscard} onCreate={handleCreate} />
                )}

                {/* Drop zone overlay */}
                {isDragging && (
                  <div
                    className="absolute inset-0 bg-primary/5 backdrop-blur-[2px] rounded-xl border-2 border-dashed border-primary/40 flex items-center justify-center z-50"
                    onDragOver={e => e.preventDefault()}
                    onDragLeave={e => {
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const { clientX: x, clientY: y } = e;
                      if (
                        x <= rect.left ||
                        x >= rect.right ||
                        y <= rect.top ||
                        y >= rect.bottom
                      ) {
                        handleDragLeave(e);
                      }
                    }}
                    onDrop={handleDrop}
                  >
                    <div className="flex flex-col items-center gap-3 pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                        <Paperclip size={28} className="text-primary/70" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-medium text-primary">Drop files here</p>
                        <p className="text-[13px] text-muted-foreground/60 mt-1">
                          Add attachments to this task
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* End main content wrapper */}

              {/* Subtask Detail View slide-in panel */}
              {activeSubtask && (
                <>
                  {/* Clickable left strip to go back to parent */}
                  <div
                    className="absolute top-0 left-0 w-[24px] h-full z-30 cursor-pointer group/back transition-all"
                    onClick={closeSubtask}
                  >
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary/[0.03] to-transparent group-hover/back:from-primary/[0.12] transition-all duration-300">
                      <ChevronLeft
                        size={14}
                        className="text-muted-foreground/30 group-hover/back:text-muted-foreground/60 transition-all duration-300 -ml-0.5"
                      />
                    </div>
                  </div>
                  <div
                    className={`absolute top-0 right-0 w-[calc(100%-24px)] h-full bg-card border-l border-border/20 z-30 overflow-y-auto rounded-l-xl shadow-xl ${
                      closingSubtask
                        ? 'animate-out slide-out-to-right duration-200'
                        : 'animate-in slide-in-from-right duration-300'
                    }`}
                  >
                    <SubtaskDetailView
                      subtask={activeSubtask}
                      parentTitle={form.title || 'parent task'}
                      onBack={closeSubtask}
                      onUpdate={handleSubtaskUpdate}
                    />
                  </div>
                </>
              )}
            </div>
            {/* End relative wrapper */}
          </ErrorBoundary>
        </SheetContent>

        {/* Delete task dialog */}
        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onConfirm={() => {
            setDeleteDialogOpen(false);
            onDelete?.();
          }}
          onCancel={() => setDeleteDialogOpen(false)}
          title="Delete task?"
          description="This will permanently delete this task and all its subtasks. This action cannot be undone."
        />

        {/* Delete comment dialog */}
        <ConfirmDeleteDialog
          open={deleteCommentId !== null}
          onConfirm={() => deleteCommentId && deleteComment(deleteCommentId)}
          onCancel={() => setDeleteCommentId(null)}
          title="Delete comment?"
          description="This will permanently delete this comment. This action cannot be undone."
        />
      </Sheet>
    </TooltipProvider>
  );
}
