'use client';

import { STATUS_STYLES, PRIORITY_STYLES, ASSIGNEE_COLORS } from "@/lib/constants";
import { useState, useRef, useEffect } from 'react';
import { useStatuses } from '@/hooks/use-statuses';

/** Safe status style lookup — dynamic DB first, hardcoded fallback */
function useStatusStyle(status: string) {
  const { statuses } = useStatuses();
  const dyn = statuses.find(s => s.slug === status);
  const hc = STATUS_STYLES[status];
  return {
    dot: dyn?.dot_colour || dyn?.colour || hc?.dot || '#6b7280',
    bg: hc?.bg || 'bg-muted/20',
    text: hc?.text || 'text-muted-foreground',
    label: dyn?.label || hc?.label || status.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  };
}
import dynamic from 'next/dynamic';
import { Copy, MoreHorizontal, Link2, Paperclip, Send, Calendar as CalendarIcon, User, Flag, Activity, Zap, Eye, X, Archive, Trash2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

// Shared components
import { SearchableAssigneePopover } from '@/components/board/searchable-assignee-popover';
import { SearchableStatusPopover } from '@/components/board/searchable-status-popover';
import { SearchablePriorityPopover } from '@/components/board/searchable-priority-popover';
import { SearchableProjectPopover } from '@/components/board/searchable-project-popover';
import { PropertyRow } from '@/components/board/property-row';
import { EnhancedDatePicker, formatRelativeDate } from '@/components/board/enhanced-date-picker';
import { InteractivePropertyGrid } from '@/components/tasks/interactive-property-grid';
import { InteractiveSubtasks } from '@/components/tasks/interactive-subtasks';
import { CollapsibleAttachments } from '@/components/tasks/collapsible-attachments';
import { KeyboardShortcutsCheatSheet } from '@/components/tasks/keyboard-shortcuts';
import type { Subtask } from '@/components/tasks/interactive-subtasks';
import type { FileAttachment } from '@/components/tasks/collapsible-attachments';

// Confirm dialog for destructive actions (used by InteractiveComments)
function ConfirmDialog({ open, onClose, onConfirm, title, description }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3.5 py-1.5 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
            Cancel
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-3.5 py-1.5 rounded-lg text-[13px] font-medium bg-destructive/20 text-destructive hover:bg-destructive/20 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Dynamic import for Tiptap editor
const TaskDescriptionEditor = dynamic(
  () => import('@/components/board/task-description-editor').then(mod => ({ default: mod.TaskDescriptionEditor })),
  { ssr: false }
);

/* ───────── Types & State Interface ───────── */
interface PreviewTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  project: { id: string; name: string; color: string } | null;
  dueDate: Date | null;
  dueTime: string;
  labels: string[];
  subtasks: Subtask[];
  comments: { id: string; author: string; avatar: string; content: string; time: string }[];
  activity: { id: string; text: string; time: string; icon: string }[];
  attachments: FileAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

const PROJECTS = [
  { id: 'mc', name: 'Mission Control', color: '#6366f1', created_at: '2026-01-01' },
  { id: 'lr', name: 'Lead Rise', color: '#f59e0b', created_at: '2026-01-01' },
  { id: 'lm', name: 'London Marathon', color: '#10b981', created_at: '2026-01-01' },
  { id: 'as', name: 'Air Social', color: '#06b6d4', created_at: '2026-01-01' },
];

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  const timeStr = format(date, 'HH:mm');
  
  if (diffDays === 0) {
    if (isToday(date)) return `Today at ${timeStr}`;
  }
  if (diffDays === 1 || (diffDays === 0 && !isToday(date))) {
    return `Yesterday at ${timeStr}`;
  }
  return format(date, "d MMM ''yy") + ` at ${timeStr}`;
}

/* ───────── Page-specific Components ───────── */

interface InteractiveDescriptionProps {
  description: string;
  onChange: (description: string) => void;
  compact?: boolean;
}

function InteractiveDescription({ description, onChange }: InteractiveDescriptionProps) {
  return (
    <div className="w-full">
      <TaskDescriptionEditor
        content={description}
        onChange={onChange}
        placeholder="Add description..."
      />
    </div>
  );
}

interface InteractiveCommentsProps {
  comments: { id: string; author: string; avatar: string; content: string; time: string }[];
  activity: { id: string; text: string; time: string; icon: string }[];
  onAddComment: (content: string) => void;
  onDeleteComment: (id: string) => void;
  showTabs?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

function InteractiveComments({ comments, activity, onAddComment, onDeleteComment, showTabs = true, textareaRef: externalRef }: InteractiveCommentsProps) {
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');
  const [commentValue, setCommentValue] = useState('');
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef || internalRef;
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (commentValue.trim()) {
      onAddComment(commentValue);
      setCommentValue('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div>
      {showTabs && (
        <div className="flex items-center gap-4 mb-3">
          <button 
            onClick={() => setTab('comments')} 
            className={`text-[11px] font-medium pb-1 transition-colors ${tab === 'comments' ? 'text-primary border-b border-primary' : 'text-muted-foreground/30 hover:text-muted-foreground/60'}`}
          >
            Comments
          </button>
          <button 
            onClick={() => setTab('activity')} 
            className={`text-[11px] font-medium pb-1 transition-colors ${tab === 'activity' ? 'text-primary border-b border-primary' : 'text-muted-foreground/30 hover:text-muted-foreground/60'}`}
          >
            Activity
          </button>
        </div>
      )}
      
      {tab === 'comments' ? (
        <>
          <div className="space-y-3 mb-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2.5 group relative">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                  {c.avatar}
                </div>
                {c.author === 'You' && (
                  <button 
                    onClick={() => setDeleteCommentId(c.id)}
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-destructive transition-all p-1 rounded hover:bg-destructive/20"
                  >
                    <X size={11} />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-[11px] font-medium text-foreground">{c.author}</span>
                    <span className="text-[10px] text-muted-foreground/30">{c.time}</span>
                  </div>
                  <p className="text-[13px] text-foreground/75 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-2 mt-2 px-1">
            <textarea
              ref={textareaRef}
              className="flex-1 bg-muted/20 text-[13px] outline-none rounded-lg px-3 py-2.5 placeholder:text-muted-foreground/60 resize-none min-h-[36px] max-h-[200px] focus:ring-1 focus:ring-primary/40 transition-all" 
              placeholder="Write a comment..."
              value={commentValue}
              onChange={(e) => { setCommentValue(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={1}
            />
            <button 
              onClick={handleSubmit}
              className="p-1 text-muted-foreground/30 hover:text-primary transition-colors flex-shrink-0 mt-0.5"
            >
              <Send size={14} />
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          {activity.map((a) => (
            <div key={a.id} className="flex items-center gap-2 py-1">
              <span className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground/60">{a.icon}</span>
              <span className="text-[13px] text-muted-foreground/60 flex-1">{a.text}</span>
              <span className="text-[11px] text-muted-foreground/30">{a.time}</span>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={deleteCommentId !== null}
        onClose={() => setDeleteCommentId(null)}
        onConfirm={() => { if (deleteCommentId) onDeleteComment(deleteCommentId); }}
        title="Delete comment"
        description="This comment will be permanently removed. This action cannot be undone."
      />
    </div>
  );
}

/* ───────── Task Content Tabs ───────── */
interface TaskContentTabsProps {
  task: PreviewTask;
  updateTask: (updates: Partial<PreviewTask>) => void;
  onSubtaskClick?: (id: string) => void;
  showTimestamps?: boolean;
  commentInputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

function TaskContentTabs({ task, updateTask, onSubtaskClick, tabStyle = 'underline', showTimestamps = true, commentInputRef }: TaskContentTabsProps & { tabStyle?: 'underline' | 'pills' | 'bold-underline' | 'segmented' }) {
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity'>('details');
  const tabs = ['details', 'comments', 'activity'] as const;
  const badge = (tab: string) => tab === 'comments' && task.comments.length > 0 
    ? <span className={`ml-1.5 -mr-1 text-[10px] rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center font-medium ${activeTab === 'comments' ? 'bg-primary/20 text-primary' : 'bg-muted/40 text-muted-foreground/30'}`}>{task.comments.length}</span> 
    : null;

  return (
    <>
      {/* Style 1: Soft pill */}
      {tabStyle === 'underline' && (
        <div className="flex items-center gap-1 px-5 py-2">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-[11px] font-medium capitalize rounded-full transition-colors ${activeTab === tab ? 'bg-primary/20 text-primary' : 'text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/40'}`}
            >
              {tab}{badge(tab)}
            </button>
          ))}
        </div>
      )}

      {/* Style 2: Outlined pill */}
      {tabStyle === 'pills' && (
        <div className="flex items-center gap-1.5 px-5 py-2">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-[11px] font-medium capitalize rounded-full border transition-colors ${activeTab === tab ? 'border-primary/40 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/30'}`}
            >
              {tab}{badge(tab)}
            </button>
          ))}
        </div>
      )}

      {/* Style 3: Filled pill */}
      {tabStyle === 'bold-underline' && (
        <div className="flex items-center gap-1 px-5 py-2">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 text-[11px] font-medium capitalize rounded-full transition-all ${activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/40'}`}
            >
              {tab}{badge(tab)}
            </button>
          ))}
        </div>
      )}

      {/* Style 4: Pill bar */}
      {tabStyle === 'segmented' && (
        <div className="px-5 py-2">
          <div className="inline-flex items-center gap-0.5 bg-muted/20 p-1 rounded-full">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-[11px] font-medium capitalize rounded-full transition-all ${activeTab === tab ? 'bg-primary/20 text-primary shadow-sm' : 'text-muted-foreground/30 hover:text-muted-foreground/60'}`}
              >
                {tab}{badge(tab)}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div>
          <div className="px-5 py-3">
            <InteractiveDescription 
              description={task.description}
              onChange={(description) => updateTask({ description })}
            />
          </div>
          <div className="mx-5 border-t border-border/20" />
          <div className="px-5 py-3">
            <CollapsibleAttachments
              attachments={task.attachments}
              onAdd={(newFiles) => updateTask({ attachments: [...task.attachments, ...newFiles] })}
              onDelete={(id) => updateTask({ attachments: task.attachments.filter(a => a.id !== id) })}
              onRename={(id, name) => updateTask({ attachments: task.attachments.map(a => a.id === id ? { ...a, name } : a) })}
            />
          </div>
          <div className="mx-5 border-t border-border/20" />
          <div className="px-5 py-3">
            <InteractiveSubtasks
              subtasks={task.subtasks}
              onUpdate={(subtasks) => updateTask({ subtasks })}
              onSubtaskClick={onSubtaskClick}
              showProgress
            />
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="px-5 py-3">
          <InteractiveComments
            comments={task.comments}
            activity={task.activity}
            onAddComment={(content) => {
              const newComment = {
                id: Date.now().toString(),
                author: 'You',
                avatar: 'Y',
                content,
                time: 'Just now',
              };
              updateTask({ comments: [...task.comments, newComment] });
            }}
            onDeleteComment={(id) => updateTask({ comments: task.comments.filter(c => c.id !== id) })}
            showTabs={false}
            textareaRef={commentInputRef}
          />
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="px-5 py-3">
          <div className="space-y-2">
            {task.activity.map((a) => (
              <div key={a.id} className="flex items-center gap-2 py-1">
                <span className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground/60">{a.icon}</span>
                <span className="text-[13px] text-muted-foreground/60 flex-1">{a.text}</span>
                <span className="text-[11px] text-muted-foreground/30">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTimestamps && (
        <div className="px-5 py-3 border-t border-border/20 flex items-center gap-4 text-[11px] text-muted-foreground/30">
          <span>Created {formatTimestamp(task.createdAt)}</span>
          <span>·</span>
          <span>Updated {formatTimestamp(task.updatedAt)}</span>
        </div>
      )}
    </>
  );
}

/* ───────── Task Header ───────── */
function TaskHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-mono text-muted-foreground/30">MC-142</span>
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground/30 hover:text-muted-foreground transition-colors">
              <Zap size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="p-0 bg-popover border-border">
            <KeyboardShortcutsCheatSheet />
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground/30 hover:text-muted-foreground transition-colors">
              <Link2 size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Copy link</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground/30 hover:text-muted-foreground transition-colors">
              <Copy size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Duplicate</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground/30 hover:text-muted-foreground transition-colors">
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            <DropdownMenuItem className="text-[13px] py-1.5 px-2 gap-2">
              <Copy size={13} />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[13px] py-1.5 px-2 gap-2">
              <Link2 size={13} />
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[13px] py-1.5 px-2 gap-2">
              <Archive size={13} />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[13px] py-1.5 px-2 gap-2 text-destructive">
              <Trash2 size={13} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ───────── Editable Title ───────── */
interface EditableTitleProps {
  title: string;
  onSave: (title: string) => void;
  fontSize?: string;
  fontWeight?: string;
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function EditableTitle({ 
  title, 
  onSave, 
  fontSize = 'text-[17px]', 
  fontWeight = 'font-semibold',
  isEditing: isEditingProp,
  onEditingChange,
  inputRef
}: EditableTitleProps) {
  const [internalEditing, setInternalEditing] = useState(false);
  const [value, setValue] = useState(title);
  
  const isEditing = isEditingProp !== undefined ? isEditingProp : internalEditing;
  const setIsEditing = onEditingChange || setInternalEditing;

  const handleSave = () => {
    if (value.trim()) {
      onSave(value);
    }
    setIsEditing(false);
  };
  
  useEffect(() => {
    if (isEditing) {
      setValue(title);
    }
  }, [isEditing, title]);

  return isEditing ? (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
          setValue(title);
          setIsEditing(false);
        }
      }}
      className={`${fontSize} ${fontWeight} text-foreground leading-snug w-full bg-muted/40 border border-primary/30 rounded px-2 py-1 outline-none`}
      autoFocus
    />
  ) : (
    <h2 
      onClick={() => {
        setIsEditing(true);
        setValue(title);
      }}
      className={`${fontSize} ${fontWeight} text-foreground leading-snug cursor-pointer hover:text-foreground/80 transition-colors`}
    >
      {title}
    </h2>
  );
}

/* ───────── Subtask Detail View ───────── */
function SubtaskDetailView({ 
  subtask, 
  parentTitle,
  onBack, 
  onUpdate 
}: { 
  subtask: Subtask;
  parentTitle: string;
  onBack: () => void;
  onUpdate: (updates: Partial<Subtask>) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(subtask.title);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity'>('details');
  
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  
  const pendingRef = useRef<Partial<Subtask>>({});
  
  const flushUpdates = () => {
    if (Object.keys(pendingRef.current).length > 0) {
      onUpdate(pendingRef.current);
      pendingRef.current = {};
    }
  };

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const formatFileSize = (bytes: number): string => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const newAttachments: FileAttachment[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name}`,
      name: file.name,
      size: formatFileSize(file.size),
    }));

    onUpdate({ attachments: [...(subtask.attachments || []), ...newAttachments] });
  };

  return (
    <div 
      className="px-5 pt-4 pb-3 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-1 text-[12px] text-muted-foreground/30 hover:text-muted-foreground transition-colors mb-3"
      >
        <ArrowLeft size={12} />
        Back to parent
      </button>

      {editingTitle ? (
        <input
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => { onUpdate({ title: titleDraft }); setEditingTitle(false); }}
          onKeyDown={(e) => { 
            if (e.key === 'Enter') { onUpdate({ title: titleDraft }); setEditingTitle(false); }
            if (e.key === 'Escape') { setTitleDraft(subtask.title); setEditingTitle(false); }
          }}
          className="text-[17px] font-semibold text-foreground leading-snug w-full bg-muted/40 border border-primary/30 rounded px-2 py-1 outline-none"
          autoFocus
        />
      ) : (
        <h2 
          onClick={() => {
            setEditingTitle(true);
            setTitleDraft(subtask.title);
          }}
          className="text-[17px] font-semibold text-foreground leading-snug cursor-pointer hover:text-foreground/80 transition-colors mb-3"
        >
          {subtask.title}
        </h2>
      )}

      <div className="space-y-0 mb-4">
        <PropertyRow icon={<Activity size={13} />} label="Status">
          <SearchableStatusPopover
            value={subtask.status}
            onChange={(status) => onUpdate({ status })}
          />
        </PropertyRow>

        <PropertyRow icon={<Flag size={13} />} label="Priority">
          <SearchablePriorityPopover
            value={subtask.priority || ''}
            onChange={(priority) => onUpdate({ priority })}
          />
        </PropertyRow>

        <PropertyRow icon={<User size={13} />} label="Assignee">
          <SearchableAssigneePopover
            value={subtask.assignee}
            onChange={(assignee) => onUpdate({ assignee })}
          />
        </PropertyRow>

        <PropertyRow icon={<CalendarIcon size={13} />} label="Due date">
          <div className="flex items-center gap-1.5">
            <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
              <PopoverTrigger asChild>
                <button className={`text-[13px] whitespace-nowrap hover:text-foreground/80 transition-colors hover:bg-muted/60 rounded px-1.5 py-0.5 ${!subtask.date ? 'text-muted-foreground/30' : ''}`}>
                  {formatRelativeDate(subtask.date ? new Date(subtask.date) : null)}
                  {subtask.time && <span> at {subtask.time}</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <EnhancedDatePicker
                  date={subtask.date ? new Date(subtask.date) : null}
                  time={subtask.time}
                  onDateChange={(date) => {
                    pendingRef.current.date = date ? date.toISOString() : '';
                    requestAnimationFrame(flushUpdates);
                  }}
                  onTimeChange={(time) => {
                    pendingRef.current.time = time;
                    requestAnimationFrame(flushUpdates);
                  }}
                  onClear={() => onUpdate({ date: '', time: '' })}
                  onOpenChange={setDueDateOpen}
                />
              </PopoverContent>
            </Popover>
            {(subtask.date || subtask.time) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onUpdate({ date: '', time: '' })}
                    className="p-0.5 flex items-center justify-center text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={11} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Clear date</TooltipContent>
              </Tooltip>
            )}
          </div>
        </PropertyRow>
      </div>

      <div className="border-t border-border/20 my-3" />

      <div className="flex items-center gap-1 mb-3">
        <button 
          onClick={() => setActiveTab('details')}
          className={`px-3 py-1.5 text-[11px] font-medium capitalize rounded-full transition-colors ${
            activeTab === 'details' 
              ? 'bg-primary/20 text-primary' 
              : 'text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/40'
          }`}
        >
          Details
        </button>
        <button 
          onClick={() => setActiveTab('comments')}
          className={`px-3 py-1.5 text-[11px] font-medium capitalize rounded-full transition-colors ${
            activeTab === 'comments' 
              ? 'bg-primary/20 text-primary' 
              : 'text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/40'
          }`}
        >
          Comments
          {subtask.comments && subtask.comments.length > 0 && (
            <span className={`ml-1.5 -mr-1 text-[10px] rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center font-medium ${activeTab === 'comments' ? 'bg-primary/20 text-primary' : 'bg-muted/40 text-muted-foreground/30'}`}>{subtask.comments.length}</span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          className={`px-3 py-1.5 text-[11px] font-medium capitalize rounded-full transition-colors ${
            activeTab === 'activity' 
              ? 'bg-primary/20 text-primary' 
              : 'text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/40'
          }`}
        >
          Activity
        </button>
      </div>

      {activeTab === 'details' && (
        <div>
          <InteractiveDescription 
            description={subtask.description || ''} 
            onChange={(html) => onUpdate({ description: html })} 
          />
          {(subtask.attachments && subtask.attachments.length > 0 || true) && (
            <>
              <div className="border-t border-border/20 my-3" />
              <CollapsibleAttachments
                attachments={subtask.attachments || []}
                onAdd={(newFiles) => onUpdate({ attachments: [...(subtask.attachments || []), ...newFiles] })}
                onDelete={(id) => onUpdate({ attachments: (subtask.attachments || []).filter(a => a.id !== id) })}
                onRename={(id, name) => onUpdate({ attachments: (subtask.attachments || []).map(a => a.id === id ? { ...a, name } : a) })}
              />
            </>
          )}
        </div>
      )}

      {activeTab === 'comments' && (
        <InteractiveComments
          comments={(subtask.comments || []).map(c => ({
            id: c.id,
            author: c.author,
            avatar: c.author.charAt(0),
            content: c.text,
            time: c.time,
          }))}
          activity={[]}
          onAddComment={(text) => {
            const newComment = { 
              id: Date.now().toString(), 
              author: 'You', 
              text, 
              time: 'Just now' 
            };
            onUpdate({ comments: [...(subtask.comments || []), newComment] });
          }}
          onDeleteComment={(id) => {
            onUpdate({ comments: (subtask.comments || []).filter(c => c.id !== id) });
          }}
          showTabs={false}
        />
      )}

      {activeTab === 'activity' && (
        <div className="space-y-2">
          {(subtask.activity || []).map((a) => (
            <div key={a.id} className="flex items-center gap-2 py-1">
              <span className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground/60">🔄</span>
              <span className="text-[13px] text-muted-foreground/60 flex-1">{a.text}</span>
              <span className="text-[11px] text-muted-foreground/30">{a.time}</span>
            </div>
          ))}
          {(!subtask.activity || subtask.activity.length === 0) && (
            <p className="text-[13px] text-muted-foreground/30">No activity yet</p>
          )}
        </div>
      )}

      {subtask.createdAt && subtask.updatedAt && (
        <div className="px-5 py-3 border-t border-border/20 flex items-center gap-4 text-[11px] text-muted-foreground/30 -mx-5 mt-4">
          <span>Created {formatTimestamp(subtask.createdAt)}</span>
          <span>·</span>
          <span>Updated {formatTimestamp(subtask.updatedAt)}</span>
        </div>
      )}

      {isDragging && (
        <div 
          className="absolute inset-0 bg-primary/5 backdrop-blur-[2px] rounded-xl border-2 border-dashed border-primary/40 flex items-center justify-center z-50"
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            const { clientX: x, clientY: y } = e;
            if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
              dragCounterRef.current = 0;
              setIsDragging(false);
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
              <p className="text-[13px] text-muted-foreground/60 mt-1">Add attachments to this subtask</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*  DESIGN 1 — Refined Linear              */
/* ═══════════════════════════════════════ */
function Design1({ task, updateTask }: { task: PreviewTask; updateTask: (updates: Partial<PreviewTask>) => void }) {
  return (
    <div className="w-full max-w-[580px] bg-card border border-border rounded-xl">
      <div className="px-5 pt-4 pb-3">
        <TaskHeader />
        <div className="mt-2">
          <EditableTitle 
            title={task.title}
            onSave={(title) => updateTask({ title })}
          />
        </div>
      </div>

      <div className="px-5 pb-3 pt-1">
        <InteractivePropertyGrid task={task} updateTask={updateTask} projects={PROJECTS} />
      </div>

      <div className="mx-5 border-t border-border/20" />

      <TaskContentTabs task={task} updateTask={updateTask} />
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*  DESIGN 2 — Ultra Minimal               */
/* ═══════════════════════════════════════ */
function Design2({ task, updateTask }: { task: PreviewTask; updateTask: (updates: Partial<PreviewTask>) => void }) {
  const ss = useStatusStyle(task.status);
  return (
    <div className="w-full max-w-[580px] bg-card border border-border rounded-xl">
      <div className="px-6 pt-5 pb-1">
        <TaskHeader />
        <div className="mt-3 mb-1">
          <EditableTitle 
            title={task.title}
            onSave={(title) => updateTask({ title })}
            fontSize="text-xl"
            fontWeight="font-bold"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground/60 mt-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ss.dot }} /> 
            {ss.label}
          </span>
          <span className="text-muted-foreground/30">·</span>
          <span className={PRIORITY_STYLES[task.priority].text}>{task.priority}</span>
          <span className="text-muted-foreground/30">·</span>
          <span>{task.assignee}</span>
          <span className="text-muted-foreground/30">·</span>
          <span>{task.dueDate ? format(task.dueDate, "d MMM ''yy") : 'No date'}{task.dueTime ? ` at ${task.dueTime}` : ''}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.project?.color }} />
            {task.project?.name}
          </span>
        </div>
      </div>

      <div className="px-6 pt-3 pb-2">
        <InteractivePropertyGrid task={task} updateTask={updateTask} projects={PROJECTS} columns={1} />
      </div>

      <div className="mx-6 border-t border-border/20" />

      <TaskContentTabs task={task} updateTask={updateTask} />

      <div className="px-6 py-2.5 border-t border-border/20 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground/30">Completed 2 hours ago</span>
        <div className="flex items-center gap-2">
          <button className="text-[11px] text-destructive/40 hover:text-destructive transition-colors">Delete</button>
          <button className="px-3 py-1 text-[11px] font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*  DESIGN 3 — Two-column hybrid           */
/* ═══════════════════════════════════════ */
function Design3({ task, updateTask }: { task: PreviewTask; updateTask: (updates: Partial<PreviewTask>) => void }) {
  const { statuses: dynStatuses } = useStatuses();
  return (
    <div className="w-full max-w-[700px] bg-card border border-border rounded-xl">
      <div className="px-5 pt-4 pb-3 border-b border-border/20">
        <TaskHeader />
        <div className="mt-2">
          <EditableTitle 
            title={task.title}
            onSave={(title) => updateTask({ title })}
          />
        </div>
      </div>

      <div className="flex">
        <div className="w-[220px] border-r border-border/20 px-4 py-3 flex-shrink-0">
          <InteractivePropertyGrid task={task} updateTask={updateTask} projects={PROJECTS} compact columns={1} />

          <div className="mt-4 pt-3 border-t border-border/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground/30">
                Sub-tasks {task.subtasks.filter(st => st.status === 'done').length}/{task.subtasks.length}
              </span>
              <button 
                onClick={() => {
                  const newSubtask: Subtask = {
                    id: Date.now().toString(),
                    title: 'New sub-task',
                    status: 'todo',
                    priority: '',
                    assignee: '',
                    date: '',
                    time: '',
                    description: '',
                    comments: [],
                    activity: [],
                    attachments: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  };
                  updateTask({ subtasks: [...task.subtasks, newSubtask] });
                }}
                className="text-[10px] text-primary/50 hover:text-primary transition-colors"
              >
                +
              </button>
            </div>
            <div className="space-y-1">
              {task.subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 py-1 hover:bg-muted/30 rounded px-1 -mx-1 cursor-pointer transition-colors group">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="hover:bg-muted/40 rounded p-0.5 transition-colors">
                        <span 
                          className="w-2.5 h-2.5 rounded-full block" 
                          style={{ backgroundColor: dynStatuses.find(s => s.slug === st.status)?.dot_colour || STATUS_STYLES[st.status]?.dot || '#4b5563' }}
                        />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-1" align="start">
                      {st.status && (
                        <>
                          <PopoverClose asChild>
                            <button
                              onClick={() => {
                                const newSubtasks = task.subtasks.map(s => s.id === st.id ? { ...s, status: '' } : s);
                                updateTask({ subtasks: newSubtasks });
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[13px] text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/40 transition-colors"
                            >
                              <span className="w-2 h-2 rounded-full border border-muted-foreground/20" />
                              No status
                            </button>
                          </PopoverClose>
                          <div className="border-t border-border/20 my-1" />
                        </>
                      )}
                      {(dynStatuses.length ? dynStatuses : Object.entries(STATUS_STYLES).map(([key, style]) => ({ slug: key, label: style.label, dot_colour: style.dot }))).map((s) => (
                        <PopoverClose asChild key={s.slug}>
                          <button
                            onClick={() => {
                              const newSubtasks = task.subtasks.map(sub => sub.id === st.id ? { ...sub, status: s.slug } : sub);
                              updateTask({ subtasks: newSubtasks });
                            }}
                            className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[13px] hover:bg-muted/60 transition-colors ${st.status === s.slug ? 'bg-muted/50' : ''}`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.dot_colour || "#6b7280" }} />
                            <span>{s.label}</span>
                          </button>
                        </PopoverClose>
                      ))}
                    </PopoverContent>
                  </Popover>
                  <span className={`text-[11px] truncate flex-1 ${st.status === 'done' ? 'text-foreground/50 line-through' : 'text-foreground/70'}`}>{st.title}</span>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-medium flex-shrink-0 ${ASSIGNEE_COLORS[st.assignee] || 'bg-muted/60 text-muted-foreground'}`}>
                    {st.assignee.charAt(0)}
                  </span>
                  <button 
                    onClick={() => {
                      updateTask({ subtasks: task.subtasks.filter(s => s.id !== st.id) });
                    }}
                    className="opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <TaskContentTabs task={task} updateTask={updateTask} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*  DESIGN 4 — Card sections                */
/* ═══════════════════════════════════════ */
function Design4({ task, updateTask }: { task: PreviewTask; updateTask: (updates: Partial<PreviewTask>) => void }) {
  return (
    <div className="w-full max-w-[580px] bg-card border border-border rounded-xl">
      <div className="px-5 pt-4 pb-3">
        <TaskHeader />
        <div className="mt-2">
          <EditableTitle 
            title={task.title}
            onSave={(title) => updateTask({ title })}
          />
        </div>
      </div>

      <div className="mx-5 mb-3 bg-muted/15 border border-border/20 rounded-lg p-3">
        <InteractivePropertyGrid task={task} updateTask={updateTask} projects={PROJECTS} />
      </div>

      <TaskContentTabs task={task} updateTask={updateTask} />

      <div className="px-5 py-2.5 border-t border-border/20 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground/30">Completed 2 hours ago</span>
        <div className="flex items-center gap-2">
          <button className="text-[11px] text-destructive/40 hover:text-destructive transition-colors">Delete</button>
          <button className="px-3 py-1 text-[11px] font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*  DESIGN 5 — Floating actions + dense    */
/* ═══════════════════════════════════════ */
function Design5({ task, updateTask }: { task: PreviewTask; updateTask: (updates: Partial<PreviewTask>) => void }) {
  const ss = useStatusStyle(task.status);
  const { statuses: dynStatuses } = useStatuses();
  return (
    <div className="w-full max-w-[580px] bg-card border border-border rounded-xl">
      <div className="px-5 py-3 border-b border-border/20 flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <button className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${ss.bg} ${ss.text} hover:bg-muted/60 transition-colors`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ss.dot }} />
              {ss.label}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="start">
            {task.status && (
              <>
                <PopoverClose asChild>
                  <button
                    onClick={() => { updateTask({ status: '' as any }); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[13px] text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/40 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full border border-muted-foreground/20" />
                    No status
                  </button>
                </PopoverClose>
                <div className="border-t border-border/20 my-1" />
              </>
            )}
            {(dynStatuses.length ? dynStatuses : Object.entries(STATUS_STYLES).map(([key, style]) => ({ slug: key, label: style.label, dot_colour: style.dot }))).map((s) => (
              <PopoverClose asChild key={s.slug}>
              <button
                onClick={() => { updateTask({ status: s.slug as PreviewTask['status'] }); }}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[13px] hover:bg-muted/60 transition-colors ${task.status === s.slug ? 'bg-muted/50' : ''}`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.dot_colour || "#6b7280" }} />
                <span>{s.label}</span>
              </button>
              </PopoverClose>
            ))}
          </PopoverContent>
        </Popover>
        <span className="text-[11px] font-mono text-muted-foreground/30">MC-142</span>
        <div className="flex-1" />
        <Tooltip><TooltipTrigger asChild><button className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground/30 hover:text-muted-foreground transition-colors"><Eye size={14} /></button></TooltipTrigger><TooltipContent side="bottom">View</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><button className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground/30 hover:text-muted-foreground transition-colors"><Link2 size={14} /></button></TooltipTrigger><TooltipContent side="bottom">Copy link</TooltipContent></Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground/30 hover:text-muted-foreground transition-colors">
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            <DropdownMenuItem className="text-[13px] py-1.5 px-2 gap-2"><Copy size={13} />Duplicate</DropdownMenuItem>
            <DropdownMenuItem className="text-[13px] py-1.5 px-2 gap-2"><Link2 size={13} />Copy link</DropdownMenuItem>
            <DropdownMenuItem className="text-[13px] py-1.5 px-2 gap-2"><Archive size={13} />Archive</DropdownMenuItem>
            <DropdownMenuItem className="text-[13px] py-1.5 px-2 gap-2 text-destructive"><Trash2 size={13} />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-5 pt-4 pb-2">
        <EditableTitle 
          title={task.title}
          onSave={(title) => updateTask({ title })}
        />
      </div>

      <div className="px-5 py-1">
        <InteractivePropertyGrid task={task} updateTask={updateTask} projects={PROJECTS} compact />
      </div>

      <div className="mx-5 border-t border-border/20 mt-1" />

      <TaskContentTabs task={task} updateTask={updateTask} />
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*  PAGE — switcher between designs         */
/* ═══════════════════════════════════════ */
export default function TaskPreviewPage() {
  const { statuses: dynStatuses } = useStatuses();
  const [active, setActive] = useState<1 | 2 | 3 | 4>(1);
  const [activeSubtaskId, setActiveSubtaskId] = useState<string | null>(null);
  const [closingSubtask, setClosingSubtask] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  
  const [task, setTask] = useState<PreviewTask>({
    id: 'MC-142',
    title: 'Fix: crop handles position, add time picker, show sub-tasks on new',
    description: `<p>Three bugs:</p><ul><li>Crop resize handles not positioned correctly after cropping to new size</li><li>No time picker on due date — only shows calendar, need time input too</li><li>Sub-tasks section not showing when creating a new task</li></ul>`,
    status: 'done',
    priority: 'P1',
    assignee: 'Developer',
    project: { id: 'mc', name: 'Mission Control', color: '#6366f1' },
    dueDate: new Date(2026, 1, 13),
    dueTime: '16:22',
    labels: ['bug', 'ui'],
    subtasks: [
      { 
        id: '1', 
        title: 'Fix crop handle positioning after resize', 
        status: 'done',
        priority: 'P2',
        assignee: 'Developer', 
        date: '2026-02-13T14:00:00.000Z', 
        time: '14:00', 
        description: '<p>Handles drift after crop due to stale position refs. Need to recalculate on commit.</p>', 
        comments: [], 
        activity: [],
        attachments: [
          { id: 'sub-att-1', name: 'crop-fix-screenshot.png', size: '156 KB' },
          { id: 'sub-att-2', name: 'resize-test-results.pdf', size: '72 KB' },
        ],
        createdAt: new Date(2026, 1, 8, 10, 15),
        updatedAt: new Date(2026, 1, 13, 14, 30),
      },
      { 
        id: '2', 
        title: 'Add time input next to calendar date picker', 
        status: 'done',
        priority: 'P3',
        assignee: 'Developer', 
        date: '2026-02-13T15:00:00.000Z', 
        time: '15:00', 
        description: '<p>Add visible time input field next to the calendar date picker.</p>', 
        comments: [], 
        activity: [], 
        attachments: [],
        createdAt: new Date(2026, 1, 8, 10, 20),
        updatedAt: new Date(2026, 1, 13, 15, 10),
      },
      { 
        id: '3', 
        title: 'Show sub-tasks section on new task form', 
        status: 'done',
        priority: '',
        assignee: 'UI/UX Designer', 
        date: '2026-02-13T16:00:00.000Z', 
        time: '16:00', 
        description: '', 
        comments: [], 
        activity: [], 
        attachments: [],
        createdAt: new Date(2026, 1, 8, 10, 25),
        updatedAt: new Date(2026, 1, 13, 16, 5),
      },
    ],
    comments: [
      { id: '1', author: 'Casper', avatar: '👻', content: 'All three fixes deployed and verified on production.', time: "13 Feb '26 at 14:20" },
      { id: '2', author: 'Jamie', avatar: 'JL', content: 'Looks good, crop handles still slightly off on small images though.', time: "13 Feb '26 at 15:45" },
    ],
    activity: [
      { id: '1', text: 'Casper changed status to Done', time: "13 Feb '26 at 16:22", icon: '✓' },
      { id: '2', text: 'Casper added 3 sub-tasks', time: "13 Feb '26 at 14:10", icon: '+' },
      { id: '3', text: 'Jamie created this task', time: "8 Feb '26 at 14:32", icon: '★' },
    ],
    attachments: [
      { id: 'att-1', name: 'crop-handles-before.png', size: '245 KB' },
      { id: 'att-2', name: 'crop-handles-after.png', size: '198 KB' },
      { id: 'att-3', name: 'time-picker-mockup.jpg', size: '312 KB' },
      { id: 'att-4', name: 'requirements.pdf', size: '89 KB' },
    ],
    createdAt: new Date(2026, 1, 8, 14, 32),
    updatedAt: new Date(2026, 1, 13, 16, 22),
  });

  const updateTask = (updates: Partial<PreviewTask>) => {
    setTask(prev => {
      const updated = { ...prev, ...updates, updatedAt: new Date() };
      
      if (updates.status && updates.status !== prev.status) {
        const newActivity = {
          id: Date.now().toString(),
          text: `You changed status to ${dynStatuses.find(s => s.slug === updates.status)?.label || STATUS_STYLES[updates.status]?.label || updates.status.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}`,
          time: formatTimestamp(new Date()),
          icon: '→',
        };
        updated.activity = [newActivity, ...updated.activity];
      }
      
      if (updates.priority && updates.priority !== prev.priority) {
        const newActivity = {
          id: Date.now().toString(),
          text: `You changed priority to ${updates.priority}`,
          time: formatTimestamp(new Date()),
          icon: '⚡',
        };
        updated.activity = [newActivity, ...updated.activity];
      }
      
      if (updates.assignee && updates.assignee !== prev.assignee) {
        const newActivity = {
          id: Date.now().toString(),
          text: `You assigned to ${updates.assignee}`,
          time: formatTimestamp(new Date()),
          icon: '👤',
        };
        updated.activity = [newActivity, ...updated.activity];
      }

      if (updates.dueDate !== undefined && updates.dueDate !== prev.dueDate) {
        const newActivity = {
          id: Date.now().toString(),
          text: updates.dueDate ? `You set due date to ${formatTimestamp(updates.dueDate)}` : 'You cleared the due date',
          time: formatTimestamp(new Date()),
          icon: '📅',
        };
        updated.activity = [newActivity, ...updated.activity];
      }

      if (updates.labels !== undefined && JSON.stringify(updates.labels) !== JSON.stringify(prev.labels)) {
        const added = (updates.labels || []).filter(l => !prev.labels.includes(l));
        const removed = prev.labels.filter(l => !(updates.labels || []).includes(l));
        if (added.length > 0) {
          updated.activity = [{ id: Date.now().toString(), text: `You added label "${added[0]}"`, time: formatTimestamp(new Date()), icon: '🏷️' }, ...updated.activity];
        }
        if (removed.length > 0) {
          updated.activity = [{ id: Date.now().toString(), text: `You removed label "${removed[0]}"`, time: formatTimestamp(new Date()), icon: '🏷️' }, ...updated.activity];
        }
      }

      if (updates.title && updates.title !== prev.title) {
        const newActivity = {
          id: Date.now().toString(),
          text: 'You edited the title',
          time: formatTimestamp(new Date()),
          icon: '✏️',
        };
        updated.activity = [newActivity, ...updated.activity];
      }

      if (updates.project && updates.project.name !== prev.project?.name) {
        const newActivity = {
          id: Date.now().toString(),
          text: `You moved to ${updates.project.name}`,
          time: formatTimestamp(new Date()),
          icon: '📁',
        };
        updated.activity = [newActivity, ...updated.activity];
      }
      
      return updated;
    });
  };

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const formatFileSize = (bytes: number): string => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const newAttachments: FileAttachment[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name}`,
      name: file.name,
      size: formatFileSize(file.size),
    }));

    updateTask({ attachments: [...task.attachments, ...newAttachments] });

    const count = newAttachments.length;
    const newActivity = {
      id: Date.now().toString(),
      text: `You added ${count} attachment${count > 1 ? 's' : ''}`,
      time: 'Just now',
      icon: '📎',
    };
    setTask(prev => ({
      ...prev,
      activity: [newActivity, ...prev.activity],
    }));
  };

  const closeSubtask = () => {
    setClosingSubtask(true);
    setTimeout(() => {
      setActiveSubtaskId(null);
      setClosingSubtask(false);
    }, 200);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;
      
      if (e.key === 'Escape' && activeSubtaskId) {
        closeSubtask();
        return;
      }
      
      if (isTyping) return;
      
      const key = e.key.toLowerCase();
      
      if (key === 's') { e.preventDefault(); setStatusOpen(true); return; }
      if (key === 'p') { e.preventDefault(); setPriorityOpen(true); return; }
      if (key === 'a') { e.preventDefault(); setAssigneeOpen(true); return; }
      if (key === 'd') { e.preventDefault(); setDueDateOpen(true); return; }
      if (key === 'c') { e.preventDefault(); commentInputRef.current?.focus(); return; }
      if (key === 'e') { e.preventDefault(); setIsEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 50); return; }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSubtaskId]);

  const tabStyles = {
    1: { name: 'Soft Pill', desc: 'Subtle tinted background on active', style: 'underline' as const },
    2: { name: 'Outlined Pill', desc: 'Border accent on active tab', style: 'pills' as const },
    3: { name: 'Filled Pill', desc: 'Solid primary background on active', style: 'bold-underline' as const },
    4: { name: 'Pill Bar', desc: 'Pills inside a container track', style: 'segmented' as const },
  };

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[750px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Design 1 — Tab Style Variations</h1>
          <p className="text-[13px] text-muted-foreground/60">
            Same layout (Refined Linear), 4 different tab styles. Pick the one that feels right.
          </p>
        </div>

        <div className="flex items-center gap-1 mb-6 bg-muted/20 p-1 rounded-lg overflow-x-auto">
          {([1, 2, 3, 4] as const).map(key => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`px-3 py-2 rounded-md text-[13px] font-medium transition-all whitespace-nowrap ${
                active === key
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {key}
              <span className="ml-1.5 text-[11px] opacity-60 hidden sm:inline">{tabStyles[key].name}</span>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <h2 className="text-[13px] font-medium text-foreground/70">Style {active} — {tabStyles[active].name}</h2>
          <p className="text-[11px] text-muted-foreground/30 mt-0.5">{tabStyles[active].desc}</p>
        </div>

        <div className="relative overflow-visible">
          <div 
            className={`w-full max-w-[580px] bg-card border rounded-xl transition-all duration-300 ease-out relative ${
              activeSubtaskId 
                ? 'opacity-40 scale-[0.97] cursor-pointer hover:opacity-50 pointer-events-auto' 
                : ''
            } ${
              isDragging 
                ? 'border-primary/50 ring-2 ring-primary/20 shadow-lg shadow-primary/10' 
                : 'border-border'
            }`}
            onClick={() => { if (activeSubtaskId) closeSubtask(); }}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="px-5 pt-4 pb-3">
              <TaskHeader />
              <div className="mt-2">
                <EditableTitle 
                  title={task.title} 
                  onSave={(title) => updateTask({ title })} 
                  isEditing={isEditingTitle}
                  onEditingChange={setIsEditingTitle}
                  inputRef={titleInputRef}
                />
              </div>
            </div>
            <div className="px-5 pb-3 pt-1">
              <InteractivePropertyGrid 
                task={task} 
                updateTask={updateTask} 
                projects={PROJECTS}
                statusOpen={statusOpen}
                onStatusOpenChange={setStatusOpen}
                priorityOpen={priorityOpen}
                onPriorityOpenChange={setPriorityOpen}
                assigneeOpen={assigneeOpen}
                onAssigneeOpenChange={setAssigneeOpen}
                dueDateOpen={dueDateOpen}
                onDueDateOpenChange={setDueDateOpen}
              />
            </div>
            <TaskContentTabs 
              task={task} 
              updateTask={updateTask} 
              tabStyle={tabStyles[active].style}
              onSubtaskClick={setActiveSubtaskId}
              commentInputRef={commentInputRef}
            />
            
            {isDragging && (
              <div 
                className="absolute inset-0 bg-primary/5 backdrop-blur-[2px] rounded-xl border-2 border-dashed border-primary/40 flex items-center justify-center z-50"
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const { clientX: x, clientY: y } = e;
                  if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
                    dragCounterRef.current = 0;
                    setIsDragging(false);
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
                    <p className="text-[13px] text-muted-foreground/60 mt-1">Add attachments to this task</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {activeSubtaskId && (
            <div 
              className={`absolute top-0 right-0 w-[calc(100%-24px)] h-full bg-card border border-border rounded-xl shadow-2xl ${
                closingSubtask 
                  ? 'animate-out slide-out-to-right duration-200' 
                  : 'animate-in slide-in-from-right duration-300'
              }`}
              style={{ minHeight: '100%' }}
            >
              <SubtaskDetailView
                subtask={task.subtasks.find(st => st.id === activeSubtaskId)!}
                parentTitle={task.title}
                onBack={closeSubtask}
                onUpdate={(updates) => {
                  const newSubtasks = task.subtasks.map(st => 
                    st.id === activeSubtaskId ? { ...st, ...updates } : st
                  );
                  updateTask({ subtasks: newSubtasks });
                }}
              />
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-muted/15 border border-border/20 rounded-lg">
          <h3 className="text-[13px] font-medium text-foreground mb-3">🎮 Interactive Features:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] text-muted-foreground/60">
            <div>✅ Click title to edit</div>
            <div>✅ Popover dropdowns for all properties</div>
            <div>✅ Date picker + time input</div>
            <div>✅ Click labels to remove, + to add</div>
            <div>✅ <strong>Tiptap rich text editor</strong> for description</div>
            <div>✅ Toggle sub-task checkboxes</div>
            <div>✅ Click sub-task title to edit</div>
            <div>✅ Change sub-task assignee/date/time</div>
            <div>✅ Add & delete sub-tasks</div>
            <div>✅ <strong>File attachments</strong> (mock upload)</div>
            <div>✅ Add & delete comments (multi-line)</div>
            <div>✅ <strong>Content tabs</strong> (Details/Comments/Activity/Files)</div>
            <div>✅ Activity log auto-updates</div>
            <div>✅ All designs share same state!</div>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
