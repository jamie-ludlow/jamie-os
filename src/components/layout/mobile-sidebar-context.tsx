'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface SidebarContextType {
  open: boolean;
  toggle: () => void;
  close: () => void;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  open: false,
  toggle: () => {},
  close: () => {},
  collapsed: false,
  setCollapsed: () => {},
});

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsedState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mc-sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  
  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mc-sidebar-collapsed', String(value));
    }
  }, []);

  return (
    <SidebarContext.Provider value={{ open, toggle, close, collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  return useContext(SidebarContext);
}
