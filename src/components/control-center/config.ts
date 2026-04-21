export type SectionKey = 'overview' | 'system-map' | 'governance' | 'cron-jobs' | 'standards' | 'operator-guide' | 'mc-summary' | 'system-improvements' | 'share-export' | 'changelog' | 'operational-truth-model';

export const SECTION_ORDER: { key: SectionKey; label: string }[] = [
  { key: 'share-export', label: 'Share / Export (Start Here)' },
  { key: 'cron-jobs', label: 'Cron Jobs' },
  { key: 'overview', label: 'Overview' },
  { key: 'system-map', label: 'System Map' },
  { key: 'governance', label: 'Governance' },
  { key: 'standards', label: 'Standards' },
  { key: 'operator-guide', label: 'Operator Guide' },
  { key: 'mc-summary', label: 'MC Summary' },
  { key: 'system-improvements', label: 'System Improvements' },
  { key: 'operational-truth-model', label: 'Operational Truth Model' },
  { key: 'changelog', label: 'Changelog' },
];

export const TITLE_BY_SECTION: Record<SectionKey, string> = {
  overview: 'System Overview',
  'system-map': 'System Map',
  governance: 'Governance Status',
  'cron-jobs': 'Cron Jobs',
  standards: 'Standards',
  'operator-guide': 'Operator Guide',
  'mc-summary': 'Mission Control Summary',
  'system-improvements': 'System Improvements',
  'share-export': 'OpenClaw Control Center',
  changelog: 'OpenClaw Control Center',
  'operational-truth-model': 'OpenClaw Control Center',
};

export const STANDARD_TITLES = [
  'Continuous Optimisation Framework',
  'Cron Governance & Hygiene Standard',
  'Evidence & Reporting Standard',
  'Execution & Task Management Standard',
  'Memory & Learning Architecture',
  'Metrics Data Collection Plan',
  'Mission Control Operating Standard',
  'Model & Token Routing Policy',
  'OpenClaw Agent Operating Model',
  'openclaw-runtime-governance-v1',
  'OpenClaw System Architecture',
  'Operations Dashboard Specification',
  'Operations Metrics Framework',
  'Reliability & Watchdog Operations',
  'Runtime Standards Integration — Execution Checklist',
  'Security & Secrets Management',
  'System Failure & Incident Response',
  'System Supervisor Control Loop',
];

export type SourceDef = {
  slug: string;
  label: string;
  path?: string;
  title?: string;
  section: SectionKey;
};

const standardDefs: SourceDef[] = [
  ['mc-std-01', 'Continuous Optimisation Framework'],
  ['mc-std-02', 'Cron Governance & Hygiene Standard'],
  ['mc-std-03', 'Evidence & Reporting Standard'],
  ['mc-std-04', 'Execution & Task Management Standard'],
  ['mc-std-05', 'Memory & Learning Architecture'],
  ['mc-std-06', 'Metrics Data Collection Plan'],
  ['mc-std-07', 'Mission Control Operating Standard'],
  ['mc-std-08', 'Model & Token Routing Policy'],
  ['mc-std-09', 'OpenClaw Agent Operating Model'],
  ['mc-std-10', 'openclaw-runtime-governance-v1'],
  ['mc-std-11', 'OpenClaw System Architecture'],
  ['mc-std-12', 'Operations Dashboard Specification'],
  ['mc-std-13', 'Operations Metrics Framework'],
  ['mc-std-14', 'Reliability & Watchdog Operations'],
  ['mc-std-15', 'Runtime Standards Integration — Execution Checklist'],
  ['mc-std-16', 'Security & Secrets Management'],
  ['mc-std-17', 'System Failure & Incident Response'],
  ['mc-std-18', 'System Supervisor Control Loop'],
].map(([slug, title]) => ({ slug, title, label: slug, section: 'standards' as SectionKey }));

