'use client';

import { useState, useEffect } from 'react';
import { Clock, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
// Link removed — using programmatic navigation for popover compat

type ScheduleMode = 'manual' | 'schedule' | 'off';

interface ScheduleConfig {
  mode: ScheduleMode;
  enabled: boolean;
  schedules: Array<{
    days: number[];
    startTime: string;
    endTime: string;
  }>;
  tempOverride: {
    enabledUntil: string;
    reason: string;
  } | null;
}

interface ScheduleResponse {
  config: ScheduleConfig;
  isCurrentlyActive: boolean;
}

export function ScheduleToggle() {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [overrideHours, setOverrideHours] = useState('');

  const fetchSchedule = async () => {
    try {
      const res = await fetch('/api/agents/schedule');
      if (!res.ok) throw new Error('Failed to fetch schedule');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    }
  };

  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(fetchSchedule, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const toggleEnabled = async () => {
    if (!data?.config) return;

    const newEnabled = !data.config.enabled;
    
    try {
      const res = await fetch('/api/agents/schedule', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ...data.config,
          enabled: newEnabled 
        }),
      });

      if (!res.ok) throw new Error('Failed to update schedule');
      
      await fetchSchedule();
      toast.success(newEnabled ? 'Schedule enabled' : 'Schedule disabled');
    } catch (error) {
      toast.error('Failed to update schedule');
    }
  };

  const applyOverride = async () => {
    if (!data?.config) return;

    const hours = parseInt(overrideHours);
    if (isNaN(hours) || hours <= 0) {
      toast.error('Please enter a valid number of hours');
      return;
    }

    try {
      const enabledUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      const res = await fetch('/api/agents/schedule', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ...data.config,
          tempOverride: {
            enabledUntil,
            reason: `Manual override for ${hours}h`,
          }
        }),
      });

      if (!res.ok) throw new Error('Failed to apply override');
      
      await fetchSchedule();
      setOverrideHours('');
      setOpen(false);
      toast.success(`Override applied - agents will run for ${hours} hours`);
    } catch (error) {
      toast.error('Failed to apply override');
    }
  };

  const clearOverride = async () => {
    if (!data?.config) return;
    try {
      const res = await fetch('/api/agents/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data.config, tempOverride: null }),
      });
      if (!res.ok) throw new Error('Failed to clear override');
      await fetchSchedule();
      toast.success('Override cleared');
    } catch (error) {
      toast.error('Failed to clear override');
    }
  };

  // Mon-Sun order (not Sun-Sat)
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  // Convert JS day (0=Sun) to Mon-first (0=Mon)
  const toMonFirst = (jsDay: number) => jsDay === 0 ? 6 : jsDay - 1;

  const getScheduleInfo = (): { current: { startTime: string; endTime: string } | null; next: { startTime: string; endTime: string; daysUntil: number } | null } => {
    if (!data?.config?.schedules?.length) return { current: null, next: null };
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let current: { startTime: string; endTime: string } | null = null;
    let next: { startTime: string; endTime: string; daysUntil: number } | null = null;

    // Check current windows for today
    for (const w of data.config.schedules) {
      if (!w.days?.includes(currentDay)) continue;
      const [sh, sm] = w.startTime.split(':').map(Number);
      const [eh, em] = w.endTime.split(':').map(Number);
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      if (currentMinutes >= start && currentMinutes < end) {
        current = w;
      }
      if (!current && currentMinutes < start) {
        if (!next || start < (parseInt(next.startTime.split(':')[0]) * 60 + parseInt(next.startTime.split(':')[1]))) {
          next = { ...w, daysUntil: 0 };
        }
      }
    }

    // If no next today, search upcoming days
    if (!current && !next) {
      for (let offset = 1; offset <= 7; offset++) {
        const checkDay = (currentDay + offset) % 7;
        // Find earliest window on that day
        let earliest: { startTime: string; endTime: string } | null = null;
        for (const w of data.config.schedules) {
          if (!w.days?.includes(checkDay)) continue;
          if (!earliest || w.startTime < earliest.startTime) earliest = w;
        }
        if (earliest) {
          next = { ...earliest, daysUntil: offset };
          break;
        }
      }
    }

    return { current, next };
  };

  const formatNextLabel = (next: { startTime: string; endTime: string; daysUntil: number }) => {
    const dayPrefix = next.daysUntil === 0 ? 'Today' :
      next.daysUntil === 1 ? 'Tomorrow' :
      dayNames[toMonFirst((new Date().getDay() + next.daysUntil) % 7)];
    return `${dayPrefix} ${next.startTime}–${next.endTime}`;
  };

  const getStatusLine = (): string => {
    if (!data?.config) return '';
    const { config } = data;
    if (config.tempOverride) {
      return `Override until ${new Date(config.tempOverride.enabledUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (config.mode === 'off' || !config.enabled) return 'Disabled';
    if (config.mode === 'manual') return 'Always active';
    
    const { current, next } = getScheduleInfo();
    if (current) return `Active until ${current.endTime}`;
    if (next) return `Next: ${formatNextLabel(next)}`;
    return 'No upcoming windows';
  };

  if (!data?.config) {
    // Graceful fallback - show grey dot if data fails to load
    return (
      <div className="flex items-center gap-2 h-9 px-3 rounded-full bg-muted/40">
        <span className="h-2 w-2 rounded-full shrink-0 bg-muted-foreground/40" />
        <span className="text-[13px] font-medium text-muted-foreground">Off</span>
      </div>
    );
  }

  const isActive = data.isCurrentlyActive ?? false;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-2 h-9 px-3 rounded-full transition-colors duration-150 ${
            isActive
              ? 'bg-primary/10 hover:bg-primary/20'
              : 'bg-muted/40 hover:bg-muted/60'
          }`}
          aria-label="Work schedule status"
        >
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              isActive ? 'bg-primary' : 'bg-muted-foreground/40'
            }`}
          />
          <span className={`text-[13px] font-medium ${
            isActive ? 'text-primary' : 'text-muted-foreground'
          }`}>
            {isActive ? 'On' : 'Off'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/20">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-[13px] font-medium">Work Schedule</h3>
            </div>
            <Switch
              checked={data?.config?.enabled ?? false}
              onCheckedChange={toggleEnabled}
            />
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            {getStatusLine()}
          </p>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 space-y-3">

          {/* Override Section */}
          <div className="pt-2 border-t border-border/20">
            <label className="text-[11px] text-muted-foreground/60 mb-2 block">
              Quick override
            </label>
            {data?.config?.tempOverride ? (
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-muted-foreground">
                  Active until {new Date(data.config.tempOverride.enabledUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearOverride}
                  className="h-8 text-[11px] border-border/20"
                >
                  Clear
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={overrideHours}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    setOverrideHours(v);
                  }}
                  placeholder="Hours"
                  className="flex-1 h-8 px-3 text-[13px] bg-secondary border border-border/20 rounded-lg outline-none focus:border-primary/50 transition-colors duration-150"
                />
                <Button
                  size="sm"
                  onClick={applyOverride}
                  disabled={!overrideHours}
                  className="h-8 text-[11px]"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Link */}
        <div className="px-4 py-2.5 border-t border-border/20 bg-muted/20">
          <button
            onClick={() => {
              setOpen(false);
              window.location.href = '/settings';
            }}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            <span>Configure schedule</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
