'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

export default function SearchPage() {
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
            Search
          </h2>
          <p className="text-[var(--color-fg-secondary)]">
            Find tasks, documents, and more
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full px-6 py-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] placeholder-[var(--color-fg-muted)] focus:border-[var(--color-brand-primary)] transition-colors"
          />
          <div className="mt-8 bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-12 text-center">
            <Search className="w-12 h-12 text-[var(--color-fg-muted)] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[var(--color-fg-primary)] mb-2">
              Search Coming Soon
            </h3>
            <p className="text-[var(--color-fg-secondary)]">
              Universal search across tasks and documents
            </p>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
