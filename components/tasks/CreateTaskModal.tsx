'use client';

import { Task, TaskStatus, TaskPriority } from '@/lib/tasks/types';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const statuses: TaskStatus[] = ['todo', 'doing', 'blocked', 'done', 'backlog'];
const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export function CreateTaskModal({ isOpen, onClose, onCreate }: CreateTaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    dueDate: undefined as Date | undefined,
    assignee: '',
    tags: [] as string[],
  });

  const handleCreate = () => {
    if (!formData.title.trim()) return;
    onCreate(formData);
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: undefined,
      assignee: '',
      tags: [],
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg shadow-xl w-full max-w-md">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-default)]">
                <h2 className="text-lg font-semibold text-[var(--color-fg-primary)]">
                  Create New Task
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-[var(--color-bg-canvas)] transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--color-fg-secondary)]" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    autoFocus
                    placeholder="What needs to be done?"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] placeholder-[var(--color-fg-muted)] focus:border-[var(--color-brand-primary)] outline-none transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add details..."
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] placeholder-[var(--color-fg-muted)] focus:border-[var(--color-brand-primary)] outline-none transition-colors resize-none"
                    rows={3}
                  />
                </div>

                {/* Priority & Status Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] outline-none transition-colors text-sm"
                    >
                      {priorities.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] outline-none transition-colors text-sm"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
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
                    value={formData.assignee}
                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                    placeholder="Assign to someone"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] placeholder-[var(--color-fg-muted)] focus:border-[var(--color-brand-primary)] outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[var(--color-border-default)] px-6 py-4 flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-lg border border-[var(--color-border-default)] text-[var(--color-fg-primary)] font-medium hover:bg-[var(--color-bg-canvas)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  disabled={!formData.title.trim()}
                >
                  Create Task
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
