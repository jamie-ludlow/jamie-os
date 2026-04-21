import { NextRequest, NextResponse } from 'next/server';
import { getFileTree, getDoc, writeDoc, searchDocs } from '@/lib/docs';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  const query = searchParams.get('search');
  const docType = searchParams.get('type');

  if (query) {
    return NextResponse.json(await searchDocs(query));
  }

  if (filePath) {
    const doc = await getDoc(filePath);
    if (doc === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(doc);
  }

  // Return flat list of documents filtered by type
  if (docType) {
    const includeSystem = searchParams.get('includeSystem') === '1';
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('id, path, title, content, category, type, created_at, updated_at')
      .eq('type', docType)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const systemCategories = new Set(['openclaw-control-center', 'openclaw-hub', 'ops-system']);
    const filtered = includeSystem ? (data || []) : (data || []).filter((d) => !systemCategories.has(d.category || ''));
    return NextResponse.json(filtered);
  }

  return NextResponse.json(await getFileTree());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.path || !body.content) {
    return NextResponse.json({ error: 'path and content required' }, { status: 400 });
  }
  const { data: existing } = await supabaseAdmin
    .from('documents')
    .select('id, title')
    .eq('path', body.path)
    .maybeSingle();

  const success = await writeDoc(body.path, body.content, body.title || undefined);
  if (!success) return NextResponse.json({ error: 'Write failed' }, { status: 500 });

  const action = existing ? 'document_updated' : 'document_created';
  await logActivity({
    action,
    description: `${existing ? 'Document updated' : 'Document created'}: ${body.path}`,
    agent: body.agent || 'casper',
    metadata: { path: body.path },
  });
  return NextResponse.json({ success: true, path: body.path }, { status: 201 });
}
