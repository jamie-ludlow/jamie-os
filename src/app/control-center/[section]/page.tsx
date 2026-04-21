import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ControlCenterPage } from '@/components/control-center/control-center-page';
import { isSectionKey, SOURCE_BY_SLUG, TITLE_BY_SECTION } from '@/components/control-center/config';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DOC_ROUTE_TITLES: Record<string, string> = {
  'share-export': 'Share Export',
  'openclaw-complete-reference': 'Complete OpenClaw Handbook',
  'file-document-map': 'File & Document Map',
  'source-of-truth-model': 'Source-of-Truth Model',
  'memory-operating-model': 'Memory Operating Model',
  'troubleshooting-baseline': 'Troubleshooting Baseline',
  'fixing-problems': 'Fixing Problems',
  'public-private-view-model': 'Public vs Private View Model',
  'maintenance-prompt-pack': 'Maintenance Prompt Pack',
  'improvement-programme-status-matrix': 'Improvement Programme Status Matrix',
};

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;

  if (DOC_ROUTE_TITLES[section]) {
    return {
      title: DOC_ROUTE_TITLES[section],
      description: 'OpenClaw Control Center public documentation page',
    };
  }

  if (isSectionKey(section)) {
    return {
      title: TITLE_BY_SECTION[section],
      description: 'OpenClaw Control Center',
    };
  }

  return {
    title: 'OpenClaw Control Center',
  };
}

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

export default async function ControlCenterSectionRoute({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const source = SOURCE_BY_SLUG.get(section);

  if (!isSectionKey(section) && !source) return notFound();

  const initialDocs = await loadDocs();

  return (
    <ErrorBoundary fallbackTitle="OpenClaw Control Center failed to load" fallbackSubtitle="Something went wrong loading the control center. Try again.">
      <ControlCenterPage
        initialDocs={initialDocs}
        initialSection={isSectionKey(section) ? section : source!.section}
        initialSourceSlug={!isSectionKey(section) && source ? section : section === 'share-export' ? 'share-export' : undefined}
      />
    </ErrorBoundary>
  );
}
