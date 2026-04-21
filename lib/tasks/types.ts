/**
 * Task Management Data Types
 * Mirrors Mission Control structure
 */

export type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked' | 'backlog';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ViewType = 'kanban' | 'table' | 'calendar';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  assignee?: string;
  tags?: string[];
  subtasks?: Subtask[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface FilterOptions {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignee?: string[];
  tags?: string[];
  search?: string;
}

// Sample tasks for demonstration
export const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Design new dashboard layout',
    description: 'Create mockups for the refined dashboard',
    status: 'doing',
    priority: 'high',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    assignee: 'Jamie',
    tags: ['design', 'ui'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Review design system tokens',
    description: 'Audit all color, spacing, and motion tokens',
    status: 'doing',
    priority: 'high',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    assignee: 'Jamie',
    tags: ['design', 'system'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    title: 'Set up Supabase database',
    description: 'Initialize database schema and migrations',
    status: 'todo',
    priority: 'high',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    assignee: 'Jamie',
    tags: ['backend', 'database'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    title: 'Build task list component',
    description: 'Implement task list view with filtering',
    status: 'todo',
    priority: 'high',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    assignee: 'Jamie',
    tags: ['frontend', 'tasks'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '5',
    title: 'Implement Kanban board',
    description: 'Drag-and-drop Kanban board view',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    assignee: 'Jamie',
    tags: ['frontend', 'views'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '6',
    title: 'Write API documentation',
    description: 'Document all task management endpoints',
    status: 'blocked',
    priority: 'medium',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    assignee: 'Jamie',
    tags: ['docs'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '7',
    title: 'Deploy to production',
    description: 'Production deployment and monitoring setup',
    status: 'backlog',
    priority: 'low',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    assignee: 'Jamie',
    tags: ['devops'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const statusColors: Record<TaskStatus, string> = {
  todo: 'text-[var(--color-fg-muted)]',
  doing: 'text-[var(--color-status-info)]',
  done: 'text-[var(--color-status-success)]',
  blocked: 'text-[var(--color-status-danger)]',
  backlog: 'text-[var(--color-status-warning)]',
};

export const statusBgColors: Record<TaskStatus, string> = {
  todo: 'bg-[var(--color-bg-elevated)]',
  doing: 'bg-blue-50 dark:bg-blue-950',
  done: 'bg-green-50 dark:bg-green-950',
  blocked: 'bg-red-50 dark:bg-red-950',
  backlog: 'bg-amber-50 dark:bg-amber-950',
};

export const priorityColors: Record<TaskPriority, string> = {
  low: 'text-[var(--color-fg-muted)]',
  medium: 'text-[var(--color-status-info)]',
  high: 'text-[var(--color-status-warning)]',
  urgent: 'text-[var(--color-status-danger)]',
};
