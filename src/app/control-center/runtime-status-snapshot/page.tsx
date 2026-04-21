import { supabase } from '@/lib/supabase';

export default async function RuntimeStatusSnapshotPage() {
  const { data } = await supabase
    .from('documents')
    .select('content,updated_at,path,title')
    .eq('path', 'openclaw-control-center/runtime-status-snapshot')
    .is('deleted_at', null)
    .single();

  let parsed: any = null;
  try {
    parsed = data?.content ? JSON.parse(data.content) : null;
  } catch {
    parsed = null;
  }

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Runtime Status Snapshot</h1>
      <p className="text-sm text-muted-foreground">Human-readable public audit view for /control-center/runtime-status-snapshot.</p>
      <div className="rounded border border-border/60 p-3 text-sm">
        <div>Path: {data?.path || 'Data not available'}</div>
        <div>Updated: {data?.updated_at || 'Data not available'}</div>
        <div>Schema: {parsed?.schemaVersion || 'Data not available'}</div>
        <div>Status: {parsed?.systemStatus || 'Data not available'}</div>
        <div>Confidence: {parsed?.confidenceScore ?? 'Data not available'}%</div>
        <div>Validation: {parsed?.validation?.validationStatus || 'Data not available'}</div>
      </div>
      <pre className="rounded border border-border/60 bg-background p-4 text-xs whitespace-pre-wrap overflow-auto">
        {parsed ? JSON.stringify(parsed, null, 2) : data?.content || 'Data not available'}
      </pre>
    </main>
  );
}
