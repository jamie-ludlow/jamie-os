import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function displayName(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }) {
  const meta = user.user_metadata || {};
  const candidates = [meta.full_name, meta.name, meta.display_name, meta.username, user.email, user.id];
  return String(candidates.find((v) => typeof v === 'string' && v.trim()) || user.id).trim();
}

export async function GET() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (data?.users || []).map((user) => ({
    id: user.id,
    email: user.email,
    name: displayName(user),
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
  }));

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email || '').trim();
  const password = String(body.password || '').trim();
  const name = String(body.name || '').trim();
  const mode = String(body.mode || 'create');
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  if (mode === 'invite') {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name || email, name: name || email },
      redirectTo: `${origin}/auth/reset`,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      user: {
        id: data.user?.id || email,
        email,
        name: name || email,
        invited: true,
      },
    });
  }

  if (!password) return NextResponse.json({ error: 'Password is required' }, { status: 400 });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name || email, name: name || email },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      name: displayName(data.user),
    },
  });
}
