'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Flame, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HabitCompletion {
  id: string;
  habit_id: string;
  completed_date: string;
  created_at: string;
}

interface HabitStats {
  current_streak: number;
  best_streak: number;
  total_completions: number;
  completion_rate: number;
  days_since_creation: number;
}

interface Habit {
  id: string;
  title: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  completions: HabitCompletion[];
  stats: HabitStats;
}

/** Returns the last 7 dates as YYYY-MM-DD strings, oldest first */
function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

/** Format YYYY-MM-DD as short weekday label */
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(d).slice(0, 2);
}

/** Format YYYY-MM-DD as DD Mon for tooltip */
function fullDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d);
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0];
}

export function HabitTrackerWidget() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null); // "habitId|date"
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const days = getLast7Days();

  const fetchHabits = useCallback(async () => {
    try {
      const res = await fetch('/api/habits');
      if (!res.ok) return;
      const data = await res.json();
      setHabits(data);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  const startEdit = (habit: Habit) => {
    setEditingId(habit.id);
    setEditTitle(habit.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const saveRename = async (id: string) => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }
    const original = habits.find((h) => h.id === id)?.title ?? '';
    if (trimmed === original) {
      cancelEdit();
      return;
    }

    // Optimistic update
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, title: trimmed } : h))
    );
    setEditingId(null);
    setEditTitle('');

    try {
      const res = await fetch(`/api/habits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        fetchHabits(); // Revert on error
      }
    } catch {
      fetchHabits();
    }
  };

  const toggleCompletion = async (habitId: string, date: string) => {
    const key = `${habitId}|${date}`;
    if (toggling === key) return;
    setToggling(key);

    // Optimistic update
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const alreadyDone = h.completions.some((c) => c.completed_date === date);
        return {
          ...h,
          completions: alreadyDone
            ? h.completions.filter((c) => c.completed_date !== date)
            : [
                ...h.completions,
                {
                  id: 'optimistic',
                  habit_id: habitId,
                  completed_date: date,
                  created_at: new Date().toISOString(),
                },
              ],
        };
      })
    );

    try {
      const res = await fetch(`/api/habits/${habitId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) {
        fetchHabits();
      } else {
        fetchHabits();
      }
    } catch {
      fetchHabits();
    } finally {
      setToggling(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    // Optimistic remove
    setHabits((prev) => prev.filter((h) => h.id !== pendingDeleteId));
    try {
      const res = await fetch(`/api/habits/${pendingDeleteId}`, { method: 'DELETE' });
      if (!res.ok) {
        fetchHabits(); // Revert on error
      }
    } catch {
      fetchHabits();
    } finally {
      setPendingDeleteId(null);
      setDeleting(false);
    }
  };

  const addHabit = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), sort_order: habits.length }),
      });
      if (res.ok) {
        const created = await res.json();
        setHabits((prev) => [...prev, created]);
        setNewTitle('');
        setDialogOpen(false);
      }
    } catch {
      // Silently handle
    } finally {
      setAdding(false);
    }
  };

  const pendingDeleteHabit = habits.find((h) => h.id === pendingDeleteId) ?? null;

  return (
    <TooltipProvider>
      <section className="rounded-lg border border-border/20 bg-card px-5 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <h2 className="text-[13px] font-semibold">Daily Habits</h2>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-[13px] font-semibold">New Habit</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <div className="space-y-1.5">
                  <Label htmlFor="habit-title" className="text-[11px] text-muted-foreground">
                    Name
                  </Label>
                  <Input
                    id="habit-title"
                    placeholder="e.g. Morning run, Read 20 pages"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addHabit()}
                    className="text-[13px]"
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[11px]"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="text-[11px]"
                  onClick={addHabit}
                  disabled={adding || !newTitle.trim()}
                >
                  {adding ? 'Adding…' : 'Add Habit'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Day header row */}
        {!loading && habits.length > 0 && (
          <div className="flex items-center mb-1">
            {/* spacer for habit name column */}
            <div className="flex-1 min-w-0" />
            <div className="flex gap-1 shrink-0">
              {days.map((d) => (
                <div
                  key={d}
                  className={`w-6 text-center text-[9px] uppercase tracking-wider font-medium ${
                    isToday(d) ? 'text-primary' : 'text-muted-foreground/50'
                  }`}
                >
                  {dayLabel(d)}
                </div>
              ))}
              {/* streak column header */}
              <div className="w-8 text-center text-[9px] uppercase tracking-wider text-muted-foreground/50 font-medium">
                Str
              </div>
              {/* edit + delete column spacers */}
              <div className="w-6" />
              <div className="w-6" />
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <p className="text-[13px] text-muted-foreground/60 py-2">Loading…</p>
        )}

        {/* Empty state */}
        {!loading && habits.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground/60">No habits yet</p>
            <p className="text-[11px] text-muted-foreground/40 mt-1">Click Add to track your first habit</p>
          </div>
        )}

        {/* Habit rows */}
        {!loading && (
          <div className="space-y-1">
            {habits.map((habit) => {
              const completedDates = new Set(habit.completions.map((c) => c.completed_date));
              const isEditing = editingId === habit.id;
              const stats = habit.stats ?? {
                current_streak: 0,
                best_streak: 0,
                total_completions: 0,
                completion_rate: 0,
                days_since_creation: 1,
              };

              return (
                <div
                  key={habit.id}
                  className="group flex items-center gap-1 py-1 rounded-md hover:bg-muted/30 transition-colors duration-150 -mx-1 px-1"
                >
                  {/* Habit name / inline edit */}
                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(habit.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      onBlur={() => saveRename(habit.id)}
                      className="flex-1 min-w-0 text-[13px] text-foreground bg-transparent border-b border-primary outline-none pr-2 leading-tight"
                      aria-label="Rename habit"
                    />
                  ) : (
                    <span
                      className="flex-1 min-w-0 text-[13px] text-foreground truncate pr-2 cursor-default"
                      onDoubleClick={() => startEdit(habit)}
                      title="Double-click to rename"
                    >
                      {habit.title}
                    </span>
                  )}

                  {/* Day cells */}
                  <div className="flex gap-1 shrink-0">
                    {days.map((d) => {
                      const done = completedDates.has(d);
                      const key = `${habit.id}|${d}`;
                      const isToggling = toggling === key;

                      return (
                        <Tooltip key={d}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => toggleCompletion(habit.id, d)}
                              disabled={isToggling}
                              className={`w-6 h-6 flex items-center justify-center rounded-full transition-all duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                                isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'
                              }`}
                              aria-label={`${done ? 'Unmark' : 'Mark'} ${habit.title} for ${fullDateLabel(d)}`}
                            >
                              {done ? (
                                <CheckCircle2
                                  className={`h-4 w-4 ${
                                    isToday(d) ? 'text-primary' : 'text-primary/60'
                                  }`}
                                />
                              ) : (
                                <Circle
                                  className={`h-4 w-4 ${
                                    isToday(d)
                                      ? 'text-muted-foreground/50'
                                      : 'text-muted-foreground/25'
                                  }`}
                                />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[11px]">
                            {habit.title} · {fullDateLabel(d)} · {done ? 'Done ✓' : 'Not done'}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}

                    {/* Streak — with stats tooltip */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-8 flex items-center justify-center cursor-default">
                          {stats.current_streak > 0 ? (
                            <span className="text-[11px] font-semibold text-primary tabular-nums">
                              {stats.current_streak}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/30 tabular-nums">—</span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="p-0">
                        <div className="px-3 py-2 min-w-[160px]">
                          <p className="text-[11px] font-semibold text-foreground mb-1.5">
                            {habit.title}
                          </p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[11px] text-muted-foreground">Current streak</span>
                              <span className="text-[11px] font-medium text-primary tabular-nums">
                                {stats.current_streak > 0
                                  ? `${stats.current_streak}d 🔥`
                                  : '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[11px] text-muted-foreground">Best streak</span>
                              <span className="text-[11px] font-medium tabular-nums">
                                {stats.best_streak > 0
                                  ? `${stats.best_streak}d 🏆`
                                  : '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[11px] text-muted-foreground">Completion rate</span>
                              <span className="text-[11px] font-medium tabular-nums">
                                {stats.completion_rate}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[11px] text-muted-foreground">Total days</span>
                              <span className="text-[11px] font-medium tabular-nums">
                                {stats.total_completions}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* Rename — shows on row hover */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => startEdit(habit)}
                          className="w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-foreground transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
                          aria-label={`Rename ${habit.title}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[11px]">
                        Rename habit
                      </TooltipContent>
                    </Tooltip>

                    {/* Delete — shows on row hover */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setPendingDeleteId(habit.id)}
                          className="w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 rounded"
                          aria-label={`Delete ${habit.title}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[11px]">
                        Delete habit
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Confirm delete dialog */}
      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        title="Delete Habit"
        description={
          pendingDeleteHabit
            ? `Are you sure you want to delete "${pendingDeleteHabit.title}"? All completion records will also be permanently deleted.`
            : 'This action cannot be undone.'
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setPendingDeleteId(null);
        }}
      />
    </TooltipProvider>
  );
}
