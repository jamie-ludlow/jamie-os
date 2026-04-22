import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function pickDisplayName(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }) {
  const meta = user.user_metadata || {};
  const candidates = [meta.full_name, meta.name, meta.display_name, meta.username, user.email, user.id];
  const name = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return String(name || user.id).trim();
}

export async function GET() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data?.users || [])
    .map((user) => pickDisplayName(user))
    .filter(Boolean);

  const unique = Array.from(new Set(users.map((u) => u.trim()).filter(Boolean)));
  unique.sort((a, b) => a.localeCompare(b));

  return NextResponse.json(['Agent', ...unique]);
}
