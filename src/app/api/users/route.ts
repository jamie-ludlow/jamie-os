import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function requireUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

function displayName(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }) {
  const meta = user.user_metadata || {};
  const candidates = [meta.full_name, meta.name, meta.display_name, meta.username, user.email, user.id];
  return String(candidates.find((v) => typeof v === 'string' && v.trim()) || user.id).trim();
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (data?.users || []).map((userRecord) => ({
    id: userRecord.id,
    email: userRecord.email,
    name: displayName(userRecord),
    created_at: userRecord.created_at,
    last_sign_in_at: userRecord.last_sign_in_at,
  }));

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
