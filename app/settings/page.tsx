'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-semibold text-[var(--color-fg-primary)] mb-2">
              Settings
            </h1>
            <p className="text-[var(--color-fg-secondary)]">
              Manage your workspace and preferences
            </p>
          </div>

          {/* Settings Sections */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Profile Section */}
            <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-[var(--color-fg-primary)] mb-4">
                Profile
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Jamie Ludlow"
                    className="w-full px-4 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue="jamie@example.com"
                    className="w-full px-4 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Workspace Section */}
            <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-[var(--color-fg-primary)] mb-4">
                Workspace
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    defaultValue="My Workspace"
                    className="w-full px-4 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button className="px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-medium hover:opacity-90 transition-opacity">
              Save Changes
            </button>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
