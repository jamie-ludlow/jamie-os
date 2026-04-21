'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare2,
  LayoutGrid,
  Search,
  Settings,
  Plus,
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  const navItems = [
    {
      label: 'Tasks',
      href: '/tasks',
      icon: CheckSquare2,
      description: 'View and manage all tasks',
    },
    {
      label: 'Board',
      href: '/board',
      icon: LayoutGrid,
      description: 'Kanban board view',
    },
    {
      label: 'Search',
      href: '/search',
      icon: Search,
      description: 'Find anything quickly',
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      description: 'Configure your workspace',
    },
  ];

  return (
    <div className="flex h-full bg-[var(--color-bg-canvas)]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[var(--color-border-default)] bg-[var(--color-bg-surface)] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[var(--color-border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-brand-primary)] to-[var(--color-brand-secondary)] flex items-center justify-center">
              <CheckSquare2 className="w-6 h-6 text-[var(--color-bg-canvas)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display text-[var(--color-fg-primary)]">
                jamie-os
              </h1>
              <p className="text-xs text-[var(--color-fg-muted)]">
                Task Command Center
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action */}
        <div className="p-4 border-b border-[var(--color-border-default)]">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--color-brand-primary)] text-[var(--color-fg-inverse)] font-medium hover:bg-[var(--color-brand-primary-hover)] transition-colors">
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  active
                    ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-primary)] border border-[var(--color-border-strong)]'
                    : 'text-[var(--color-fg-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg-primary)]'
                }`}
                title={item.description}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border-default)] space-y-3">
          <div className="px-4 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)]">
            <p className="text-xs font-medium text-[var(--color-fg-muted)]">
              Version
            </p>
            <p className="text-sm font-mono text-[var(--color-fg-primary)]">
              0.1.0-alpha
            </p>
          </div>
          <p className="text-xs text-center text-[var(--color-fg-muted)]">
            Design-system led
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg-canvas)]">
        {/* Top Navigation Bar */}
        <div className="h-16 border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-8 flex items-center justify-between">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors">
              <Search className="w-5 h-5 text-[var(--color-fg-secondary)]" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-brand-secondary)] to-[var(--color-brand-primary)] flex items-center justify-center">
              <span className="text-sm font-bold text-[var(--color-fg-inverse)]">
                J
              </span>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
