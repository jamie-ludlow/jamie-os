'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    name: 'Jamie Ludlow',
    email: 'jamie@example.com',
    workspaceName: 'My Workspace',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    // Simulate saving
    await new Promise((resolve) => setTimeout(resolve, 500));
    localStorage.setItem('settings', JSON.stringify(formData));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
              <h2 className="text-lg font-semibold text-[var(--color-fg-primary)] mb-6">
                Profile
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Workspace Section */}
            <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-[var(--color-fg-primary)] mb-6">
                Workspace
              </h2>
              <div>
                <label className="block text-sm font-medium text-[var(--color-fg-primary)] mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={formData.workspaceName}
                  onChange={(e) => setFormData({ ...formData, workspaceName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-[var(--color-fg-primary)] focus:border-[var(--color-brand-primary)] outline-none transition-colors"
                />
              </div>
            </div>

            {/* Save Button */}
            <motion.div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-medium hover:opacity-90 transition-opacity"
              >
                Save Changes
              </button>
              {saved && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center px-4 py-2 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm font-medium"
                >
                  Saved successfully
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
