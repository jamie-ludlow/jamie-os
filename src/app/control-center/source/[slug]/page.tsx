import { notFound } from 'next/navigation';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ControlCenterPage } from '@/components/control-center/control-center-page';
import { SOURCE_BY_SLUG } from '@/components/control-center/config';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Doc = {
  id: string;
  title: string;
  category: string;
  path: string;
  content: string;
  updated_at?: string;
};

async function loadDocs(): Promise<Doc[]> {
  const { data } = await supabaseAdmin
    .from('documents')
    .select('id,title,category,path,content,updated_at,type,deleted_at')
    .eq('type', 'document')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  return (data || []) as Doc[];
}

export default async function ControlCenterSourceRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const source = SOURCE_BY_SLUG.get(slug);
  if (!source) return notFound();

  const initialDocs = await loadDocs();

  return (
    <ErrorBoundary fallbackTitle="OpenClaw Control Center failed to load" fallbackSubtitle="Something went wrong loading the control center. Try again.">
      <ControlCenterPage initialDocs={initialDocs} initialSection={source.section} initialSourceSlug={slug} />
    </ErrorBoundary>
  );
}
