'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Clock, Plus, X, Play, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleWindow {
  days: number[];
  startTime: string;
  endTime: string;
}

interface TempOverride {
  until: string;
  enabled: boolean;
}

interface ScheduleConfig {
  mode: 'manual' | 'schedule' | 'off';
  enabled: boolean;
  schedules: ScheduleWindow[];
  tempOverride: TempOverride | null;
}

const DEFAULT_CONFIG: ScheduleConfig = {
  mode: 'manual',
  enabled: true,
  schedules: [
    {
      days: [1, 2, 3, 4, 5],
      startTime: '08:00',
      endTime: '14:00',
    },
    {
      days: [1, 2, 3, 4, 5],
      startTime: '19:00',
      endTime: '23:59',
    },
  ],
  tempOverride: null,
};

// Mon-Sun order (UK convention)
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Map display index (0=Mon) to JS day (0=Sun)
const DAY_INDEX_TO_JS = [1, 2, 3, 4, 5, 6, 0];

export function ScheduleSection() {
  const [config, setConfig] = useState<ScheduleConfig>(DEFAULT_CONFIG);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overrideHours, setOverrideHours] = useState(2);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  // Load config from API
  useEffect(() => {
    async function loadConfig() {
      try {
        const apiKey = process.env.NEXT_PUBLIC_MC_API_KEY;
        if (!apiKey) {
          console.warn('MC_API_KEY not configured — using local state only');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/agents/schedule', {
          headers: {
            'x-api-key': apiKey,
          },
        });

        if (!res.ok) {
          console.error('Failed to load schedule config');
          setLoading(false);
          return;
        }

        const data = await res.json();
        setConfig(data.config);
        setIsActive(data.isCurrentlyActive);
      } catch (error) {
        console.error('Failed to load schedule:', error);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!config.tempOverride) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const until = new Date(config.tempOverride!.until);
      const diff = until.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining(null);
        // Clear expired override
        setConfig((prev) => ({ ...prev, tempOverride: null }));
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [config.tempOverride]);

  async function handleSave() {
    setSaving(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_MC_API_KEY;
      if (!apiKey) {
        console.warn('MC_API_KEY not configured');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/agents/schedule', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        console.error('Failed to save schedule config');
        setSaving(false);
        return;
      }

      const data = await res.json();
      setIsActive(data.isCurrentlyActive);
    } catch (error) {
      console.error('Failed to save schedule:', error);
    } finally {
      setSaving(false);
    }
  }

  function addScheduleWindow() {
    setConfig((prev) => ({
      ...prev,
      schedules: [
        ...prev.schedules,
        {
          days: [1, 2, 3, 4, 5],
          startTime: '09:00',
          endTime: '17:00',
        },
      ],
    }));
  }

  function removeScheduleWindow(index: number) {
    setConfig((prev) => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== index),
    }));
  }

  function updateScheduleWindow(index: number, updates: Partial<ScheduleWindow>) {
    setConfig((prev) => ({
      ...prev,
      schedules: prev.schedules.map((w, i) =>
        i === index ? { ...w, ...updates } : w
      ),
    }));
  }

  function toggleDay(windowIndex: number, day: number) {
    const window = config.schedules[windowIndex];
    const newDays = window.days.includes(day)
      ? window.days.filter((d) => d !== day)
      : [...window.days, day].sort((a, b) => a - b);

    updateScheduleWindow(windowIndex, { days: newDays });
  }

  function startTempOverride() {
    const until = new Date();
    until.setHours(until.getHours() + overrideHours);

    setConfig((prev) => ({
      ...prev,
      tempOverride: {
        until: until.toISOString(),
        enabled: true,
      },
    }));
  }

  function cancelTempOverride() {
    setConfig((prev) => ({ ...prev, tempOverride: null }));
  }

  if (loading) {
    return (
      <Card className="rounded-lg border border-border/20 bg-card p-5 shadow-none">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">Work Schedule</h2>
            <p className="text-[13px] text-muted-foreground">Control when Casper is active</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-muted/40 animate-pulse" />
          <div className="h-10 w-full rounded bg-muted/40 animate-pulse" />
          <div className="h-24 w-full rounded bg-muted/40 animate-pulse" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg border border-border/20 bg-card p-5 shadow-none">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">Work Schedule</h2>
            <p className="text-[13px] text-muted-foreground">Control when Casper is active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 rounded-full shrink-0',
              isActive ? 'bg-status-success' : 'bg-muted-foreground/60'
            )}
          />
          <span className="text-[13px] text-muted-foreground">
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="space-y-5">
        {/* Mode selector */}
        <div className="space-y-2">
          <p className="text-[13px] text-muted-foreground">Mode</p>
          <div className="flex gap-2">
            {(['manual', 'schedule', 'off'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setConfig((prev) => ({ ...prev, mode }))}
                className={cn(
                  'flex-1 px-4 py-2.5 text-[13px] font-medium rounded-lg border transition-colors duration-150',
                  config.mode === mode
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border/20 bg-card text-muted-foreground hover:bg-muted/40'
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Manual mode: simple on/off */}
        {config.mode === 'manual' && (
          <div className="flex items-center justify-between rounded-lg border border-border/20 bg-muted/40 px-4 py-3 hover:bg-muted/40 transition-colors duration-150">
            <div>
              <p className="text-[13px] font-medium">Enable Casper</p>
              <p className="text-[13px] text-muted-foreground/60">Manually control agent activity</p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => setConfig((prev) => ({ ...prev, enabled }))}
            />
          </div>
        )}

        {/* Schedule mode: time windows */}
        {config.mode === 'schedule' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-muted-foreground">Active hours</p>
              <Button
                variant="outline"
                size="sm"
                onClick={addScheduleWindow}
                className="h-7 border-border/20 text-[13px] transition-colors duration-150"
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Add window
              </Button>
            </div>

            {config.schedules.map((window, index) => (
              <div
                key={index}
                className="rounded-lg border border-border/20 bg-muted/40 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium">Window {index + 1}</p>
                  {config.schedules.length > 1 && (
                    <button
                      onClick={() => removeScheduleWindow(index)}
                      className="text-muted-foreground/60 hover:text-foreground transition-colors duration-150"
                      aria-label="Delete window"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Day selector */}
                <div className="space-y-2">
                  <p className="text-[13px] text-muted-foreground/60">Days</p>
                  <div className="flex gap-1.5">
                    {DAY_LABELS.map((label, displayIndex) => {
                      const jsDay = DAY_INDEX_TO_JS[displayIndex];
                      return (
                        <button
                          key={jsDay}
                          onClick={() => toggleDay(index, jsDay)}
                          className={cn(
                            'flex-1 px-2 py-1.5 text-[11px] font-medium rounded border transition-colors duration-150',
                            window.days.includes(jsDay)
                              ? 'border-primary/50 bg-primary/10 text-foreground'
                              : 'border-border/20 bg-card text-muted-foreground hover:bg-muted/40'
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[13px] text-muted-foreground/60">Start</p>
                    <Input
                      type="time"
                      value={window.startTime}
                      onChange={(e) =>
                        updateScheduleWindow(index, { startTime: e.target.value })
                      }
                      className="h-9 bg-card border-border/20 text-[13px] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[13px] text-muted-foreground/60">End</p>
                    <Input
                      type="time"
                      value={window.endTime}
                      onChange={(e) =>
                        updateScheduleWindow(index, { endTime: e.target.value })
                      }
                      className="h-9 bg-card border-border/20 text-[13px] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Off mode: show message */}
        {config.mode === 'off' && (
          <div className="rounded-lg border border-border/20 bg-muted/40 px-4 py-3">
            <p className="text-[13px] text-muted-foreground">
              Casper is completely disabled. Change mode to re-enable.
            </p>
          </div>
        )}

        {/* Temporary override */}
        {config.mode !== 'off' && (
          <div className="space-y-3 pt-3 border-t border-border/20">
            <p className="text-[13px] text-muted-foreground">Temporary override</p>

            {config.tempOverride ? (
              <div className="rounded-lg border border-border/20 bg-muted/40 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full shrink-0',
                      config.tempOverride.enabled ? 'bg-status-success' : 'bg-muted-foreground/60'
                    )}
                  />
                  <div>
                    <p className="text-[13px] font-medium">
                      Override active
                    </p>
                    <p className="text-[13px] text-muted-foreground/60">
                      {timeRemaining} remaining
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelTempOverride}
                  className="h-7 border-border/20 text-[13px] transition-colors duration-150"
                >
                  <XCircle className="h-3 w-3 mr-1.5" />
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-muted-foreground/60">Run for</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={overrideHours}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      const num = Number(value) || 1;
                      setOverrideHours(Math.min(Math.max(num, 1), 24));
                    }}
                    className="h-9 w-20 px-3 bg-card border border-border/20 rounded-lg text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  />
                  <span className="text-[13px] text-muted-foreground/60">hours</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startTempOverride}
                  className="h-9 border-border/20 text-[13px] transition-colors duration-150"
                >
                  <Play className="h-3 w-3 mr-1.5" />
                  Start override
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-3 border-t border-border/20">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-9 text-[13px] transition-colors duration-150"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
