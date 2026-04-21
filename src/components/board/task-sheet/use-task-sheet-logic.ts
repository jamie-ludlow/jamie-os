'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import type { Task, Project, Comment } from '@/lib/types';
import { STATUS_STYLES, toSlug, toDisplayName } from '@/lib/constants';
import { copyToClipboard } from '@/lib/clipboard';
import { ensureHtml } from '@/lib/markdown-to-html';
import { toast } from 'sonner';
import { type TaskAttachment } from '../task-attachments';
import { formatTimestamp } from './task-sheet-utils';
import { useStatuses } from '@/hooks/use-statuses';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TaskSheetFormValues {
  title: string;
  description: string;
  status: Task['status'];
  priority: string;
  assignee: string;
  project_id: string;
  start_date: Date | null;
  due_date: Date | null;
  due_time: string;
  labels: string[];
}

interface ActivityEntry {
  id: string;
  text: string;
  time: string;
  icon: string;
}

interface UseTaskSheetLogicProps {
  task: (Task & { project_name?: string; project_color?: string }) | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Task>, opts?: { optimistic?: boolean; taskId?: string }) => void;
  onDelete?: () => void;
  projects: Project[];
  isNew?: boolean;
  allTasks?: (Task & { project_name?: string; project_color?: string })[];
  onTaskClick?: (task: Task & { project_name?: string; project_color?: string }) => void;
  allLabelsProp?: string[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTaskSheetLogic({
  task,
  open,
  onClose,
  onSave,
  onDelete,
  projects,
  isNew,
  allTasks = [],
  onTaskClick,
  allLabelsProp,
}: UseTaskSheetLogicProps) {
  const { statuses: dynamicStatuses } = useStatuses();
  
  // -------------------------------------------------------------------------
  // Form state
  // -------------------------------------------------------------------------
  const [form, setForm] = useState<TaskSheetFormValues>({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: '' as string,
    assignee: '' as string,
    project_id: '' as string,
    start_date: null as Date | null,
    due_date: null as Date | null,
    due_time: '' as string,
    labels: [] as string[],
  });

  // -------------------------------------------------------------------------
  // Other state
  // -------------------------------------------------------------------------
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity'>('details');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [autoSavedTaskId, setAutoSavedTaskId] = useState<string | null>(null);
  const [pendingSubtasks, setPendingSubtasks] = useState<
    (Task & { project_name?: string; project_color?: string })[]
  >([]);
  // C8: ref-based lock to prevent duplicate task creation from concurrent ensureTaskSaved calls
  const savePromiseRef = useRef<Promise<string | null> | null>(null);

  // FIX 1: Subtask detail view state (CRITICAL - was missing entirely)
  const [activeSubtaskId, setActiveSubtaskId] = useState<string | null>(null);
  const [closingSubtask, setClosingSubtask] = useState(false);

  // FIX 1: Local copy of allTasks for instant optimistic updates
  const [localAllTasks, setLocalAllTasks] = useState(allTasks);

  // Popover states for keyboard shortcuts
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Pending files for new tasks
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // -------------------------------------------------------------------------
  // Refs
  // -------------------------------------------------------------------------
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);

  // -------------------------------------------------------------------------
  // Auto-size title textarea
  // -------------------------------------------------------------------------
  const resizeTitleTextarea = useCallback(() => {
    const el = titleInputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    resizeTitleTextarea();
    // Also resize after a short delay to handle sheet open animation
    const timer = setTimeout(resizeTitleTextarea, 150);
    return () => clearTimeout(timer);
  }, [form.title, resizeTitleTextarea]);

  // -------------------------------------------------------------------------
  // Sheet width resizing
  // -------------------------------------------------------------------------
  const isDraggingRef = useRef(false);
  const [sheetWidth, setSheetWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mc-task-sheet-width');
      return saved ? parseInt(saved, 10) : 620;
    }
    return 620;
  });

  // Track active resize listeners so we can clean them up on unmount
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  // Remove any lingering resize listeners when the sheet unmounts
  useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
      resizeCleanupRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      const startX = e.clientX;
      const startWidth = sheetWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const diff = startX - moveEvent.clientX;
        const newWidth = Math.max(520, Math.min(900, startWidth + diff));
        setSheetWidth(newWidth);
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        setSheetWidth(w => {
          localStorage.setItem('mc-task-sheet-width', String(w));
          return w;
        });
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        resizeCleanupRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // Store cleanup fn so unmount effect can remove these listeners if needed
      resizeCleanupRef.current = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    },
    [sheetWidth],
  );

  // -------------------------------------------------------------------------
  // Sync localAllTasks when allTasks prop changes, preserving optimistic (temp) entries
  // -------------------------------------------------------------------------
  useEffect(() => {
    setLocalAllTasks(prev => {
      const tempTasks = prev.filter(t => t.id.startsWith('temp-'));
      if (tempTasks.length === 0) return allTasks;
      // Merge: use allTasks as base, append temp tasks that aren't yet in allTasks
      const allIds = new Set(allTasks.map(t => t.id));
      return [...allTasks, ...tempTasks.filter(t => !allIds.has(t.id))];
    });
  }, [allTasks]);

  // -------------------------------------------------------------------------
  // Load task data
  // -------------------------------------------------------------------------
  const prevFormRef = useRef(form);

  useEffect(() => {
    // Reset auto-save state when task changes
    setAutoSavedTaskId(null);

    if (task && task.id) {
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      const rawDueTime = dueDate ? format(dueDate, 'HH:mm') : '';
      const dueTime = rawDueTime === '00:00' ? '' : rawDueTime;

      const startDate = task.start_date ? new Date(task.start_date) : null;
      const nextForm = {
        title: task.title || '',
        description: ensureHtml(task.description) || '',
        status: task.status || 'todo',
        priority: task.priority || '',
        assignee: toDisplayName(task.assignee || ''),
        project_id: task.project_id || '',
        start_date: startDate,
        due_date: dueDate,
        due_time: dueTime,
        labels: task.labels || [],
      };
      setForm(nextForm);
      // Reset the activity-feed diff reference so the first render of a newly-opened
      // task doesn't fire spurious activity entries (#7)
      prevFormRef.current = nextForm;

      // Load comments
      fetch(`/api/tasks/${task.id}/comments`)
        .then(r => r.json())
        .then(setComments)
        .catch(() => {});

      // Load attachments
      fetch(`/api/tasks/${task.id}/attachments`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setAttachments(data);
        })
        .catch(() => {});

      // Initialise activity log
      setActivityLog([
        {
          id: crypto.randomUUID(),
          text: `Task created ${formatTimestamp(task.created_at)}`,
          time: formatTimestamp(task.created_at),
          icon: 'created',
        },
      ]);
    } else {
      const newDueDate = task?.due_date ? new Date(task.due_date) : null;
      const newRawTime = newDueDate ? format(newDueDate, 'HH:mm') : '';
      const newDueTime = newRawTime === '00:00' ? '' : newRawTime;
      const newStartDate = task?.start_date ? new Date(task.start_date) : null;
      setForm({
        title: '',
        description: '',
        status: (task?.status as Task['status']) || 'todo',
        priority: task?.priority || '',
        assignee: task?.assignee ? toDisplayName(task.assignee) : '',
        project_id: task?.project_id || '',
        start_date: newStartDate,
        due_date: newDueDate,
        due_time: newDueTime,
        labels: [],
      });
      setComments([]);
      setAttachments([]);
      setActivityLog([]);
    }
  }, [task]);

  // -------------------------------------------------------------------------
  // Track form changes for activity feed
  // -------------------------------------------------------------------------
  useEffect(() => {
    const prev = prevFormRef.current;
    const newActivity: ActivityEntry[] = [];

    if (prev.status !== form.status && prev.status) {
      // Use dynamic status from DB, fallback to hardcoded
      const dynamicStatus = dynamicStatuses.find(s => s.slug === form.status);
      const statusLabel = dynamicStatus?.label || STATUS_STYLES[form.status]?.label || form.status;
      newActivity.push({
        id: crypto.randomUUID(),
        text: `You changed status to ${statusLabel}`,
        time: formatTimestamp(new Date()),
        icon: 'status',
      });
    }

    if (prev.priority !== form.priority && prev.priority) {
      newActivity.push({
        id: crypto.randomUUID(),
        text: `You changed priority to ${form.priority}`,
        time: formatTimestamp(new Date()),
        icon: 'priority',
      });
    }

    if (prev.assignee !== form.assignee && prev.assignee) {
      newActivity.push({
        id: crypto.randomUUID(),
        text: `You assigned to ${form.assignee}`,
        time: formatTimestamp(new Date()),
        icon: 'assignee',
      });
    }

    if (prev.due_date !== form.due_date && prev.due_date) {
      newActivity.push({
        id: crypto.randomUUID(),
        text: form.due_date
          ? `You set due date to ${formatTimestamp(form.due_date)}`
          : 'You cleared the due date',
        time: formatTimestamp(new Date()),
        icon: 'due_date',
      });
    }

    if (prev.title !== form.title && prev.title) {
      newActivity.push({
        id: crypto.randomUUID(),
        text: 'You edited the title',
        time: formatTimestamp(new Date()),
        icon: 'title',
      });
    }

    if (prev.project_id !== form.project_id && prev.project_id) {
      const project = projects.find(p => p.id === form.project_id);
      newActivity.push({
        id: crypto.randomUUID(),
        text: `You moved to ${project?.name || 'Unknown'}`,
        time: formatTimestamp(new Date()),
        icon: 'project',
      });
    }

    if (JSON.stringify(prev.labels) !== JSON.stringify(form.labels) && prev.labels.length > 0) {
      const added = form.labels.filter(l => !prev.labels.includes(l));
      const removed = prev.labels.filter(l => !form.labels.includes(l));
      added.forEach(label => {
        newActivity.push({
          id: crypto.randomUUID(),
          text: `You added label "${label}"`,
          time: formatTimestamp(new Date()),
          icon: 'label',
        });
      });
      removed.forEach(label => {
        newActivity.push({
          id: crypto.randomUUID(),
          text: `You removed label "${label}"`,
          time: formatTimestamp(new Date()),
          icon: 'label',
        });
      });
    }

    if (newActivity.length > 0) {
      setActivityLog(prev => [...newActivity, ...prev]);
    }

    prevFormRef.current = form;
  }, [form, projects]);

  // -------------------------------------------------------------------------
  // FIX 1: Close subtask panel
  // -------------------------------------------------------------------------
  const closeSubtask = () => {
    setClosingSubtask(true);
    setTimeout(() => {
      setActiveSubtaskId(null);
      setClosingSubtask(false);
    }, 200);
  };

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: close subtask panel first, don't close the whole sheet
      if (e.key === 'Escape' && activeSubtaskId) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        closeSubtask();
        return;
      }

      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Don't trigger shortcuts when typing
      if (isTyping) return;

      const key = e.key.toLowerCase();

      if (key === 's') {
        e.preventDefault();
        setStatusOpen(true);
        return;
      }
      if (key === 'p') {
        e.preventDefault();
        setPriorityOpen(true);
        return;
      }
      if (key === 'a') {
        e.preventDefault();
        setAssigneeOpen(true);
        return;
      }
      if (key === 'd') {
        e.preventDefault();
        setDueDateOpen(true);
        return;
      }
      if (key === 'l') {
        e.preventDefault();
        setLabelsOpen(true);
        return;
      }
      if (key === 'c') {
        e.preventDefault();
        commentInputRef.current?.focus();
        return;
      }
      if (key === 'e') {
        e.preventDefault();
        titleInputRef.current?.select();
        return;
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [open, activeSubtaskId]);

  // -------------------------------------------------------------------------
  // Drag-and-drop handlers
  // -------------------------------------------------------------------------
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    await uploadAttachments(files);
  };

  // -------------------------------------------------------------------------
  // Autosave helpers
  // -------------------------------------------------------------------------
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);

  // H4: Reset autosave guard whenever the task changes.
  useEffect(() => {
    initialLoadRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  const buildSavePayload = () => {
    const f = formRef.current;
    if (!f.title.trim()) return null;
    let finalDueDate: string | null = null;
    if (f.due_date) {
      const d = new Date(f.due_date);
      if (f.due_time) {
        const [h, m] = f.due_time.split(':').map(Number);
        d.setHours(h, m, 0, 0);
      } else {
        d.setHours(0, 0, 0, 0);
      }
      finalDueDate = d.toISOString();
    }
    return {
      title: f.title,
      description: f.description || null,
      status: f.status,
      priority: f.priority || null,
      assignee: f.assignee ? toSlug(f.assignee) : null,
      project_id: f.project_id || null,
      start_date: f.start_date ? new Date(f.start_date).toISOString() : null,
      due_date: finalDueDate,
      labels: f.labels || [],
    };
  };

  const saveNow = async (tId: string) => {
    const payload = buildSavePayload();
    if (!payload) return;
    // Optimistic: update parent state instantly before API call
    onSave(payload as Partial<Task>, { optimistic: true, taskId: tId });
    try {
      const res = await fetch(`/api/tasks/${tId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error('Failed to save changes');
      }
    } catch (err) {
      console.error('Autosave failed:', err);
    }
  };

  // Instant save for discrete property changes (status, priority, assignee, labels, project, due date)
  useEffect(() => {
    if (isNew || !task?.id) return;
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    // Cancel any pending debounced save to avoid overwriting
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveNow(task.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.status, form.priority, form.assignee, form.project_id, form.start_date, form.due_date, form.due_time, form.labels]);

  // Debounced save for text fields (title, description)
  useEffect(() => {
    if (isNew || !task?.id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNow(task.id), 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, form.description]);

  // -------------------------------------------------------------------------
  // Copy link / duplicate
  // -------------------------------------------------------------------------
  const handleCopyLink = async () => {
    if (!task) return;
    const url = `${window.location.origin}/board?task=${task.id}`;
    const success = await copyToClipboard(url, 'Link copied to clipboard');
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // FIX 7: Duplicate action — create duplicate AND immediately open it
  const handleDuplicate = async () => {
    if (!task) return;

    const duplicatedTask = {
      title: `${form.title} (Copy)`,
      description: form.description,
      status: form.status,
      priority: form.priority,
      assignee: form.assignee ? toSlug(form.assignee) : null,
      project_id: form.project_id,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      parent_id: task.parent_id,
      labels: form.labels,
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedTask),
      });

      if (res.ok) {
        const newTask = await res.json();
        toast.success('Task duplicated');
        // Trigger a parent data refresh before closing so the duplicate appears in the list
        onSave({});
        onClose();
        if (onTaskClick && newTask) {
          setTimeout(() => onTaskClick(newTask), 100);
        }
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Failed to duplicate task:', err);
      toast.error('Something went wrong. Please try again.');
    }
  };

  // -------------------------------------------------------------------------
  // Comments
  // -------------------------------------------------------------------------
  const addComment = async () => {
    if (!newComment.trim()) return;
    if (isNew) {
      // Local-only for new tasks — saved on Create
      setComments(prev => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          content: newComment,
          author: 'jamie',
          created_at: new Date().toISOString(),
        } as Comment,
      ]);
      setNewComment('');
      return;
    }
    if (!task) return;
    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment, author: 'jamie' }),
    });
    if (!res.ok) {
      toast.error('Failed to post comment');
      return;
    }
    const comment = await res.json();
    setComments([...comments, comment]);
    setNewComment('');
    toast.success('Comment posted');
  };

  const deleteComment = async (commentId: string) => {
    if (!task) return;
    const deletedComment = comments.find(c => c.id === commentId);
    const delRes = await fetch(`/api/tasks/${task.id}/comments?commentId=${commentId}`, {
      method: 'DELETE',
    });
    if (!delRes.ok) {
      toast.error('Failed to delete comment');
      return;
    }
    setComments(comments.filter(c => c.id !== commentId));
    setDeleteCommentId(null);
    toast.success('Comment deleted', {
      action: deletedComment
        ? {
            label: 'Undo',
            onClick: async () => {
              const res = await fetch(`/api/tasks/${task.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content: deletedComment.content,
                  author: deletedComment.author,
                }),
              });
              if (res.ok) {
                const restored = await res.json();
                setComments(prev => [...prev, restored]);
              }
            },
          }
        : undefined,
      duration: 5000,
    });
  };

  // -------------------------------------------------------------------------
  // Auto-save for new tasks (ensureTaskSaved)
  // -------------------------------------------------------------------------

  // C8: Actual save implementation (extracted so savePromiseRef can wrap it).
  const doActualSave = async (): Promise<string | null> => {
    if (!form.title.trim()) return null;

    try {
      const payload = buildSavePayload();
      if (!payload) return null;

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newTask = await res.json();
        setAutoSavedTaskId(newTask.id);
        return newTask.id;
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
    return null;
  };

  // C8: Auto-save helper — ref-based lock prevents duplicate tasks from concurrent calls
  const ensureTaskSaved = async (): Promise<string | null> => {
    if (autoSavedTaskId) return autoSavedTaskId;
    if (!isNew) return task?.id || null;

    if (savePromiseRef.current) return savePromiseRef.current;

    savePromiseRef.current = doActualSave();
    const result = await savePromiseRef.current;
    savePromiseRef.current = null;
    return result;
  };

  // -------------------------------------------------------------------------
  // Attachments
  // -------------------------------------------------------------------------
  const uploadAttachments = async (files: FileList) => {
    if (isNew) {
      // Store locally for new tasks — uploaded on Create
      const newFiles = Array.from(files);
      setPendingFiles(prev => [...prev, ...newFiles]);
      // Show them in the attachment list as preview
      for (const file of newFiles) {
        setAttachments(prev => [
          {
            id: `pending-${Date.now()}-${file.name}`,
            file_name: file.name,
            file_url: '',
            file_size: file.size,
            file_type: file.type,
            task_id: '',
            storage_path: '',
            created_at: new Date().toISOString(),
          } as TaskAttachment,
          ...prev,
        ]);
      }
      return;
    }

    const tId = await ensureTaskSaved();
    if (!tId) return;

    setUploadingAttachment(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`/api/tasks/${tId}/attachments`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.id) setAttachments(prev => [data, ...prev]);
      }
    } catch (err) {
      console.error('Attachment upload failed:', err);
    }
    setUploadingAttachment(false);
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!task) return;
    const res = await fetch(`/api/tasks/${task.id}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      toast.error('Failed to delete attachment');
      return;
    }
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    toast.success('Attachment deleted');
  };

  const renameAttachment = async (attachmentId: string, newName: string) => {
    if (!task) return;
    try {
      await fetch(`/api/tasks/${task.id}/attachments/${attachmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: newName }),
      });
      setAttachments(prev =>
        prev.map(a => (a.id === attachmentId ? { ...a, file_name: newName } : a)),
      );
      toast.success('Attachment renamed');
    } catch (err) {
      console.error('Rename failed:', err);
      toast.error('Failed to rename attachment');
    }
  };

  // -------------------------------------------------------------------------
  // Subtasks
  // -------------------------------------------------------------------------
  const taskId = task?.id || autoSavedTaskId;
  const subtasks = isNew
    ? pendingSubtasks
    : taskId
      ? localAllTasks.filter(t => t.parent_id === taskId)
      : [];

  const handleSubtasksUpdate = (
    updated: (Task & { project_name?: string; project_color?: string })[],
  ) => {
    // C1: When creating a new task, store subtasks in pendingSubtasks (not localAllTasks)
    if (isNew) {
      setPendingSubtasks(updated);
      return;
    }

    // FIX 1: Update local state INSTANTLY (optimistic update)
    const newAllTasks = [...localAllTasks];

    for (const st of updated) {
      const existingIndex = newAllTasks.findIndex(t => t.id === st.id);
      if (existingIndex >= 0) {
        newAllTasks[existingIndex] = st;
      } else {
        newAllTasks.push(st);
      }
    }

    // Handle deletions (subtasks that were removed)
    const updatedIds = new Set(updated.map(s => s.id));
    const oldSubtaskIds = new Set(subtasks.map(s => s.id));
    const deletedIds = [...oldSubtaskIds].filter(id => !updatedIds.has(id));

    for (const deletedId of deletedIds) {
      const idx = newAllTasks.findIndex(t => t.id === deletedId);
      if (idx >= 0) newAllTasks.splice(idx, 1);
    }

    // Update local state IMMEDIATELY — UI updates instantly!
    setLocalAllTasks(newAllTasks);

    // Sync to database in BACKGROUND (non-blocking)
    for (const st of updated) {
      if (st.id.startsWith('temp-')) continue;

      fetch(`/api/tasks/${st.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: st.title,
          status: st.status,
          priority: st.priority,
          assignee: st.assignee,
          due_date: st.due_date,
          description: st.description,
        }),
      }).catch(err => {
        console.error('Background sync failed for subtask', st.id, err);
        toast.error('Failed to save changes');
      });
    }

    // Background delete (don't await!)
    for (const deletedId of deletedIds) {
      if (deletedId.startsWith('temp-')) continue;

      fetch(`/api/tasks/${deletedId}`, {
        method: 'DELETE',
      }).catch(err => {
        console.error('Background delete failed for subtask', deletedId, err);
        toast.error('Failed to save changes');
      });
    }

    // Realtime subscription handles fetchTasks() — no manual trigger needed
  };

  // FIX 1: Get active subtask for detail view
  const activeSubtask = activeSubtaskId ? subtasks.find(s => s.id === activeSubtaskId) : null;

  // FIX 1: Handler for updating subtask from detail view
  const handleSubtaskUpdate = async (updates: Partial<Task>) => {
    if (!activeSubtaskId) return;

    if (isNew) {
      setPendingSubtasks(prev =>
        prev.map(s => (s.id === activeSubtaskId ? { ...s, ...updates } : s)),
      );
    } else {
      const updatedSubtasks = subtasks.map(s =>
        s.id === activeSubtaskId ? { ...s, ...updates } : s,
      );
      handleSubtasksUpdate(updatedSubtasks);
    }
  };

  // Handler for adding a new subtask (extracted from inline onAdd callback)
  const handleAddSubtask = async () => {
    const tempId = `temp-${Date.now()}`;
    const tempSubtask = {
      id: tempId,
      title: 'New sub-task',
      status: 'todo' as Task['status'],
      priority: null,
      assignee: null as unknown as Task['assignee'],
      project_id: form.project_id || null,
      parent_id: task?.id || 'pending',
      description: null,
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Task & { project_name?: string; project_color?: string };

    if (isNew) {
      // New task: just add to local state, will be saved with Create
      setPendingSubtasks(prev => [...prev, tempSubtask]);
    } else {
      // Existing task: save to DB immediately
      handleSubtasksUpdate([...subtasks, tempSubtask]);
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'New sub-task',
            status: 'todo',
            priority: null,
            assignee: null,
            project_id: task?.project_id || null,
            parent_id: task!.id,
            description: null,
            due_date: null,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          handleSubtasksUpdate(
            [...subtasks, tempSubtask].map(s => (s.id === tempId ? { ...s, ...created } : s)),
          );
        } else {
          handleSubtasksUpdate(subtasks.filter(s => s.id !== tempId));
          toast.error('Failed to create subtask');
        }
      } catch (err) {
        console.error('Failed to create subtask', err);
      }
    }
  };

  // -------------------------------------------------------------------------
  // Footer handlers (new task flow)
  // -------------------------------------------------------------------------
  const handleDiscard = async () => {
    if (autoSavedTaskId) {
      const res = await fetch(`/api/tasks/${autoSavedTaskId}`, { method: 'DELETE' });
      if (!res.ok) console.error('Failed to clean up auto-saved task', autoSavedTaskId);
    }
    setPendingSubtasks([]);
    setAutoSavedTaskId(null);
    onClose();
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    // Cancel any pending debounce timer to avoid a duplicate save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const createdTaskId = await ensureTaskSaved();
    if (!createdTaskId) return;

    // Create all pending subtasks
    for (const st of pendingSubtasks) {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: st.title,
          status: st.status,
          priority: st.priority,
          assignee: st.assignee,
          project_id: form.project_id || null,
          parent_id: createdTaskId,
          description: st.description,
          due_date: st.due_date,
        }),
      }).catch(err => console.error('Failed to create subtask', err));
    }

    // Save pending comments
    for (const c of comments) {
      if (c.id.startsWith('temp-')) {
        await fetch(`/api/tasks/${createdTaskId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: c.content, author: c.author }),
        }).catch(err => console.error('Failed to create comment', err));
      }
    }

    // Upload pending files
    for (const file of pendingFiles) {
      const formData = new FormData();
      formData.append('file', file);
      await fetch(`/api/tasks/${createdTaskId}/attachments`, {
        method: 'POST',
        body: formData,
      }).catch(err => console.error('Failed to upload file', err));
    }

    toast.success('Task created');
    onSave({});
    onClose();
  };

  // -------------------------------------------------------------------------
  // Sheet open/close handler
  // -------------------------------------------------------------------------
  const handleSheetOpenChange = (v: boolean) => {
    if (!v) {
      // Flush any pending debounced save before closing
      if (saveTimerRef.current && task?.id) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        saveNow(task.id);
      }
      onClose();
    }
  };

  // -------------------------------------------------------------------------
  // Computed values
  // -------------------------------------------------------------------------
  const allLabels = allLabelsProp || allTasks.flatMap(t => t.labels || []);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------
  return {
    // Form
    form,
    setForm,
    // Comments
    comments,
    newComment,
    setNewComment,
    // Attachments
    attachments,
    uploadingAttachment,
    // Activity
    activityLog,
    // Subtasks
    subtasks,
    pendingSubtasks,
    // UI state
    activeTab,
    setActiveTab,
    copiedLink,
    isDragging,
    sheetWidth,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteCommentId,
    setDeleteCommentId,
    // Subtask panel
    activeSubtaskId,
    setActiveSubtaskId,
    activeSubtask,
    closingSubtask,
    closeSubtask,
    // Popover states
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
    // Refs
    sheetRef,
    titleInputRef,
    commentInputRef,
    // Handlers
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
    // Computed
    allLabels,
    taskId,
  };
}
