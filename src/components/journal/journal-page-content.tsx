'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CalendarDays, LayoutGrid, Table } from 'lucide-react';

interface JournalEntry {
  id: string;
  path: string;
  title: string | null;
  content: string | null;
  category: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

type ViewMode = 'cards' | 'table';

function dateSlug(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromSlug(slug: string) {
  const [year, month, day] = slug.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function entrySlug(entry: JournalEntry) {
  const match = entry.path.match(/journal\/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatUpdated(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function JournalPageContent() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [thoughts, setThoughts] = useState('');
  const [saving, setSaving] = useState(false);
  const [sheetEntry, setSheetEntry] = useState<JournalEntry | null>(null);

  const selectedSlug = useMemo(() => dateSlug(selectedDate), [selectedDate]);

  const loadEntries = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select('id, path, title, content, category, created_at, updated_at')
      .eq('category', 'journal')
      .order('path', { ascending: false });

    setEntries((data || []) as JournalEntry[]);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    const channel = supabase
      .channel('journal-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents', filter: 'category=eq.journal' }, () => {
        loadEntries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadEntries]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const aSlug = entrySlug(a) || '';
      const bSlug = entrySlug(b) || '';
      return bSlug.localeCompare(aSlug);
    });
  }, [entries]);

  const selectedEntry = useMemo(() => {
    return entries.find((entry) => entrySlug(entry) === selectedSlug) || null;
  }, [entries, selectedSlug]);

  const displayCards = useMemo(() => {
    const cards = [...sortedEntries];
    if (!selectedEntry) {
      cards.unshift({
        id: `draft-${selectedSlug}`,
        path: `journal/${selectedSlug}`,
        title: formatFullDate(selectedDate),
        content: null,
        category: 'journal',
      });
    }
    return cards;
  }, [sortedEntries, selectedEntry, selectedDate, selectedSlug]);

  const handleDateChange = (value: string) => {
    if (!value) return;
    setSelectedDate(dateFromSlug(value));
  };

  const handleSaveThoughts = async () => {
    const trimmed = thoughts.trim();
    if (!trimmed) return;
    setSaving(true);

    const path = `journal/${selectedSlug}`;
    const now = new Date().toISOString();
    const title = formatFullDate(selectedDate);
    const existing = selectedEntry?.content?.trim();
    const nextContent = existing ? `${existing}\n\n${trimmed}` : trimmed;

    await supabase
      .from('documents')
      .upsert(
        {
          path,
          title,
          content: nextContent,
          category: 'journal',
          updated_at: now,
        },
        { onConflict: 'path' }
      );

    setThoughts('');
    setSaving(false);
  };

  return (
    <div className="text-foreground animate-in fade-in duration-300">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Journal</p>
          <h1 className="text-2xl font-bold tracking-tight">Daily log</h1>
          <p className="text-[13px] text-muted-foreground">One entry per day, appended as you go.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border/20 bg-card px-3 py-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedSlug}
              onChange={(event) => handleDateChange(event.target.value)}
              className="h-8 border-0 bg-transparent px-0 text-[11px] text-foreground"
            />
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border/20 bg-card p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] transition-colors ${
                viewMode === 'cards' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-secondary transition-colors duration-150'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] transition-colors ${
                viewMode === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-secondary transition-colors duration-150'
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              Table
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border/20 bg-card p-4">
        {viewMode === 'cards' ? (
          <ScrollArea className="h-[calc(100vh-22rem)] pr-2">
            <div className="space-y-4">
              {displayCards.map((entry) => {
                const slug = entrySlug(entry) || selectedSlug;
                const entryDate = dateFromSlug(slug);
                const isSelected = slug === selectedSlug;
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSheetEntry(entry)}
                    className={`w-full rounded-lg border border-border/20 bg-card p-5 text-left transition-colors hover:bg-secondary ${
                      isSelected ? 'ring-1 ring-white/[0.18]' : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold">{formatFullDate(entryDate)}</p>
                        <p className="text-[11px] text-muted-foreground">Last updated {formatUpdated(entry.updated_at)}</p>
                      </div>
                      {isSelected && (
                        <span className="rounded-full border border-border/20 px-3 py-1 text-[10px] font-medium text-muted-foreground">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-[13px] text-muted-foreground line-clamp-3">
                      {entry.content ? entry.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : 'No entry yet. Add your thoughts below.'}
                    </p>
                  </button>
                );
              })}
              {displayCards.length === 0 && (
                <div className="rounded-lg border border-border/20 bg-card p-6 text-center text-[13px] text-muted-foreground">
                  No journal days yet.
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/20">
            <div className="grid grid-cols-[1.2fr,1fr,auto] gap-4 border-b border-border/20 bg-muted px-4 py-3 text-[11px] font-semibold text-muted-foreground/60">
              <span>Date</span>
              <span>Preview</span>
              <span>Updated</span>
            </div>
            <div className="divide-y divide-border">
              {sortedEntries.map((entry) => {
                const slug = entrySlug(entry) || selectedSlug;
                const entryDate = dateFromSlug(slug);
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSheetEntry(entry)}
                    className="grid w-full grid-cols-[1.2fr,1fr,auto] gap-4 px-4 py-3 text-left text-[13px] transition-colors hover:bg-secondary"
                  >
                    <span className="font-medium">{formatFullDate(entryDate)}</span>
                    <span className="truncate text-muted-foreground">
                      {entry.content ? entry.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : 'No content yet'}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{formatUpdated(entry.updated_at)}</span>
                  </button>
                );
              })}
              {sortedEntries.length === 0 && (
                <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">No journal entries yet.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-border/20 bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Your Thoughts</p>
            <p className="text-[13px] text-muted-foreground">Saving to {formatFullDate(selectedDate)}</p>
          </div>
        </div>
        <Textarea
          value={thoughts}
          onChange={(event) => setThoughts(event.target.value)}
          placeholder="Write something to append to today..."
          className="mt-3 min-h-[160px] text-[13px]"
        />
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">Appends to {selectedSlug}</p>
          <button
            onClick={handleSaveThoughts}
            disabled={saving || !thoughts.trim()}
            className="rounded-full border border-border/20 px-4 py-2 text-[11px] font-medium transition-colors duration-150 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save thoughts'}
          </button>
        </div>
      </div>

      <Sheet open={Boolean(sheetEntry)} onOpenChange={(open) => !open && setSheetEntry(null)}>
        <SheetContent side="right" className="w-full max-w-xl bg-background text-foreground">
          <SheetHeader>
            <SheetTitle className="text-lg">{sheetEntry ? formatFullDate(dateFromSlug(entrySlug(sheetEntry) || selectedSlug)) : 'Entry'}</SheetTitle>
          </SheetHeader>
          {sheetEntry && (
            <div className="mt-6 space-y-4 text-[13px]">
              <div className="text-[11px] font-medium text-muted-foreground">
                Updated {formatUpdated(sheetEntry.updated_at)}
              </div>
              <div className="whitespace-pre-wrap rounded-lg border border-border/20 bg-muted p-4 text-[13px] text-muted-foreground">
                {sheetEntry.content || 'No content for this day yet.'}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
