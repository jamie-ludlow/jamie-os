'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  LayoutGrid,
  List,
  Calendar,
  Plus,
  Filter,
  Search,
} from 'lucide-react';
import { sampleTasks, statusColors, priorityColors, Task, ViewType } from '@/lib/tasks/types';

export default function TasksPage() {
  const [view, setView] = useState<ViewType>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Filter tasks
  const filteredTasks = sampleTasks.filter((task) => {
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(task.status)) {
      return false;
    }
    return true;
  });

  const renderTableView = () => (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border-default)]">
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-fg-muted)] bg-[var(--color-bg-canvas)]">
                Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-fg-muted)] bg-[var(--color-bg-canvas)]">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-fg-muted)] bg-[var(--color-bg-canvas)]">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-fg-muted)] bg-[var(--color-bg-canvas)]">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-fg-muted)] bg-[var(--color-bg-canvas)]">
                Assignee
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {filteredTasks.map((task) => (
              <tr
                key={task.id}
                className="hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
              >
                <td className="px-6 py-4 text-sm text-[var(--color-fg-primary)]">
                  {task.title}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`${statusColors[task.status]} font-medium`}>
                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`${priorityColors[task.priority]} font-medium capitalize`}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-fg-secondary)]">
                  {task.dueDate?.toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-fg-secondary)]">
                  {task.assignee}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderKanbanView = () => (
    <div className="grid grid-cols-5 gap-4">
      {['todo', 'doing', 'blocked', 'done', 'backlog'].map((status) => {
        const statusTasks = filteredTasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-fg-primary)] capitalize">
                {status}
              </h3>
              <span className="text-xs text-[var(--color-fg-muted)]">
                {statusTasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {statusTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] rounded p-3 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <p className="text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                    {task.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${priorityColors[task.priority]} capitalize`}>
                      {task.priority}
                    </span>
                    <span className="text-xs text-[var(--color-fg-muted)]">
                      {task.dueDate?.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-full mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-semibold text-[var(--color-fg-primary)] mb-2">
                Tasks
              </h1>
              <p className="text-[var(--color-fg-secondary)]">
                {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-medium hover:opacity-90 transition-opacity text-sm">
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-fg-muted)]" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] placeholder-[var(--color-fg-muted)] focus:border-[var(--color-brand-primary)] transition-colors text-sm"
              />
            </div>

            {/* Filter */}
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-fg-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors text-sm">
              <Filter className="w-4 h-4" />
              Filter
            </button>

            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-1">
              <button
                onClick={() => setView('table')}
                className={`p-2 rounded transition-colors ${
                  view === 'table'
                    ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-primary)]'
                    : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-primary)]'
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('kanban')}
                className={`p-2 rounded transition-colors ${
                  view === 'kanban'
                    ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-primary)]'
                    : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-primary)]'
                }`}
                title="Kanban view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`p-2 rounded transition-colors ${
                  view === 'calendar'
                    ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-primary)]'
                    : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-primary)]'
                }`}
                title="Calendar view"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            key={view}
          >
            {view === 'table' && renderTableView()}
            {view === 'kanban' && renderKanbanView()}
            {view === 'calendar' && (
              <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-8 text-center">
                <p className="text-[var(--color-fg-secondary)]">Calendar view coming soon</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
