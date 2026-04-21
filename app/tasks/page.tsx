'use client';

import { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  LayoutGrid,
  Table2,
  Calendar,
  Eye,
  EyeOff,
  X,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { sampleTasks, Task, TaskStatus, TaskPriority } from '@/lib/tasks/types';

type ViewType = 'kanban' | 'table' | 'calendar' | 'blockers';
type KanbanGroupBy = 'status' | 'priority' | 'assignee';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [view, setView] = useState<ViewType>('table');
  const [kanbanGroupBy, setKanbanGroupBy] = useState<KanbanGroupBy>('status');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus[]>([]);
  const [filterPriority, setFilterPriority] = useState<TaskPriority[]>([]);
  const [filterAssignee, setFilterAssignee] = useState<string[]>([]);
  const [hideDone, setHideDone] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => [...new Set(tasks.map(t => t.status))], [tasks]);
  const uniquePriorities = useMemo(() => [...new Set(tasks.map(t => t.priority))], [tasks]);
  const uniqueAssignees = useMemo(() => [...new Set(tasks.filter(t => t.assignee).map(t => t.assignee!))], [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Status filter
      if (filterStatus.length > 0 && !filterStatus.includes(task.status)) {
        return false;
      }
      // Priority filter
      if (filterPriority.length > 0 && !filterPriority.includes(task.priority)) {
        return false;
      }
      // Assignee filter
      if (filterAssignee.length > 0 && !filterAssignee.includes(task.assignee || '')) {
        return false;
      }
      // Hide done
      if (hideDone && task.status === 'done') {
        return false;
      }
      // Date range filter
      if (filterDateFrom && task.dueDate && task.dueDate < new Date(filterDateFrom)) {
        return false;
      }
      if (filterDateTo && task.dueDate && task.dueDate > new Date(filterDateTo)) {
        return false;
      }
      return true;
    });
  }, [tasks, searchQuery, filterStatus, filterPriority, filterAssignee, hideDone, filterDateFrom, filterDateTo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // 'n' to create new task
      if (e.key === 'n' && !isInput && !selectedTask) {
        e.preventDefault();
        setIsCreateOpen(true);
      }
      // '/' to focus search
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus();
      }
      // Escape to close
      if (e.key === 'Escape') {
        setSelectedTask(null);
        setIsCreateOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [selectedTask]);

  const handleSaveTask = (updatedTask: Task) => {
    setTasks(tasks.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    setSelectedTask(null);
  };

  const handleCreateTask = (newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const task: Task = {
      ...newTask,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTasks([...tasks, task]);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    setSelectedTask(null);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterStatus([]);
    setFilterPriority([]);
    setFilterAssignee([]);
    setFilterDateFrom('');
    setFilterDateTo('');
    setHideDone(false);
  };

  const hasActiveFilters = searchQuery || filterStatus.length > 0 || filterPriority.length > 0 || 
                           filterAssignee.length > 0 || hideDone || filterDateFrom || filterDateTo;

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
                onClick={() => setSelectedTask(task)}
                className="hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
              >
                <td className="px-6 py-4 text-sm text-[var(--color-fg-primary)] font-medium truncate">
                  {task.title}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium capitalize" 
                    style={{
                      backgroundColor: `var(--color-bg-elevated)`,
                      color: task.status === 'done' ? 'var(--color-status-success)' :
                             task.status === 'doing' ? 'var(--color-status-info)' :
                             task.status === 'blocked' ? 'var(--color-status-danger)' :
                             'var(--color-fg-muted)'
                    }}>
                    {task.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className="capitalize font-medium"
                    style={{
                      color: task.priority === 'urgent' ? 'var(--color-status-danger)' :
                             task.priority === 'high' ? 'var(--color-status-warning)' :
                             task.priority === 'medium' ? 'var(--color-status-info)' :
                             'var(--color-fg-muted)'
                    }}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-fg-secondary)]">
                  {task.dueDate?.toLocaleDateString() || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-fg-secondary)]">
                  {task.assignee || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredTasks.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-[var(--color-fg-muted)]">No tasks match your filters</p>
        </div>
      )}
    </div>
  );

  const renderKanbanView = () => {
    const groupedTasks = useMemo(() => {
      const groups: Record<string, Task[]> = {};
      
      const groupKey = kanbanGroupBy === 'status' ? 'status' : 
                      kanbanGroupBy === 'priority' ? 'priority' : 'assignee';
      
      filteredTasks.forEach(task => {
        const key = task[groupKey as keyof Task] || 'unassigned';
        if (!groups[String(key)]) groups[String(key)] = [];
        groups[String(key)].push(task);
      });
      
      return groups;
    }, [filteredTasks, kanbanGroupBy]);

    const columnOrder = kanbanGroupBy === 'status' ? 
      ['todo', 'doing', 'blocked', 'done', 'backlog'] :
      kanbanGroupBy === 'priority' ?
      ['urgent', 'high', 'medium', 'low'] :
      ['Jamie', ...uniqueAssignees.filter(a => a !== 'Jamie'), 'unassigned'];

    return (
      <div className="grid auto-cols-max gap-4 overflow-x-auto pb-6" style={{ gridAutoFlow: 'column' }}>
        {columnOrder.map((column) => (
          <div
            key={column}
            className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-4 w-80 flex-shrink-0"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-fg-primary)] capitalize">
                {column}
              </h3>
              <span className="text-xs text-[var(--color-fg-muted)]">
                {(groupedTasks[column] || []).length}
              </span>
            </div>
            <div className="space-y-3">
              {(groupedTasks[column] || []).map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] rounded p-3 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <p className="text-sm font-medium text-[var(--color-fg-primary)] mb-2 truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize" style={{
                      color: task.priority === 'urgent' ? 'var(--color-status-danger)' :
                             task.priority === 'high' ? 'var(--color-status-warning)' :
                             'var(--color-fg-muted)'
                    }}>
                      {task.priority}
                    </span>
                    <span className="text-[var(--color-fg-muted)]">
                      {task.dueDate?.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-full">
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
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-medium hover:opacity-90 transition-opacity text-sm"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>

          {/* Toolbar */}
          <div className="space-y-4 mb-6">
            {/* Search and View Controls */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-fg-muted)]" />
                <input
                  type="text"
                  placeholder="Search tasks... (press '/' to focus)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] placeholder-[var(--color-fg-muted)] focus:border-[var(--color-brand-primary)] outline-none transition-colors text-sm"
                />
              </div>

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
                  <Table2 className="w-4 h-4" />
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
                <button
                  onClick={() => setView('blockers')}
                  className={`p-2 rounded transition-colors ${
                    view === 'blockers'
                      ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-primary)]'
                      : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-primary)]'
                  }`}
                  title="Blockers view"
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>
              </div>

              {/* Hide Done */}
              <button
                onClick={() => setHideDone(!hideDone)}
                className={`p-2 rounded-lg transition-colors ${
                  hideDone
                    ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-primary)]'
                    : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-surface)]'
                }`}
                title="Hide completed tasks"
              >
                {hideDone ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                {uniqueStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(
                      filterStatus.includes(status)
                        ? filterStatus.filter(s => s !== status)
                        : [...filterStatus, status]
                    )}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                      filterStatus.includes(status)
                        ? 'bg-[var(--color-brand-primary)] text-white'
                        : 'bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-2">
                {uniquePriorities.sort().reverse().map((priority) => (
                  <button
                    key={priority}
                    onClick={() => setFilterPriority(
                      filterPriority.includes(priority)
                        ? filterPriority.filter(p => p !== priority)
                        : [...filterPriority, priority]
                    )}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                      filterPriority.includes(priority)
                        ? 'bg-[var(--color-brand-primary)] text-white'
                        : 'bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)]'
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)] transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear filters
                </button>
              )}
            </div>

            {/* Kanban Group By */}
            {view === 'kanban' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--color-fg-muted)]">Group by:</span>
                {(['status', 'priority', 'assignee'] as KanbanGroupBy[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setKanbanGroupBy(option)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                      kanbanGroupBy === option
                        ? 'bg-[var(--color-brand-primary)] text-white'
                        : 'bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            key={`${view}-${kanbanGroupBy}`}
          >
            {view === 'table' && renderTableView()}
            {view === 'kanban' && renderKanbanView()}
            {view === 'calendar' && (
              <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-8 text-center">
                <p className="text-[var(--color-fg-secondary)]">Calendar view coming soon</p>
              </div>
            )}
            {view === 'blockers' && (
              <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-8 text-center">
                <p className="text-[var(--color-fg-secondary)]">Blockers view coming soon</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <TaskDetailSheet
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateTask}
      />
    </AppLayout>
  );
}
