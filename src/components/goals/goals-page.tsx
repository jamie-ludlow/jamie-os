'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { Plus, Target, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { GoalsPageSkeleton } from '@/components/ui/skeleton-loaders';
import { toast } from 'sonner';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: 'active' | 'achieved' | 'abandoned';
  category: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
}

function GoalCard({ goal, onUpdate }: { goal: Goal; onUpdate: () => void }) {
  const [progress, setProgress] = useState(goal.progress);
  const [isEditing, setIsEditing] = useState(false);
  const isComplete = goal.status === 'achieved';
  const isRunning = goal.category?.toLowerCase() === 'running';

  const handleProgressUpdate = async (newProgress: number) => {
    setProgress(newProgress);
    try {
      const res = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: goal.id, 
          progress: newProgress,
          status: newProgress === 100 ? 'achieved' : 'active'
        }),
      });
      if (!res.ok) throw new Error();
      onUpdate();
    } catch {
      toast.error('Failed to update progress');
      setProgress(goal.progress);
    }
  };

  return (
    <div
      className={cn(
        'group rounded-lg border border-border/20 bg-card px-5 py-4 transition-all duration-150 hover:bg-muted/40 hover:border-border/30',
        isComplete && 'opacity-50'
      )}
      onMouseEnter={() => setIsEditing(false)}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3
                className={cn(
                  'text-[13px] font-medium',
                  isComplete ? 'line-through text-muted-foreground/60' : 'text-foreground'
                )}
              >
                {goal.title}
              </h3>
              {goal.category && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] px-1.5 py-0 h-4 font-normal',
                    isRunning && 'bg-accent/10 text-accent-foreground border-accent/20'
                  )}
                >
                  {goal.category}
                </Badge>
              )}
            </div>
            {goal.description && (
              <p className="text-[13px] text-muted-foreground/60 line-clamp-2">
                {goal.description}
              </p>
            )}
          </div>
        </div>

        {!isComplete && (
          <div 
            className="space-y-2"
            onClick={() => !isEditing && setIsEditing(true)}
          >
            <div className="flex items-center gap-2.5">
              <Progress
                value={progress}
                className={cn(
                  'h-1.5 flex-1 bg-muted/40 cursor-pointer',
                  isRunning ? '[&>div]:bg-accent' : '[&>div]:bg-primary'
                )}
              />
              <span className="text-[11px] font-medium text-muted-foreground/60 w-8 text-right tabular-nums">
                {progress}%
              </span>
            </div>
            {isEditing && (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  onMouseUp={(e) => {
                    handleProgressUpdate(Number((e.target as HTMLInputElement).value));
                    setIsEditing(false);
                  }}
                  onTouchEnd={(e) => {
                    handleProgressUpdate(Number((e.target as HTMLInputElement).value));
                    setIsEditing(false);
                  }}
                  className="flex-1 h-1.5 accent-primary cursor-pointer"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="h-6 text-[11px] px-2"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
          {goal.target_date && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              {format(parseISO(goal.target_date), 'dd MMM yyyy')}
            </span>
          )}
          {isComplete && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal bg-primary/10 text-primary border-primary/20">
              Achieved
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/goals');
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    const channel = supabase
      .channel('goals-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals' },
        () => fetchGoals()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGoals]);

  const sortedGoals = [...goals].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    if (a.target_date && b.target_date) {
      return parseISO(a.target_date).getTime() - parseISO(b.target_date).getTime();
    }
    if (a.target_date) return -1;
    if (b.target_date) return 1;
    return parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime();
  });

  const activeCount = goals.filter((g) => g.status === 'active').length;
  const achievedCount = goals.filter((g) => g.status === 'achieved').length;

  if (loading) {
    return <GoalsPageSkeleton />;
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Goals</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[13px] text-muted-foreground">
              {activeCount} active · {achievedCount} achieved
            </span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => window.location.href = '/goals/new'}
          className="bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-150 text-[13px] h-8 px-3"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Goal
        </Button>
      </div>

      {sortedGoals.length > 0 ? (
        <div className="space-y-3">
          {sortedGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onUpdate={fetchGoals} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border/20 bg-card p-12 text-center">
          <div className="rounded-full bg-muted/50 p-4 w-fit mx-auto mb-4">
            <Target className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <p className="text-[13px] font-medium text-foreground mb-1">No goals yet</p>
          <p className="text-[13px] text-muted-foreground/60 mb-4">
            Add your first goal to get started
          </p>
          <Button
            size="sm"
            onClick={() => window.location.href = '/goals/new'}
            className="transition-colors duration-150"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Goal
          </Button>
        </div>
      )}
    </div>
  );
}
