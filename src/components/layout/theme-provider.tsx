'use client';

import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

const AUTH_PATHS = ['/login', '/reset-password', '/auth', '/auth/reset'];

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.includes(pathname);
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    if (isAuthPage) {
      setTheme('light');
      return;
    }

    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) setTheme(stored);
  }, [isAuthPage]);

  useEffect(() => {
    const effectiveTheme = isAuthPage ? 'light' : theme;
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
    document.documentElement.style.colorScheme = effectiveTheme;
    if (!isAuthPage) {
      localStorage.setItem('theme', effectiveTheme);
    }
  }, [theme, isAuthPage]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return <ThemeContext.Provider value={{ theme: isAuthPage ? 'light' : theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
