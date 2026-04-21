'use client';

import { useEffect, useCallback } from 'react';
import { palettes, type PaletteColors } from '@/lib/palettes';

function applyPalette(paletteId: string | null) {
  if (!paletteId) {
    // Remove all overrides — revert to CSS defaults
    const vars = [
      '--background', '--foreground', '--card', '--card-foreground',
      '--popover', '--popover-foreground', '--secondary', '--secondary-foreground',
      '--muted', '--muted-foreground', '--accent', '--accent-foreground',
      '--border', '--input', '--ring', '--sidebar', '--sidebar-foreground',
      '--sidebar-primary', '--sidebar-border', '--sidebar-ring', '--chart-1',
    ];
    vars.forEach(v => document.documentElement.style.removeProperty(v));
    return;
  }

  const palette = palettes.find(p => p.id === paletteId);
  if (!palette) return;

  const isDark = document.documentElement.classList.contains('dark');
  const mode = isDark ? palette.colors.dark : palette.colors.light;
  const s = document.documentElement.style;

  s.setProperty('--background', mode.bg);
  s.setProperty('--foreground', mode.textPrimary);
  s.setProperty('--card', mode.elevated);
  s.setProperty('--card-foreground', mode.textPrimary);
  s.setProperty('--popover', mode.elevated);
  s.setProperty('--popover-foreground', mode.textPrimary);
  s.setProperty('--primary', palette.colors.primary);
  s.setProperty('--primary-foreground', '#ffffff');
  s.setProperty('--secondary', mode.panel);
  s.setProperty('--secondary-foreground', mode.textPrimary);
  s.setProperty('--muted', mode.panel);
  s.setProperty('--muted-foreground', mode.textSecondary);
  s.setProperty('--accent', mode.panel);
  s.setProperty('--accent-foreground', mode.textPrimary);
  s.setProperty('--border', mode.border);
  s.setProperty('--input', mode.border);
  s.setProperty('--ring', palette.colors.primary);
  s.setProperty('--sidebar', mode.elevated);
  s.setProperty('--sidebar-foreground', mode.textPrimary);
  s.setProperty('--sidebar-primary', palette.colors.primary);
  s.setProperty('--sidebar-border', mode.border);
  s.setProperty('--sidebar-ring', palette.colors.primary);
  s.setProperty('--chart-1', palette.colors.primary);
}

export function ThemePaletteProvider({ children }: { children: React.ReactNode }) {
  const refresh = useCallback(() => {
    const id = localStorage.getItem('mc-selected-palette');
    applyPalette(id);
  }, []);

  useEffect(() => {
    refresh();

    window.addEventListener('palette-change', refresh);

    // Also re-apply when dark/light mode changes
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') refresh();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('palette-change', refresh);
      observer.disconnect();
    };
  }, [refresh]);

  return <>{children}</>;
}
