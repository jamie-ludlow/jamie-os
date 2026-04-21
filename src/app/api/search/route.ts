import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function buildSnippet(content: string | null | undefined, query: string, maxLen = 100): string {
  if (!content) return '';
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerContent.indexOf(lowerQuery);
  const start = Math.max(0, idx >= 0 ? idx - 50 : 0);
  const end = Math.min(content.length, start + maxLen);
  const snippet = content.slice(start, end);
  return `${start > 0 ? '…' : ''}${snippet}${end < content.length ? '…' : ''}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();

  // Legacy support: if type=tasks, return flat array
  const typeFilter = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '5', 10);

  if (!query) {
    return typeFilter ? NextResponse.json([]) : NextResponse.json({ results: [] });
  }

  const pattern = `%${query}%`;

  const [tasks, documents, projects, changelog, goals, sops] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, description, status, assignee, project_id')
      .or(`title.ilike.${pattern},description.ilike.${pattern}`)
      .limit(limit),
    supabase
      .from('documents')
      .select('id, title, content, path')
      .or(`title.ilike.${pattern},content.ilike.${pattern}`)
      .neq('type', 'sop')
      .limit(limit),
    supabase
      .from('projects')
      .select('id, name, description, color')
      .or(`name.ilike.${pattern},description.ilike.${pattern}`)
      .limit(limit),
    supabase
      .from('changelog')
      .select('id, title, description, created_at')
      .or(`title.ilike.${pattern},description.ilike.${pattern}`)
      .limit(limit),
    supabase
      .from('goals')
      .select('id, title, description, status')
      .or(`title.ilike.${pattern},description.ilike.${pattern}`)
      .limit(limit),
    supabase
      .from('documents')
      .select('id, title, content, path')
      .eq('type', 'sop')
      .or(`title.ilike.${pattern},content.ilike.${pattern}`)
      .limit(limit),
  ]);

  const allResults = [
    { name: 'tasks', ...tasks },
    { name: 'documents', ...documents },
    { name: 'projects', ...projects },
    { name: 'changelog', ...changelog },
    { name: 'goals', ...goals },
    { name: 'sops', ...sops },
  ];
  const errors = allResults.filter(r => r.error);
  if (errors.length > 0) {
    console.error('Search errors:', JSON.stringify(errors.map(e => ({ name: e.name, error: e.error }))));
    // Don't fail entirely — return results from queries that worked
  }

  // Legacy flat array response for old command palette
  if (typeFilter === 'tasks') {
    return NextResponse.json(
      (tasks.data || []).map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        assignee: t.assignee,
        project_id: t.project_id,
      }))
    );
  }

  const results = [
    ...(tasks.data || []).map((t) => ({
      type: 'task' as const,
      id: t.id,
      title: t.title,
      snippet: buildSnippet(t.description, query),
      meta: t.status?.replace(/_/g, ' '),
      link: `/board?task=${t.id}`,
    })),
    ...(projects.data || []).map((p) => ({
      type: 'project' as const,
      id: p.id,
      title: p.name,
      snippet: buildSnippet(p.description, query),
      meta: null,
      link: `/projects?id=${p.id}`,
    })),
    ...(documents.data || []).map((d) => ({
      type: 'document' as const,
      id: d.id,
      title: d.title,
      snippet: buildSnippet(d.content, query),
      meta: null,
      link: `/documents?path=${encodeURIComponent(d.path)}`,
    })),
    ...(sops.data || []).map((s) => ({
      type: 'sop' as const,
      id: s.id,
      title: s.title,
      snippet: buildSnippet(s.content, query),
      meta: null,
      link: `/documents?path=${encodeURIComponent(s.path)}`,
    })),
    ...(goals.data || []).map((g) => ({
      type: 'goal' as const,
      id: g.id,
      title: g.title,
      snippet: buildSnippet(g.description, query),
      meta: g.status?.replace(/_/g, ' '),
      link: `/goals?id=${g.id}`,
    })),
    ...(changelog.data || []).map((c) => ({
      type: 'changelog' as const,
      id: c.id,
      title: c.title,
      snippet: buildSnippet(c.description, query),
      meta: null,
      link: `/changelog?highlight=${c.id}`,
    })),
  ];

  return NextResponse.json({ results });
}
