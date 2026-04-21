'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

export default function SearchPage() {
  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-semibold text-[var(--color-fg-primary)] mb-2">
              Search
            </h1>
            <p className="text-[var(--color-fg-secondary)]">
              Find tasks, projects, and more
            </p>
          </div>

          {/* Search Input */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-fg-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] placeholder-[var(--color-fg-muted)] focus:border-[var(--color-brand-primary)] transition-colors"
              />
            </div>
          </motion.div>

          {/* Empty State */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-12 text-center"
          >
            <div className="w-12 h-12 rounded-lg bg-[var(--color-bg-elevated)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--color-fg-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-fg-primary)] mb-2">
              No results
            </h3>
            <p className="text-sm text-[var(--color-fg-secondary)]">
              Type to search for tasks, projects, or team members
            </p>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
