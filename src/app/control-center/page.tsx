import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ControlCenterPage } from '@/components/control-center/control-center-page';
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

export default async function ControlCenterRoute() {
  const initialDocs = await loadDocs();

  return (
    <ErrorBoundary fallbackTitle="OpenClaw Control Center failed to load" fallbackSubtitle="Something went wrong loading the control center. Try again.">
      <ControlCenterPage initialDocs={initialDocs} initialSection="overview" />
    </ErrorBoundary>
  );
}
