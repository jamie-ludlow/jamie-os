'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export const SHORTCUTS = [
  { keys: ['⌘', 'K'], description: 'Command palette' },
  { keys: ['⌘', 'N'], description: 'New task' },
  { keys: ['⌘', '\\'], description: 'Toggle sidebar' },
  { keys: ['G', 'D'], description: 'Go to Dashboard' },
  { keys: ['G', 'T'], description: 'Go to Tasks' },
  { keys: ['G', 'P'], description: 'Go to Projects' },
  { keys: ['G', 'C'], description: 'Go to Calendar' },
  { keys: ['G', 'G'], description: 'Go to Goals' },
  { keys: ['G', 'A'], description: 'Go to Agents' },
  { keys: ['Esc'], description: 'Close modal / sheet' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
] as const;

const GO_ROUTES: Record<string, string> = {
  d: '/',
  t: '/board',
  p: '/projects',
  c: '/calendar',
  g: '/goals',
  a: '/agents',
};

export function useKeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingGoRef = useRef(false);
  const goTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

    // Cmd+K — handled by GlobalSearch component
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      return;
    }

    // Cmd+N — new task
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:new-task'));
      return;
    }

    // Cmd+\ — toggle sidebar
    if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:toggle-sidebar'));
      return;
    }

    // Escape — close open overlays
    if (e.key === 'Escape') {
      window.dispatchEvent(new CustomEvent('shortcut:escape'));
      return;
    }

    // Don't handle remaining shortcuts if user is typing
    if (isInput) return;

    // G then letter — navigate (vim-style "go to")
    if (pendingGoRef.current) {
      pendingGoRef.current = false;
      if (goTimerRef.current) clearTimeout(goTimerRef.current);
      const route = GO_ROUTES[e.key.toLowerCase()];
      if (route) {
        e.preventDefault();
        window.location.href = route;
        return;
      }
    }

    if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      pendingGoRef.current = true;
      if (goTimerRef.current) clearTimeout(goTimerRef.current);
      goTimerRef.current = setTimeout(() => { pendingGoRef.current = false; }, 500);
      return;
    }

    // ? — show help
    if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setHelpOpen((prev) => !prev);
      return;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { helpOpen, setHelpOpen };
}
