'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';

export default function BoardPage() {
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
            Kanban Board
          </h2>
          <p className="text-[var(--color-fg-secondary)]">
            Visualize your workflow across status columns
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-12 text-center"
        >
          <LayoutGrid className="w-12 h-12 text-[var(--color-fg-muted)] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[var(--color-fg-primary)] mb-2">
            Board View Coming Soon
          </h3>
          <p className="text-[var(--color-fg-secondary)]">
            Drag-and-drop board view is being built with beautiful design
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
