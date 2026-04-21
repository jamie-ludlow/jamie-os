import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface ScheduleWindow {
  days: number[];
  startTime: string;
  endTime: string;
}

interface TempOverride {
  enabledUntil: string;
  enabled?: boolean;
  reason?: string;
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
      days: [1, 2, 3, 4, 5], // Mon-Fri
      startTime: '08:00',
      endTime: '14:00',
    },
    {
      days: [1, 2, 3, 4, 5], // Mon-Fri
      startTime: '19:00',
      endTime: '23:59',
    },
  ],
  tempOverride: null,
};

function isCurrentlyActive(config: ScheduleConfig): boolean {
  // Check temp override first
  if (config.tempOverride) {
    const now = new Date();
    const until = new Date(config.tempOverride.enabledUntil);
    if (now < until) {
      return config.tempOverride.enabled !== false;
    }
    // Override expired, fall through to normal schedule
  }

  // If mode is off, never active
  if (config.mode === 'off') return false;

  // If manual mode, use enabled flag
  if (config.mode === 'manual') return config.enabled;

  // Schedule mode — check if current time is within any window
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun, 1=Mon...6=Sat
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  for (const window of config.schedules) {
    if (!window.days.includes(currentDay)) continue;

    // Compare times as strings (works for HH:MM format)
    if (currentTime >= window.startTime && currentTime <= window.endTime) {
      return true;
    }
  }

  return false;
}

export async function GET(req: NextRequest) {
  // API key auth
  const apiKey = req.headers.get('x-api-key');
  const expectedKey = process.env.MC_API_KEY;

  if (!expectedKey) {
    return NextResponse.json(
      { error: 'MC_API_KEY not configured' },
      { status: 500 }
    );
  }

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Try to fetch from agent_config table
    const { data, error } = await supabaseAdmin
      .from('agent_config')
      .select('config')
      .eq('id', 'schedule')
      .single();

    // If table doesn't exist or row missing, return default config
    if (error && (error.code === 'PGRST116' || error.code === '42P01')) {
      // PGRST116 = no rows, 42P01 = table doesn't exist
      const config = DEFAULT_CONFIG;
      return NextResponse.json({
        config,
        isCurrentlyActive: isCurrentlyActive(config),
      });
    }

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch schedule config', details: error.message },
        { status: 500 }
      );
    }

    const config = (data?.config as ScheduleConfig) || DEFAULT_CONFIG;

    return NextResponse.json({
      config,
      isCurrentlyActive: isCurrentlyActive(config),
    });
  } catch (err) {
    console.error('Schedule GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch schedule', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  // API key auth
  const apiKey = req.headers.get('x-api-key');
  const expectedKey = process.env.MC_API_KEY;

  if (!expectedKey) {
    return NextResponse.json(
      { error: 'MC_API_KEY not configured' },
      { status: 500 }
    );
  }

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const config = body as ScheduleConfig;

    // Validate config structure
    if (!config.mode || !['manual', 'schedule', 'off'].includes(config.mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be one of: manual, schedule, off' },
        { status: 400 }
      );
    }

    if (typeof config.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    if (!Array.isArray(config.schedules)) {
      return NextResponse.json(
        { error: 'schedules must be an array' },
        { status: 400 }
      );
    }

    // Upsert to agent_config table
    const { error } = await supabaseAdmin
      .from('agent_config')
      .upsert({
        id: 'schedule',
        config,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      // If table doesn't exist, return helpful error
      if (error.code === '42P01') {
        return NextResponse.json(
          {
            error: 'agent_config table does not exist',
            hint: 'Create the table first via Supabase dashboard with columns: id (text, primary key), config (jsonb), updated_at (timestamptz)',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to save schedule config', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      config,
      isCurrentlyActive: isCurrentlyActive(config),
    });
  } catch (err) {
    console.error('Schedule PUT error:', err);
    return NextResponse.json(
      { error: 'Failed to update schedule', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
