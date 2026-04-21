import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
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

function toPlainText(content?: string) {
  const raw = (content || '').trim();
  if (!raw) return '';
  const noHtml = raw.replace(/<[^>]+>/g, ' ');
  const deEnt = noHtml
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return deEnt.replace(/\s+/g, ' ').trim();
}

function getSummary(content?: string, max = 420) {
  const text = toPlainText(content);
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function parseStandardsRegistry(content?: string) {
  const raw = (content || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // tolerate markdown wrapper/comments before JSON
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const maybe = raw.slice(start, end + 1);
      try {
        return JSON.parse(maybe);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseCronRows(markdown?: string) {
  const lines = (markdown || '').split('\n');
  const rows: any[] = [];
  let current: any = null;
  for (const raw of lines) {
    const line = raw.trim();
    const h = line.match(/^###\s+\d+\)\s+(.+)$/);
    if (h) {
      if (current) rows.push(current);
      current = { name: h[1], enabled: true, schedule: null, purpose: null, owner: null, relatedStandards: [] as string[] };
      continue;
    }
    if (!current) continue;
    if (line.startsWith('- state:')) current.enabled = line.includes('enabled');
    if (line.startsWith('- schedule:')) current.schedule = line.replace('- schedule:', '').trim();
    if (line.startsWith('- purpose:')) current.purpose = line.replace('- purpose:', '').trim();
    if (line.startsWith('- owner:')) current.owner = line.replace('- owner:', '').trim();
    if (line.startsWith('- related standards:')) {
      current.relatedStandards = (line.replace('- related standards:', '').match(/`([^`]+)`/g) || []).map((x) => x.replace(/`/g, ''));
    }
  }
  if (current) rows.push(current);
  return rows;
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id,title,category,path,content,updated_at,type,deleted_at')
    .eq('type', 'document')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const docs = ((data || []) as Doc[]);
  const byTitle = new Map(docs.map((d) => [d.title, d]));
  const byPath = new Map(docs.map((d) => [d.path, d]));

  const controlCenterDocs = docs.filter((d) => d.category === 'openclaw-control-center');
  const standardsRegistryDoc = byPath.get('ops/standards-registry.json');
  const standardsRegistry: any = parseStandardsRegistry(standardsRegistryDoc?.content);

  const standards = Array.isArray(standardsRegistry?.standards) ? standardsRegistry.standards : [];

  const standardsByStatus = {
    canonical: standards.filter((s: any) => s.status === 'canonical').map((s: any) => ({ id: s.document_id, title: s.title, domain: s.domain })),
    derived: standards.filter((s: any) => s.status === 'derived').map((s: any) => ({ id: s.document_id, title: s.title, domain: s.domain, canonical_reference: s.canonical_reference })),
    transitional: standards.filter((s: any) => s.status === 'transitional').map((s: any) => ({ id: s.document_id, title: s.title, domain: s.domain, canonical_reference: s.canonical_reference })),
  };

  const cronInventory = byPath.get('openclaw-control-center/cron-jobs') || byPath.get('ops/control-center/cron-jobs.md') || byPath.get('ops/hub/cron-inventory.md');
  const cronRows = parseCronRows(cronInventory?.content);

  const sourceDocPaths = [
    'ops/governance-overview.md',
    'ops/standards-index.md',
    'ops/operator-playbook.md',
    'ops/master-operating-standard.md',
    'ops/system/system-map.md',
    'ops/standards-registry.json',
    'ops/automation-manifest.json',
    'ops/governance-alignment-check.md',
    'ops/error-register.md',
    'ops/hub/hub-index.md',
    'ops/hub/share-pack.md',
    'ops/hub/cron-inventory.md',
    'ops/hub/mc-structure.md',
    'ops/hub/system-improvements.md',
    'ops/hub/share-manifest.md',
    'ops/hub/share-checklist.md',
    'ops/hub/non-owner-access-matrix.md',
  ];

  const standardPathById: Record<string, string> = {
    'mc-std-01': 'ops/standards/continuous-optimisation-framework',
    'mc-std-02': 'ops/standards/cron-governance-hygiene-standard',
    'mc-std-03': 'ops/standards/evidence-reporting-standard',
    'mc-std-04': 'ops/standards/execution-task-management-standard',
    'mc-std-05': 'ops/standards/memory-learning-architecture',
    'mc-std-06': 'ops/standards/metrics-data-collection-plan',
    'mc-std-07': 'ops/standards/mission-control-operating-standard',
    'mc-std-08': 'ops/standards/model-token-routing-policy',
    'mc-std-09': 'ops/standards/openclaw-agent-operating-model',
    'mc-std-10': 'ops/standards/openclaw-runtime-governance-v1',
    'mc-std-11': 'ops/standards/openclaw-system-architecture',
    'mc-std-12': 'ops/standards/operations-dashboard-specification',
    'mc-std-13': 'ops/standards/operations-metrics-framework',
    'mc-std-14': 'ops/standards/reliability-watchdog-operations',
    'mc-std-15': 'ops/standards/runtime-standards-integration-execution-checklist',
    'mc-std-16': 'ops/standards/security-secrets-management',
    'mc-std-17': 'ops/standards/system-failure-incident-response',
    'mc-std-18': 'ops/standards/system-supervisor-control-loop',
  };

  const normalizeControlCenterRoute = (p: string) => {
    const suffix = (p || '').replace('openclaw-control-center/', '');
    if (!suffix || suffix === 'index') return '/control-center';
    return `/control-center/${suffix}`;
  };

  const allControlCenterPages = controlCenterDocs
    .map((d) => ({ title: d.title, route: normalizeControlCenterRoute(d.path || ''), sourcePath: d.path, lastUpdated: d.updated_at || null }))
    .sort((a, b) => (a.route || '').localeCompare(b.route || ''));

  const workspaceRoot = '/Users/jamieludlow/.openclaw/workspace';
  const existsInWorkspace = (relativePath: string) => {
    try {
      const full = path.resolve(workspaceRoot, relativePath);
      return fs.existsSync(full);
    } catch {
      return false;
    }
  };

  const allSourceDocsBase = sourceDocPaths
    .map((p) => {
      const doc = byPath.get(p);
      const exists = !!doc || existsInWorkspace(p);
      return {
        path: p,
        exists,
        lastUpdated: doc?.updated_at || null,
        summary: getSummary(doc?.content),
        preview: toPlainText(doc?.content).slice(0, 220) || null,
      };
    });

  const standardSourceDocs = standards.map((s: any) => {
    const sp = standardPathById[s.document_id] || null;
    const titleDoc = byTitle.get(s.title);
    const pathDoc = sp ? byPath.get(sp) : null;
    const exists = !!pathDoc || !!titleDoc || (!!sp && existsInWorkspace(sp));
    return {
      path: sp,
      exists,
      lastUpdated: pathDoc?.updated_at || titleDoc?.updated_at || null,
      summary: getSummary(pathDoc?.content || titleDoc?.content),
      preview: toPlainText(pathDoc?.content || titleDoc?.content).slice(0, 220) || null,
    };
  });

  const allSourceDocs = [...allSourceDocsBase, ...standardSourceDocs].filter((d, i, arr) => d.path && arr.findIndex((x) => x.path === d.path) === i);

  const allStandards = standards.map((s: any) => {
    const sourcePath = byTitle.get(s.title)?.path || standardPathById[s.document_id] || null;
    const sourceResolved = !!(sourcePath && (byPath.get(sourcePath) || existsInWorkspace(sourcePath) || byTitle.get(s.title)));
    return {
      id: s.document_id,
      title: s.title,
      status: s.status,
      category: s.domain,
      sourcePath,
      sourceResolved,
    };
  });

  const allCronJobs = cronRows.map((c) => ({
    name: c.name,
    enabled: !!c.enabled,
    schedule: c.schedule,
    purpose: c.purpose,
    owner: c.owner,
    relatedStandards: c.relatedStandards || [],
  }));

  const lastUpdated = docs.reduce((acc, d) => {
    const t = d.updated_at ? new Date(d.updated_at).getTime() : 0;
    return t > acc ? t : acc;
  }, 0);

  const recentChanges = [...docs]
    .filter((d) => d.category === 'openclaw-control-center' || (d.path || '').startsWith('ops/'))
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
    .slice(0, 12)
    .map((d) => ({ title: d.title, path: d.path, category: d.category, updatedAt: d.updated_at || null }));

  const response = {
    generatedAt: new Date().toISOString(),
    lastUpdated: lastUpdated ? new Date(lastUpdated).toISOString() : null,
    entrypoint: '/control-center',
    contextRoute: '/control-center/context.json',
    systemOverview: {
      title: 'System Overview',
      summary: getSummary((byPath.get('openclaw-control-center/system-overview') || byTitle.get('System Overview'))?.content),
      sourcePath: (byPath.get('openclaw-control-center/system-overview') || byTitle.get('System Overview'))?.path,
    },
    systemMap: {
      title: 'System Map',
      summary: getSummary((byPath.get('openclaw-control-center/system-map') || byTitle.get('System Map'))?.content),
      sourcePath: (byPath.get('openclaw-control-center/system-map') || byTitle.get('System Map'))?.path,
      technicalSourcePath: 'ops/system/system-map.md',
    },
    governance: {
      title: 'Governance Status',
      summary: getSummary((byPath.get('openclaw-control-center/governance-status') || byTitle.get('Governance Status'))?.content),
      sourcePath: (byPath.get('openclaw-control-center/governance-status') || byTitle.get('Governance Status'))?.path,
      anchors: [
        'ops/automation-manifest.json',
        'ops/governance-alignment-check.md',
        'ops/master-operating-standard.md',
        'ops/error-register.md',
      ],
    },
    cronJobs: {
      title: 'Cron Jobs',
      summary: getSummary(cronInventory?.content),
      sourcePath: cronInventory?.path,
      scheduleSource: 'runtime scheduler + ops/automation-manifest.json',
    },
    standards: {
      registryPath: standardsRegistryDoc?.path || 'ops/standards-registry.json',
      total: standards.length,
      byStatus: standardsByStatus,
    },
    operatorGuide: {
      title: 'Operator Playbook',
      summary: getSummary((byPath.get('openclaw-control-center/operator-playbook') || byTitle.get('Operator Playbook'))?.content),
      sourcePath: (byPath.get('openclaw-control-center/operator-playbook') || byTitle.get('Operator Playbook'))?.path,
    },
    systemImprovements: {
      title: 'System Improvements',
      summary: getSummary((byPath.get('openclaw-control-center/system-improvements') || byTitle.get('System Improvements'))?.content),
      sourcePath: (byPath.get('openclaw-control-center/system-improvements') || byTitle.get('System Improvements'))?.path,
      errorRegisterPath: 'ops/error-register.md',
      errorRegisterSummary: getSummary(byPath.get('ops/error-register.md')?.content),
    },
    allControlCenterPages,
    allSourceDocs,
    allStandards,
    allCronJobs,
    recentChanges,
    sourceOfTruthLinks: {
      controlCenter: controlCenterDocs.map((d) => ({ title: d.title, path: d.path })),
      governance: [
        'ops/governance-overview.md',
        'ops/master-operating-standard.md',
        'ops/governance-alignment-check.md',
        'ops/automation-manifest.json',
      ],
      standards: [
        'ops/standards-index.md',
        'ops/standards-registry.json',
      ],
      system: [
        'ops/system/system-map.md',
        'ops/hub/cron-inventory.md',
        'ops/hub/mc-structure.md',
      ],
      learning: [
        'ops/error-register.md',
        'ops/hub/system-improvements.md',
        'ops/hub/operational-caveats.md',
      ],
    },
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    },
  });
}
