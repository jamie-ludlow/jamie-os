'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';

export default function Home() {
  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-semibold text-[var(--color-fg-primary)] mb-2">
              Dashboard
            </h1>
            <p className="text-[var(--color-fg-secondary)]">
              Overview of your tasks and progress
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              {
                label: 'Active Tasks',
                value: '5',
                icon: Clock,
                change: '+2 this week',
              },
              {
                label: 'Completed',
                value: '12',
                icon: CheckCircle2,
                change: '+3 this week',
              },
              {
                label: 'Blocked',
                value: '2',
                icon: AlertCircle,
                change: '1 pending',
              },
              {
                label: 'Completion Rate',
                value: '76%',
                icon: TrendingUp,
                change: '+4% vs last week',
              },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-medium text-[var(--color-fg-muted)] mb-1">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-semibold text-[var(--color-fg-primary)]">
                        {stat.value}
                      </p>
                    </div>
                    <Icon className="w-4 h-4 text-[var(--color-fg-muted)]" />
                  </div>
                  <p className="text-xs text-[var(--color-fg-muted)]">
                    {stat.change}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-3 gap-6">
            {/* Recent Tasks - Takes 2 columns */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="col-span-2 bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg"
            >
              <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
                <h2 className="text-sm font-semibold text-[var(--color-fg-primary)]">
                  Recent Activity
                </h2>
              </div>
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {[
                  {
                    title: 'Design new dashboard mockup',
                    status: 'In Progress',
                    priority: 'High',
                  },
                  {
                    title: 'Review design system tokens',
                    status: 'In Progress',
                    priority: 'High',
                  },
                  {
                    title: 'Set up Supabase database',
                    status: 'To Do',
                    priority: 'Medium',
                  },
                  {
                    title: 'Build task list component',
                    status: 'To Do',
                    priority: 'High',
                  },
                ].map((task, idx) => (
                  <div
                    key={idx}
                    className="px-6 py-4 hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border border-[var(--color-border-default)] cursor-pointer flex-shrink-0"
                      />
                      <p className="text-sm text-[var(--color-fg-primary)] truncate">
                        {task.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className="text-xs font-medium text-[var(--color-fg-secondary)]">
                        {task.status}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-[var(--color-bg-canvas)] text-[var(--color-fg-muted)]">
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick Stats Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-6"
            >
              <h3 className="text-sm font-semibold text-[var(--color-fg-primary)] mb-6">
                This Week
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[var(--color-fg-muted)] mb-2">
                    Completed
                  </p>
                  <p className="text-2xl font-semibold text-[var(--color-fg-primary)]">
                    8
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-fg-muted)] mb-2">
                    In Progress
                  </p>
                  <p className="text-2xl font-semibold text-[var(--color-fg-primary)]">
                    3
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-fg-muted)] mb-2">
                    Total Tasks
                  </p>
                  <p className="text-2xl font-semibold text-[var(--color-fg-primary)]">
                    11
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
