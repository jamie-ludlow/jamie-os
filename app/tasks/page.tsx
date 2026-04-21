'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { Plus, Filter, Search, ArrowUpDown } from 'lucide-react';
import { sampleTasks, statusColors, priorityColors, Task } from '@/lib/tasks/types';

type SortField = 'title' | 'status' | 'priority' | 'dueDate';
type SortOrder = 'asc' | 'desc';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) => {
      if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(task.status)) {
        return false;
      }
      return true;
    });

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'dueDate') {
        aVal = aVal?.getTime() || Infinity;
        bVal = bVal?.getTime() || Infinity;
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, searchTerm, selectedStatuses, sortField, sortOrder]);

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSaveTask = (updatedTask: Task) => {
    setTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
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
    setTasks(tasks.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  };

  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      onClick={() => handleToggleSort(field)}
      className="px-6 py-3 text-left text-xs font-medium text-[var(--color-fg-muted)] bg-[var(--color-bg-canvas)] cursor-pointer hover:bg-[var(--color-bg-elevated)] transition-colors"
    >
      <div className="flex items-center gap-2">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'opacity-100' : 'opacity-0'}`} />
      </div>
    </th>
  );

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

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--color-fg-muted)]" />
              {['todo', 'doing', 'blocked', 'done', 'backlog'].map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedStatuses.includes(status)
                      ? 'bg-[var(--color-brand-primary)] text-white'
                      : 'bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border-default)]">
                    <SortHeader field="title" label="Task" />
                    <SortHeader field="status" label="Status" />
                    <SortHeader field="priority" label="Priority" />
                    <SortHeader field="dueDate" label="Due Date" />
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-fg-muted)] bg-[var(--color-bg-canvas)]">
                      Assignee
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {filteredTasks.map((task) => (
                    <motion.tr
                      key={task.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm text-[var(--color-fg-primary)] font-medium">
                        {task.title}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`${statusColors[task.status]} font-medium capitalize`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`${priorityColors[task.priority]} font-medium capitalize`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-fg-secondary)]">
                        {task.dueDate?.toLocaleDateString() || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-fg-secondary)]">
                        {task.assignee || '—'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTasks.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="text-[var(--color-fg-muted)]">No tasks match your filters</p>
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
