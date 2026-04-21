'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export default function BoardPage() {
  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-semibold text-[var(--color-fg-primary)] mb-2">
                Board
              </h1>
              <p className="text-[var(--color-fg-secondary)]">
                Visualize your workflow
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-medium hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>

          {/* Empty State */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-12 text-center"
          >
            <div className="w-12 h-12 rounded-lg bg-[var(--color-bg-elevated)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--color-fg-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 4H5a2 2 0 00-2 2v14a2 2 0 002 2h4m0-21h4a2 2 0 012 2v14a2 2 0 01-2 2h-4m0-21v21m0-21h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-fg-primary)] mb-2">
              No board yet
            </h3>
            <p className="text-sm text-[var(--color-fg-secondary)] mb-6 max-w-sm mx-auto">
              Create tasks to see your workflow board. Drag cards between columns to update status.
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-medium hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" />
              Create Task
            </button>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
