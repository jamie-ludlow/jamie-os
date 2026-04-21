import { supabase } from '@/lib/supabase';

export default async function OperationalTruthModelPage() {
  const { data } = await supabase
    .from('documents')
    .select('content')
    .eq('path', 'openclaw-control-center/runtime-status-snapshot')
    .is('deleted_at', null)
    .single();

  let snapshot: any = {};
  try {
    snapshot = JSON.parse(data?.content || '{}');
  } catch {
    snapshot = {};
  }

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Operational Truth Model</h1>
      <p className="text-sm text-muted-foreground">Public schema/rules reference for deterministic control-plane trust signals.</p>
      <div className="rounded border border-border/60 p-3 text-sm space-y-1">
        <div>Schema version: {snapshot?.schemaVersion || 'Data not available'}</div>
        <div>Staleness thresholds: warn {snapshot?.stalenessRules?.warningAfterMinutes ?? 'Data not available'}m / critical {snapshot?.stalenessRules?.criticalAfterMinutes ?? 'Data not available'}m</div>
        <div>Confidence formula: {snapshot?.derivationRules?.confidenceScore?.formula || 'Data not available'}</div>
        <div>Integrity logic: monotonic timestamp + schema compatibility + critical delta explanation + raw parity</div>
      </div>
      <pre className="rounded border border-border/60 bg-background p-4 text-xs whitespace-pre-wrap overflow-auto">{JSON.stringify({
        derivationRuleIds: snapshot?.derivationRuleIds,
        derivationRules: snapshot?.derivationRules,
        fieldSchema: snapshot?.fieldSchema,
        fieldProvenance: snapshot?.fieldProvenance,
        stalenessRules: snapshot?.stalenessRules,
        trustSummary: snapshot?.trustSummary,
        completenessMatrix: snapshot?.completenessMatrix,
      }, null, 2)}</pre>
    </main>
  );
}
