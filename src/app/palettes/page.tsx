'use client';

import { useState, useEffect } from 'react';
import { Check, Palette } from 'lucide-react';
import { palettes, type PaletteColors, type PaletteOption } from '@/lib/palettes';


function MiniPreview({ mode, colors }: { mode: 'dark' | 'light'; colors: PaletteColors }) {
  const c = mode === 'dark' ? colors.dark : colors.light;
  return (
    <div className="flex-1 min-w-[140px]">
      <p className="text-[10px] font-medium text-muted-foreground mb-1.5">
        {mode} mode
      </p>
      <div
        className="rounded-lg overflow-hidden border"
        style={{ backgroundColor: c.bg, borderColor: c.border, height: 180 }}
      >
        <div className="flex h-full">
          {/* Sidebar */}
          <div
            className="w-10 flex flex-col items-center gap-1.5 pt-3 shrink-0"
            style={{ backgroundColor: c.elevated, borderRight: `1px solid ${c.border}` }}
          >
            <div className="w-5 h-5 rounded" style={{ backgroundColor: colors.primary, opacity: 0.9 }} />
            {/* Active sidebar item */}
            <div
              className="w-7 h-4 rounded-sm flex items-center justify-center"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <div className="w-4 h-1 rounded-full" style={{ backgroundColor: colors.primary }} />
            </div>
            <div className="w-5 h-1 rounded-full" style={{ backgroundColor: c.textSecondary, opacity: 0.3 }} />
            <div className="w-5 h-1 rounded-full" style={{ backgroundColor: c.textSecondary, opacity: 0.3 }} />
          </div>
          {/* Main content */}
          <div className="flex-1 p-2.5 flex flex-col gap-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="h-2 w-12 rounded" style={{ backgroundColor: c.textPrimary, opacity: 0.8 }} />
              <div
                className="h-4 w-10 rounded text-[7px] font-medium flex items-center justify-center"
                style={{ backgroundColor: colors.primary, color: '#fff' }}
              >
                New
              </div>
            </div>
            {/* Cards */}
            <div
              className="rounded-md p-2 flex-1 flex flex-col gap-1.5"
              style={{ backgroundColor: c.panel, border: `1px solid ${c.border}` }}
            >
              <div className="h-1.5 w-16 rounded" style={{ backgroundColor: c.textPrimary, opacity: 0.7 }} />
              <div className="h-1.5 w-20 rounded" style={{ backgroundColor: c.textSecondary, opacity: 0.5 }} />
              <div className="h-1.5 w-12 rounded" style={{ backgroundColor: c.textSecondary, opacity: 0.3 }} />
              <div className="mt-auto flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
                <div className="h-1 w-8 rounded" style={{ backgroundColor: c.textSecondary, opacity: 0.4 }} />
              </div>
            </div>
            {/* Badge row */}
            <div className="flex items-center gap-1.5">
              <div
                className="h-3.5 px-1.5 rounded-full text-[6px] font-medium flex items-center"
                style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
              >
                Active
              </div>
              <div
                className="h-3.5 px-1.5 rounded-full text-[6px] font-medium flex items-center"
                style={{ backgroundColor: `${colors.tertiary}15`, color: colors.tertiary }}
              >
                3 new
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaletteCard({
  palette,
  selected,
  onSelect,
}: {
  palette: PaletteOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const { colors } = palette;

  return (
    <div
      className={`group relative rounded-2xl border-2 transition-all duration-300 bg-card ${
        selected
          ? 'border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20'
          : 'border-border hover:border-muted-foreground/30 hover:shadow-md'
      }`}
    >
      {/* Selected badge */}
      {selected && (
        <div className="absolute -top-2.5 -right-2.5 z-10 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Header with big accent swatch */}
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl shadow-lg shrink-0"
            style={{ backgroundColor: colors.primary }}
          />
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-semibold tracking-tight">{palette.name}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{palette.description}</p>
          </div>
        </div>

        {/* Accent swatches */}
        <div className="flex items-center gap-2">
          {[
            { color: colors.primary, label: 'Primary' },
            { color: colors.secondary, label: 'Hover' },
            { color: colors.tertiary, label: 'Light' },
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="w-6 h-6 rounded-full ring-1 ring-black/10 dark:ring-white/10 shadow-sm"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                {c.color}
              </span>
            </div>
          ))}
        </div>

        {/* Mini previews */}
        <div className="flex gap-3">
          <MiniPreview mode="dark" colors={colors} />
          <MiniPreview mode="light" colors={colors} />
        </div>

        {/* Status colours */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium text-muted-foreground">Status</span>
          {(['success', 'warning', 'error', 'info'] as const).map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full ring-1 ring-black/5 dark:ring-white/5"
                style={{ backgroundColor: colors.status[s] }}
              />
              <span className="text-[9px] text-muted-foreground capitalize">{s}</span>
            </div>
          ))}
        </div>

        {/* Apply button */}
        <button
          onClick={onSelect}
          className={`w-full py-2 px-4 rounded-lg text-[13px] font-medium transition-all duration-200 ${
            selected
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted hover:bg-muted/80 text-foreground'
          }`}
        >
          {selected ? '✓ Selected' : 'Apply'}
        </button>
      </div>
    </div>
  );
}

export default function PalettesPage() {
  const [selectedId, setSelectedId] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('mc-selected-palette');
    if (stored) setSelectedId(stored);
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    localStorage.setItem('mc-selected-palette', id);
    window.dispatchEvent(new Event('palette-change'));
  };

  if (!mounted) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Colour Palettes</h1>
          </div>
          <div className="h-6 w-32 rounded bg-muted/30 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">Colour Palettes</h1>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Choose an accent theme. All themes share the same clean dark backgrounds — only the accent colour changes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {palettes.map((p) => (
          <PaletteCard
            key={p.id}
            palette={p}
            selected={selectedId === p.id}
            onSelect={() => handleSelect(p.id)}
          />
        ))}
      </div>
    </div>
  );
}
