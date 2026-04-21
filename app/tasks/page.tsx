'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { CheckSquare2 } from 'lucide-react';

export default function TasksPage() {
  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold font-display text-[var(--color-fg-primary)] mb-2">
            All Tasks
          </h2>
          <p className="text-[var(--color-fg-secondary)]">
            Manage your task list with filters and views
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-12 text-center"
        >
          <CheckSquare2 className="w-12 h-12 text-[var(--color-fg-muted)] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[var(--color-fg-primary)] mb-2">
            Tasks View Coming Soon
          </h3>
          <p className="text-[var(--color-fg-secondary)]">
            The list view is being built with design system components
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
