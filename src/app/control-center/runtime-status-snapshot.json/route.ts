import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('documents')
    .select('content')
    .eq('path', 'openclaw-control-center/runtime-status-snapshot')
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'runtime_status_snapshot_unavailable', message: 'Data not available' }, { status: 503 });
  }

  try {
    return NextResponse.json(JSON.parse(data.content || '{}'));
  } catch {
    return NextResponse.json({ error: 'runtime_status_snapshot_invalid_json', message: 'Data not available' }, { status: 500 });
  }
}
