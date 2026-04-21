'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare2,
  LayoutGrid,
  Search,
  Settings,
  Plus,
  Moon,
  Sun,
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if dark mode is already set
    if (localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  const navItems = [
    {
      label: 'Tasks',
      href: '/tasks',
      icon: CheckSquare2,
    },
    {
      label: 'Board',
      href: '/board',
      icon: LayoutGrid,
    },
    {
      label: 'Search',
      href: '/search',
      icon: Search,
    },
  ];

  return (
    <div className="flex h-screen bg-[var(--color-bg-canvas)]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] flex flex-col">
        {/* Logo */}
        <div className="px-6 py-8 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)] flex items-center justify-center">
              <CheckSquare2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-[var(--color-fg-primary)]">
              jamie-os
            </span>
          </div>
        </div>

        {/* New Task Button */}
        <div className="px-4 py-4 border-b border-[var(--color-border-subtle)]">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-medium hover:opacity-90 transition-opacity text-sm">
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--color-bg-surface)] text-[var(--color-fg-primary)]'
                    : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)] hover:bg-[var(--color-bg-surface)]'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Settings & Theme Toggle */}
        <div className="border-t border-[var(--color-border-subtle)] px-3 py-3 space-y-1">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/settings')
                ? 'bg-[var(--color-bg-surface)] text-[var(--color-fg-primary)]'
                : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)] hover:bg-[var(--color-bg-surface)]'
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Settings</span>
          </Link>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)] hover:bg-[var(--color-bg-surface)] transition-colors"
          >
            {isDark ? (
              <Sun className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Moon className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg-canvas)]">
        {/* Top Navigation */}
        <div className="h-16 border-b border-[var(--color-border-default)] px-8 flex items-center justify-between">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-[var(--color-bg-surface)] transition-colors">
              <Search className="w-4 h-4 text-[var(--color-fg-secondary)]" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)] flex items-center justify-center">
              <span className="text-sm font-medium text-white">J</span>
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
