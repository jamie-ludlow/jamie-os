'use client';

import { useState, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover';
import { STATUS_STYLES } from '@/lib/constants';
import { useStatuses } from '@/hooks/use-statuses';

// Legacy fallback statuses (only used if DB statuses not loaded)
const SELECTABLE_STATUSES = ['todo', 'doing', 'done'] as const;

export function SearchableStatusPopover({ 
  value, 
  onChange, 
  open, 
  onOpenChange,
  trigger,
}: { 
  value: string; 
  onChange: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const { statuses: dynamicStatuses } = useStatuses();
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    if (nextOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch('');
    }
  };
  
  // Use dynamic statuses from DB, fallback to hardcoded
  const statusList = dynamicStatuses.length > 0
    ? dynamicStatuses.map(s => ({ slug: s.slug, label: s.label, dot: s.dot_colour || s.colour }))
    : SELECTABLE_STATUSES.map(key => ({ slug: key, label: STATUS_STYLES[key].label, dot: STATUS_STYLES[key].dot }));
  
  const filtered = statusList.filter(s => s.label.toLowerCase().includes(search.toLowerCase()));
  
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {trigger || (
          <button className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-muted/60 transition-colors duration-150 whitespace-nowrap">
            {value ? (() => {
              const dynamicStatus = dynamicStatuses.find(s => s.slug === value);
              const style = dynamicStatus
                ? { dot: dynamicStatus.dot_colour || dynamicStatus.colour, label: dynamicStatus.label, text: 'text-foreground' }
                : STATUS_STYLES[value];
              return style ? (
                <>
                  <span className="w-2 h-2 rounded-full transition-colors duration-150" style={{ backgroundColor: style.dot }} />
                  <span className={`text-[13px] transition-colors duration-150 ${style.text}`}>{style.label}</span>
                </>
              ) : (
                <span className="text-[13px] text-muted-foreground/30">No status</span>
              );
            })() : (
              <span className="text-[13px] text-muted-foreground/30">No status</span>
            )}
            <ChevronDown size={12} className="text-muted-foreground/30" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-40 p-0" align="start">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setHighlightedIndex(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(prev => prev + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(prev => Math.max(prev - 1, -1)); }
            else if (e.key === 'Enter') { e.preventDefault(); const items = document.querySelectorAll('[data-search-item]'); const idx = highlightedIndex >= 0 ? highlightedIndex : 0; if (items.length > 0 && items[idx]) (items[idx] as HTMLElement).click(); }
          }}
          placeholder="Search..."
          className="w-full px-3 py-2 text-[13px] bg-transparent border-b border-border/20 outline-none text-foreground placeholder:text-muted-foreground/60 rounded-t-md"
        />
        <div className="p-1 max-h-[280px] overflow-y-auto">
          {value && !search && (
            <>
              <PopoverClose asChild>
                <button
                  onClick={() => { onChange(''); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[13px] text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/40 transition-colors duration-150"
                >
                  <span className="w-2 h-2 rounded-full border border-muted-foreground/20" />
                  No status
                </button>
              </PopoverClose>
              <div className="border-t border-border/20 my-1" />
            </>
          )}
          {filtered.map((status, idx) => (
            <PopoverClose asChild key={status.slug}>
              <button
                onClick={() => { onChange(status.slug); }}
                data-search-item 
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[13px] hover:bg-muted/60 transition-colors duration-150 ${value === status.slug ? 'bg-muted/50' : ''} ${highlightedIndex === idx ? 'bg-primary/15 text-primary' : ''}`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.dot }} />
                <span className="flex-1 text-left">{status.label}</span>
                {value === status.slug && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            </PopoverClose>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-[13px] text-muted-foreground/30 text-center">
              No statuses found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
