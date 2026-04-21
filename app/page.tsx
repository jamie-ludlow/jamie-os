'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function Home() {
  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold font-display text-[var(--color-fg-primary)] mb-2">
            Good morning, Jamie ✨
          </h2>
          <p className="text-[var(--color-fg-secondary)]">
            Here's your task command center for today.
          </p>
        </motion.div>

        {/* KPI Strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-4 gap-4 mb-8"
        >
          {[
            {
              label: 'Today',
              value: '5',
              icon: Clock,
              color: 'text-[var(--color-task-doing)]',
            },
            {
              label: 'Completed',
              value: '12',
              icon: CheckCircle2,
              color: 'text-[var(--color-task-done)]',
            },
            {
              label: 'Blocked',
              value: '2',
              icon: AlertCircle,
              color: 'text-[var(--color-task-blocked)]',
            },
            {
              label: 'This Week',
              value: '28',
              icon: TrendingUp,
              color: 'text-[var(--color-brand-primary)]',
            },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                whileHover={{ y: -2 }}
                className="p-6 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-fg-muted)] mb-2">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold font-display text-[var(--color-fg-primary)]">
                      {stat.value}
                    </p>
                  </div>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Recent Tasks Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-6 mb-8"
        >
          <h3 className="text-lg font-semibold font-display text-[var(--color-fg-primary)] mb-6">
            Recent Tasks
          </h3>

          <div className="space-y-3">
            {[
              {
                title: 'Design jamie-os dashboard mockups',
                priority: 'High',
                status: 'In Progress',
                statusColor: 'text-[var(--color-task-doing)]',
              },
              {
                title: 'Set up Supabase schema for tasks',
                priority: 'High',
                status: 'Todo',
                statusColor: 'text-[var(--color-task-todo)]',
              },
              {
                title: 'Build component library',
                priority: 'Medium',
                status: 'In Progress',
                statusColor: 'text-[var(--color-task-doing)]',
              },
              {
                title: 'Write design system documentation',
                priority: 'Medium',
                status: 'Done',
                statusColor: 'text-[var(--color-task-done)]',
              },
            ].map((task, idx) => (
              <motion.div
                key={idx}
                whileHover={{ x: 4 }}
                className="flex items-center justify-between p-4 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-[var(--color-fg-primary)]">
                      {task.title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-sm font-medium ${task.statusColor}`}
                  >
                    {task.status}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-[var(--color-bg-canvas)] text-[var(--color-fg-secondary)]">
                    {task.priority}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="text-center py-8"
        >
          <p className="text-sm text-[var(--color-fg-muted)] mb-4">
            Start by exploring the task board or creating a new task
          </p>
          <button className="px-6 py-3 rounded-lg bg-[var(--color-brand-primary)] text-[var(--color-fg-inverse)] font-medium hover:bg-[var(--color-brand-primary-hover)] transition-colors">
            Create New Task
          </button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