export const SOURCE_DEFS: SourceDef[] = [
  { slug: 'share-export', label: 'share-export.md', path: 'ops/control-center/share-export.md', section: 'share-export' },
  { slug: 'openclaw-complete-reference', label: 'openclaw-complete-reference.md', path: 'ops/control-center/openclaw-complete-reference.md', section: 'share-export' },
  { slug: 'file-document-map', label: 'file-document-map.md', path: 'ops/control-center/file-document-map.md', section: 'share-export' },
  { slug: 'source-of-truth-model', label: 'source-of-truth-model.md', path: 'ops/control-center/source-of-truth-model.md', section: 'share-export' },
  { slug: 'memory-operating-model', label: 'memory-operating-model.md', path: 'ops/control-center/memory-operating-model.md', section: 'share-export' },
  { slug: 'troubleshooting-baseline', label: 'troubleshooting-baseline.md', path: 'ops/control-center/troubleshooting-baseline.md', section: 'share-export' },
  { slug: 'fixing-problems', label: 'fixing-problems.md', path: 'ops/control-center/fixing-problems.md', section: 'share-export' },
  { slug: 'public-private-view-model', label: 'public-private-view-model.md', path: 'ops/control-center/public-private-view-model.md', section: 'share-export' },
  { slug: 'maintenance-prompt-pack', label: 'maintenance-prompt-pack.md', path: 'ops/control-center/maintenance-prompt-pack.md', section: 'share-export' },
  { slug: 'improvement-programme-status-matrix', label: 'improvement-programme-status-matrix.md', path: 'ops/control-center/improvement-programme-status-matrix.md', section: 'share-export' },
  { slug: 'governance-overview', label: 'governance-overview.md', path: 'ops/governance-overview.md', section: 'overview' },
  { slug: 'master-operating-standard', label: 'master-operating-standard.md', path: 'ops/master-operating-standard.md', section: 'overview' },
  { slug: 'system-map', label: 'system-map.md', path: 'ops/system/system-map.md', section: 'system-map' },
  { slug: 'governance-alignment-check', label: 'governance-alignment-check.md', path: 'ops/governance-alignment-check.md', section: 'governance' },
  { slug: 'error-register', label: 'error-register.md', path: 'ops/error-register.md', section: 'governance' },
  { slug: 'cron-inventory', label: 'cron-inventory.md', path: 'ops/hub/cron-inventory.md', section: 'cron-jobs' },
  { slug: 'automation-manifest', label: 'automation-manifest.json', path: 'ops/automation-manifest.json', section: 'cron-jobs' },
  { slug: 'standards-index', label: 'standards-index.md', path: 'ops/standards-index.md', section: 'standards' },
  { slug: 'standards-registry', label: 'standards-registry.json', path: 'ops/standards-registry.json', section: 'standards' },
  { slug: 'operator-playbook', label: 'operator-playbook.md', path: 'ops/control-center/operator-playbook.md', section: 'operator-guide' },
  { slug: 'mc-summary', label: 'mission-control-summary.md', path: 'ops/control-center/mission-control-summary.md', section: 'mc-summary' },
  { slug: 'hub-index-summary', label: 'hub-index.md', path: 'ops/hub/hub-index.md', section: 'mc-summary' },
  { slug: 'share-manifest-summary', label: 'share-manifest.md', path: 'ops/hub/share-manifest.md', section: 'mc-summary' },
  { slug: 'system-improvements', label: 'system-improvements.md', path: 'ops/hub/system-improvements.md', section: 'system-improvements' },
  { slug: 'operational-caveats', label: 'operational-caveats.md', path: 'ops/hub/operational-caveats.md', section: 'system-improvements' },
  { slug: 'hub-index', label: 'hub-index.md', path: 'ops/hub/hub-index.md', section: 'share-export' },
  { slug: 'share-pack', label: 'share-pack.md', path: 'ops/hub/share-pack.md', section: 'share-export' },
  { slug: 'share-checklist', label: 'share-checklist.md', path: 'ops/hub/share-checklist.md', section: 'share-export' },
  ...standardDefs,
];

export const SOURCE_BY_SLUG = new Map(SOURCE_DEFS.map((d) => [d.slug, d]));

export function isSectionKey(value: string): value is SectionKey {
  return SECTION_ORDER.some((s) => s.key === value);
}
