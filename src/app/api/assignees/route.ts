import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const DEFAULT_PROFILE_NAME = 'Jamie Ludlow';

function pickDisplayName(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }) {
  const meta = user.user_metadata || {};
  const candidates = [meta.full_name, meta.name, meta.display_name, meta.username, user.email, user.id];
  const name = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return String(name || user.id).trim();
}

export async function GET() {
  const names = new Set<string>(['Agent']);

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (!error) {
      for (const user of data?.users || []) {
        const name = pickDisplayName(user);
        if (name) names.add(name);
      }
    }
  } catch {
    // ignore auth lookup failures and fall back below
  }

  // Jamie OS currently has no separate profiles table in Supabase yet, so we
  // expose the current profile name as a fallback until that table exists.
  names.add(DEFAULT_PROFILE_NAME);

  return NextResponse.json(Array.from(names).sort((a, b) => {
    if (a === 'Agent') return -1;
    if (b === 'Agent') return 1;
    return a.localeCompare(b);
  }));
}
