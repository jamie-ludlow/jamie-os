'use client';

import { Task, TaskStatus, TaskPriority } from '@/lib/tasks/types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface TaskDetailSheetProps {
  task: Task | null;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const statuses: TaskStatus[] = ['todo', 'doing', 'blocked', 'done', 'backlog'];
const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export function TaskDetailSheet({ task, onClose, onSave, onDelete }: TaskDetailSheetProps) {
  const [formData, setFormData] = useState(task || {
    id: '',
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    dueDate: undefined,
    assignee: '',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  if (!task) return null;

  const handleSave = () => {
    onSave({
      ...formData,
      updatedAt: new Date(),
    } as Task);
  };

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-[var(--color-bg-surface)] border-l border-[var(--color-border-default)] shadow-lg z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-default)]">
              <h2 className="text-lg font-semibold text-[var(--color-fg-primary)]">
                Task Details
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-[var(--color-bg-canvas)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-fg-secondary)]" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] outline-none transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] outline-none transition-colors resize-none"
                  rows={4}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] outline-none transition-colors"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] outline-none transition-colors"
                >
                  {priorities.map((p) => (
                    <option key={p} value={p} className="capitalize">
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate ? formData.dueDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    dueDate: e.target.value ? new Date(e.target.value) : undefined
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] outline-none transition-colors"
                />
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                  Assignee
                </label>
                <input
                  type="text"
                  value={formData.assignee || ''}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] outline-none transition-colors"
                  placeholder="Assign to someone"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--color-border-default)] px-6 py-4 flex gap-2">
              <button
                onClick={() => onDelete(task.id)}
                className="flex-1 px-4 py-2 rounded-lg border border-[var(--color-status-danger)] text-[var(--color-status-danger)] font-medium hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-medium hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
