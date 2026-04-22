'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, FileText, Info, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SECTION_ORDER, SectionKey, SOURCE_BY_SLUG, SOURCE_DEFS, TITLE_BY_SECTION } from './config';

type Doc = {
  id: string;
  title: string;
  category: string;
  path: string;
  content: string;
  updated_at?: string;
};

type CronRow = {
  name: string;
  enabled: boolean;
  schedule: string;
  purpose: string;
  owner: string;
  relatedStandards: string[];
  outputs: string;
  promptMessage: string;
  lastRun?: string | null;
  lastSuccess?: string | null;
  lastFailure?: string | null;
  consecutiveFailures?: number;
};

type StandardRow = {
  document_id: string;
  title: string;
  status: string;
  domain: string;
  canonical_reference?: string;
};

const PAGE_PURPOSE: Record<SectionKey, string> = {

  overview: 'See how your system is doing right now.',
  'system-map': 'Use this page to understand the current shape of the system and where each major area lives.',
  governance: 'Use this page to understand governance health, drift, and validation signals — not to inspect live runtime behaviour directly.',
  'cron-jobs': 'View your automations, schedules, and outcomes.',
  standards: 'Review the rules your system follows.',
  'operator-guide': 'Use this page as the short operator runbook for checking health, resolving trust confusion, and knowing where to go next.',
  'mc-summary': 'Use this page for a short current summary of Jamie OS, not as the canonical handbook or source-of-truth reference.',
  'system-improvements': 'Track issues, fixes, and improvements over time.',
  'share-export': 'Open and share access links for your system.',
  changelog: 'Review what changed and when.',
  'operational-truth-model': 'Understand how status and trust are calculated.',
};

const SOURCE_ROUTE_HEADINGS: Record<string, string> = {
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

const READER_PATH_LINKS = [
  { label: 'Start', href: '/control-center/share-export' },
  { label: 'How OpenClaw Works', href: '/control-center/openclaw-complete-reference' },
  { label: 'Troubleshooting', href: '/control-center/fixing-problems' },
  { label: 'Share Boundaries', href: '/control-center/public-private-view-model' },
];

const READER_INTRO_BY_SLUG: Record<string, { what: string; who: string; next: string }> = {
  'share-export': {
    what: 'This is the public-friendly entry page for the Control Center handbook flow.',
    who: 'Best for shared readers and first-time viewers.',
    next: 'Next: Complete OpenClaw Handbook.',
  },
  'openclaw-complete-reference': {
    what: 'This is the canonical handbook for understanding the OpenClaw system end-to-end.',
    who: 'Best for shared readers, operators, and maintainers.',
    next: 'Next: File & Document Map or Fixing Problems.',
  },
  'file-document-map': {
    what: 'This page maps the main Jamie OS document and surface layers so you can quickly find where public/shared pages, handbook pages, operator pages, source pages, and runtime or retained-state surfaces live.',
    who: 'Best for operators and maintainers who need to locate the right page layer, source path, or shared renderer route without guessing.',
    next: 'Next: Source-of-Truth Model, or jump directly to the layer you need once you know whether you want explanation, operator guidance, source reference, or current-state truth.',
  },
  'source-of-truth-model': {
    what: 'This page explains the current trust hierarchy: what is canonical, what is secondary, and what to trust when surfaces disagree.',
    who: 'Best for operators and maintainers settling authority questions across handbook, operator pages, source pages, and runtime surfaces.',
    next: 'Next: Memory Operating Model, or return to the relevant live page once you know which surface should win.',
  },
  'memory-operating-model': {
    what: 'This page explains the current memory architecture, what each memory layer is for, and how memory should be interpreted alongside fresher source and runtime surfaces.',
    who: 'Best for operators responsible for continuity, memory hygiene, and understanding what memory does and does not determine.',
    next: 'Next: Public vs Private View Model, or return to the fresher source/runtime surface if you were resolving a trust conflict.',
  },
  'troubleshooting-baseline': {
    what: 'This page gives the current troubleshooting starting point: where to begin when something looks wrong, which surfaces to compare, and which surface should win in each kind of disagreement.',
    who: 'Best for operators and maintainers diagnosing trust problems, stale summaries, runtime issues, or source/operator mismatches.',
    next: 'Next: Fixing Problems (simple guide), or jump directly to Overview, Cron Jobs, Governance, or Source-of-Truth Model depending on the kind of issue.',
  },
  'fixing-problems': {
    what: 'This page explains the safe order for fixing problems after you have identified one: what to verify first, which surfaces to compare, and how to tell whether the issue is docs, metadata, render path, source record, or current-state data.',
    who: 'Best for operators and maintainers deciding what should actually be changed after a problem has been identified.',
    next: 'Next: Public vs Private View Model, or jump back to Overview, Cron Jobs, Governance, Operator Guide, or Source-of-Truth Model depending on what the problem turns out to be.',
  },
  'public-private-view-model': {
    what: 'This page explains the current surface split: what belongs on public/shared pages, what belongs on operator-facing pages, what belongs on source pages, and when to use runtime or retained-state surfaces instead.',
    who: 'Best for anyone deciding which Jamie OS surface to use for sharing, operating, referencing source material, or checking current state.',
    next: 'Next: Maintenance Prompt Pack, or jump directly to the surface that matches your audience and question type.',
  },
  'maintenance-prompt-pack': {
    what: 'This page provides safe, reusable prompts for reviews and audits.',
    who: 'Best for operators running periodic maintenance checks.',
    next: 'Next: Improvement Programme Status Matrix.',
  },
  'improvement-programme-status-matrix': {
    what: 'This page summarises shipped improvement status across major workstreams and should stay aligned with what is actually live.',
    who: 'Best for stakeholders and operators checking closeout status without overstating completion.',
    next: 'Next: Return to Share Export for the guided path, or open the related live page to verify any claimed completion.',
  },
};

function formatUpdated(ts?: string) {
  if (!ts) return 'unknown';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toLocaleString('en-GB', { hour12: false });
}

function toPlainText(content?: string) {
  const raw = (content || '').trim();
  if (!raw) return '';
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSimpleLanguage(text?: string) {
  const raw = toPlainText(text);
  if (!raw) return 'No data available';

  return raw
    .replace(/single entry point/gi, 'main page')
    .replace(/knowledge hub/gi, 'system page')
    .replace(/governance/gi, 'how things are set up')
    .replace(/runtime flow/gi, 'how everything runs')
    .replace(/runtime/gi, 'system')
    .replace(/snapshot/gi, 'latest check')
    .replace(/validation/gi, 'checked')
    .replace(/incident/gi, 'issue')
    .replace(/cron job|cron/gi, 'automation')
    .replace(/failure|failed/gi, "didn't run successfully")
    .replace(/drift/gi, 'out-of-sync setup')
    .replace(/source-of-truth/gi, 'system source')
    .replace(/operational truth model/gi, 'system rules')
    .replace(/machine-readable/gi, 'advanced')
    .replace(/api/gi, 'integration');
}

function toDetailedReadable(text?: string) {
  const raw = toPlainText(text);
  if (!raw) return 'No data available';

  return raw
    .replace(/single entry point/gi, 'central page')
    .replace(/knowledge hub/gi, 'system page')
    .replace(/runtime flow/gi, 'how everything runs')
    .replace(/governance/gi, 'setup checks')
    .replace(/machine-readable/gi, 'advanced integration')
    .replace(/\s*→\s*/g, '. ')
    .replace(/\s*\+\s*/g, ' and ')
    .replace(/\s{2,}/g, ' ');
}

function toParagraphs(text: string, max = 220) {
  if (!text) return [] as string[];
  const chunks = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const out: string[] = [];
  let current = '';

  for (const sentence of chunks) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length <= max) {
      current = next;
      continue;
    }

    if (current) out.push(current);
    current = sentence;
  }

  if (current) out.push(current);
  return out.slice(0, 6);
}

function summary(text: string, max = 400) {
  if (!text) return '';
  if (text.length <= max) return text;
  const chunk = text.slice(0, max + 1);
  const split = Math.max(chunk.lastIndexOf('. '), chunk.lastIndexOf('! '), chunk.lastIndexOf('? '));
  if (split > max * 0.55) return `${chunk.slice(0, split + 1).trim()}…`;
  const ws = chunk.lastIndexOf(' ');
  if (ws > max * 0.55) return `${chunk.slice(0, ws).trim()}…`;
  return `${chunk.slice(0, max).trim()}…`;
}

function relativeTime(ts?: string | null) {
  if (!ts) return 'time unavailable';
  const deltaMs = Date.now() - new Date(ts).getTime();
  if (Number.isNaN(deltaMs)) return 'time unavailable';
  const mins = Math.max(0, Math.floor(deltaMs / 60000));
  if (mins <= 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Updated ${hrs}h ago`;
  return `Updated ${Math.floor(hrs / 24)}d ago`;
}

function parseCronRows(markdown?: string): CronRow[] {
  const lines = (markdown || '').split('\n');
  const rows: CronRow[] = [];
  let current: CronRow | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const header = line.match(/^###\s+\d+\)\s+(.+)$/);
    if (header) {
      if (current) rows.push(current);
      current = {
        name: header[1],
        enabled: true,
        schedule: 'n/a',
        purpose: 'n/a',
        owner: 'n/a',
        relatedStandards: [],
        outputs: 'n/a',
        promptMessage: '',
      };
      continue;
    }
    if (!current) continue;

    if (line.startsWith('- state:')) current.enabled = line.includes('enabled');
    if (line.startsWith('- schedule:')) current.schedule = line.replace('- schedule:', '').trim();
    if (line.startsWith('- purpose:')) current.purpose = line.replace('- purpose:', '').trim();
    if (line.startsWith('- owner:')) current.owner = line.replace('- owner:', '').trim();
    if (line.startsWith('- related standards:')) current.relatedStandards = (line.match(/`([^`]+)`/g) || []).map((x) => x.replace(/`/g, ''));
    if (line.startsWith('- key outputs:') || line.startsWith('- outputs:')) current.outputs = line.replace('- key outputs:', '').replace('- outputs:', '').trim();
    if (line.startsWith('- full prompt:') || line.startsWith('- payload.message:')) current.promptMessage = line.replace('- full prompt:', '').replace('- payload.message:', '').trim();
  }

  if (current) rows.push(current);
  return rows;
}

function parseStandardsRegistry(raw?: string): StandardRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.standards) ? parsed.standards : [];
  } catch {
    return [];
  }
}

function statusBadge(status: string) {
  const lower = status.toLowerCase();
  if (lower.includes('canonical') || lower.includes('enabled') || lower.includes('resolved')) return 'bg-emerald-500/12 text-emerald-300 border-emerald-400/40';
  if (lower.includes('derived') || lower.includes('monitor')) return 'bg-amber-500/12 text-amber-300 border-amber-400/40';
  if (lower.includes('transitional') || lower.includes('disabled') || lower.includes('regressed')) return 'bg-rose-500/12 text-rose-300 border-rose-400/40';
  return 'bg-muted text-muted-foreground border-border/60';
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm transition duration-200 ease-out hover:shadow-md">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function cronHumanDescription(name: string, purpose?: string) {
  const what = summary(toPlainText(purpose || `${name} runs automatically to keep the system working.`), 100) || 'This automation runs automatically to support the system.';
  const why = 'This helps keep your system reliable and reduce manual checking.';
  return { what, why };
}

function cronStatusLine(enabled: boolean, hasFailure: boolean, lastRun?: string | null) {
  if (!enabled) return 'Paused for now';
  if (hasFailure) return 'Failed recently, needs attention';
  if (!lastRun) return "This hasn’t run yet";
  return 'Running normally · No recent issues detected';
}

export function ControlCenterPage({ initialDocs, initialSection = 'overview', initialSourceSlug }: { initialDocs: Doc[]; initialSection?: SectionKey; initialSourceSlug?: string }) {
  const [docs] = useState<Doc[]>(initialDocs || []);
  const [query, setQuery] = useState('');
  const [selectedCronName, setSelectedCronName] = useState('');
  const [selectedStandardId, setSelectedStandardId] = useState('');
  const [copyState, setCopyState] = useState<Record<string, 'idle' | 'copied'>>({});
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('detailed');
  const [showSystemDetails, setShowSystemDetails] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showRefreshing, setShowRefreshing] = useState(false);

  const byTitle = useMemo(() => new Map(docs.map((d) => [d.title, d])), [docs]);
  const byPath = useMemo(() => new Map(docs.map((d) => [d.path, d])), [docs]);

  const selectedDoc = byTitle.get(TITLE_BY_SECTION[initialSection]) || (initialSection === 'system-map' ? byPath.get('openclaw-control-center/system-map') || null : null) || (initialSection === 'governance' ? byPath.get('openclaw-control-center/governance') || null : null) || (initialSection === 'mc-summary' ? byPath.get('openclaw-control-center/mc-summary') || null : null);
  const selectedSourceDef = initialSourceSlug ? SOURCE_BY_SLUG.get(initialSourceSlug) || null : null;
  const selectedSourceDoc = selectedSourceDef
    ? selectedSourceDef.path
      ? byPath.get(selectedSourceDef.path)
      : selectedSourceDef.title
      ? byTitle.get(selectedSourceDef.title)
      : null
    : null;

  const currentReaderSlug = initialSourceSlug || (initialSection === 'share-export' ? 'share-export' : null);
  const sourceHeading =
    (currentReaderSlug ? SOURCE_ROUTE_HEADINGS[currentReaderSlug] : null) ||
    selectedSourceDoc?.title ||
    selectedSourceDef?.title ||
    (selectedSourceDef?.label ? selectedSourceDef.label.replace(/\.md$/i, '').replace(/-/g, ' ') : null);
  const pageHeading = sourceHeading || SECTION_ORDER.find((s) => s.key === initialSection)?.label || 'OpenClaw Control Center';
  const pageIntro = currentReaderSlug
    ? 'Public documentation page. This page is intended to be readable on its own for shared readers.'
    : PAGE_PURPOSE[initialSection];
  const readerIntro = currentReaderSlug ? READER_INTRO_BY_SLUG[currentReaderSlug] : null;
  const isReaderMode = Boolean(currentReaderSlug);

  const latestChanges = useMemo(
    () =>
      [...docs]
        .filter((d) => d.category === 'openclaw-control-center' || d.path.startsWith('ops/'))
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()),
    [docs]
  );

  const cronRows = useMemo(() => {
    const cronDoc = byPath.get('openclaw-control-center/cron-jobs') || byPath.get('ops/control-center/cron-jobs.md') || byPath.get('ops/hub/cron-inventory.md');
    return parseCronRows(cronDoc?.content);
  }, [byPath]);

  const standards = useMemo(() => parseStandardsRegistry(byPath.get('ops/standards-registry.json')?.content), [byPath]);
  const automationManifest = useMemo(() => {
    try {
      return JSON.parse(byPath.get('ops/automation-manifest.json')?.content || '{}');
    } catch {
      return { entries: [] } as any;
    }
  }, [byPath]);
  const runtimeSnapshot = useMemo(() => {
    try {
      const raw = byPath.get('openclaw-control-center/runtime-status-snapshot')?.content || '{}';
      return JSON.parse(raw);
    } catch {
      return {} as any;
    }
  }, [byPath]);

  const cronRowsResolved = useMemo(() => {
    const runtimeByName = new Map<string, any>((runtimeSnapshot?.cronOperations || []).map((row: any) => [row?.name, row]));
    return cronRows.map((row) => {
      const runtime = runtimeByName.get(row.name || '');
      if (!runtime) return row;

      const runtimeEnabled = runtime?.state === 'paused' ? false : row.enabled;
      return {
        ...row,
        enabled: runtimeEnabled,
        lastRun: runtime?.lastRun || row.lastRun || null,
        lastSuccess: runtime?.lastSuccess || row.lastSuccess || null,
        lastFailure: runtime?.lastFailure || row.lastFailure || null,
        consecutiveFailures:
          typeof runtime?.consecutiveFailures === 'number'
            ? runtime.consecutiveFailures
            : typeof (row as any)?.consecutiveFailures === 'number'
            ? (row as any).consecutiveFailures
            : 0,
      } as CronRow;
    });
  }, [cronRows, runtimeSnapshot]);

  const standardsByDomain = useMemo(() => {
    const out: Record<string, StandardRow[]> = {};
    for (const s of standards) {
      const key = s.domain || 'uncategorised';
      out[key] = out[key] || [];
      out[key].push(s);
    }
    return out;
  }, [standards]);

  const activeCron = cronRowsResolved.find((c) => c.name === selectedCronName) || cronRowsResolved[0] || null;
  const activeStandard = standards.find((s) => s.document_id === selectedStandardId) || standards[0] || null;

  const activeStandardDoc = useMemo(() => {
    if (!activeStandard) return null;
    return (
      (activeStandard.canonical_reference ? byPath.get(activeStandard.canonical_reference) : null) ||
      byTitle.get(activeStandard.title) ||
      null
    );
  }, [activeStandard, byPath, byTitle]);

  const standardUsage = useMemo(() => {
    const entries = Array.isArray(automationManifest?.entries) ? automationManifest.entries : [];
    const usageByStandard: Record<string, string[]> = {};
    for (const entry of entries) {
      const standardsList: string[] = Array.isArray(entry.requiredStandards) ? entry.requiredStandards : [];
      for (const ref of standardsList) {
        const key = String(ref).split('/').pop() || String(ref);
        usageByStandard[key] = usageByStandard[key] || [];
        usageByStandard[key].push(entry.name);
      }
    }
    return usageByStandard;
  }, [automationManifest]);

  const standardCounts = useMemo(() => {
    const counts = { total: standards.length, canonical: 0, derived: 0, transitional: 0 };
    for (const s of standards) {
      const st = (s.status || '').toLowerCase();
      if (st === 'canonical') counts.canonical += 1;
      else if (st === 'derived') counts.derived += 1;
      else if (st === 'transitional') counts.transitional += 1;
    }
    return counts;
  }, [standards]);

  const searchIndex = useMemo(() => {
    const standardItems = standards.map((s) => ({ type: 'standard', label: s.title, detail: `${s.status} · ${s.domain}`, href: '/control-center/standards' }));
    const cronItems = cronRows.map((c) => ({ type: 'cron', label: c.name, detail: `${c.schedule} · ${c.owner}`, href: '/control-center/cron-jobs' }));
    const docItems = docs.filter((d) => d.path.startsWith('ops/') || d.category === 'openclaw-control-center').map((d) => ({ type: 'doc', label: d.title, detail: d.path, href: `/control-center/${initialSection}` }));
    return [...standardItems, ...cronItems, ...docItems];
  }, [standards, cronRows, docs, initialSection]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchIndex.filter((r) => `${r.type} ${r.label} ${r.detail}`.toLowerCase().includes(q)).slice(0, 20);
  }, [query, searchIndex]);

  const copyText = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopyState((prev) => ({ ...prev, [key]: 'copied' }));
    setTimeout(() => setCopyState((prev) => ({ ...prev, [key]: 'idle' })), 1200);
  };

  const isSimple = viewMode === 'simple';

  type SimpleContent = {
    source: 'simple-config' | 'documentation';
    whatThisPageIs: string;
    whatToDo: string;
    actionState: string;
  };

  const simpleContentBySection: Record<SectionKey, SimpleContent> = {
    overview: {
      source: 'simple-config',
      whatThisPageIs: 'This page shows the overall health of your system in one quick view.',
      whatToDo: 'Check whether anything is flagged. If it is, open Detailed view and follow the next step there.',
      actionState: (runtimeSnapshot?.systemStatus === 'warning' || runtimeSnapshot?.systemStatus === 'critical' || runtimeSnapshot?.degraded)
        ? 'Check the highlighted issue below.'
        : 'No action needed.',
    },
    'system-map': {
      source: 'simple-config',
      whatThisPageIs: 'This page shows how the main parts of your system connect.',
      whatToDo: 'Use this page to understand where to look if something goes wrong.',
      actionState: 'No action needed.',
    },
    governance: {
      source: 'simple-config',
      whatThisPageIs: 'This page shows whether your checks and safeguards are running as expected.',
      whatToDo: 'If anything is flagged, open Detailed view and review the failing check.',
      actionState: (runtimeSnapshot?.systemStatus === 'warning' || runtimeSnapshot?.systemStatus === 'critical')
        ? 'Check the highlighted issue below.'
        : 'No action needed.',
    },
    'cron-jobs': {
      source: 'simple-config',
      whatThisPageIs: 'This page shows which automations are running and which need attention.',
      whatToDo: 'Check paused or failed automations first, then open Detailed view for the next step.',
      actionState: (runtimeSnapshot?.systemStatus === 'warning' || runtimeSnapshot?.systemStatus === 'critical')
        ? 'Check the highlighted issue below.'
        : 'No action needed.',
    },
    standards: {
      source: 'simple-config',
      whatThisPageIs: 'This page shows the rules your system follows.',
      whatToDo: 'Use this page to confirm the rule you need before making changes.',
      actionState: 'No action needed.',
    },
    'operator-guide': {
      source: 'simple-config',
      whatThisPageIs: 'This page helps you keep your system running smoothly.',
      whatToDo: 'Check your system regularly and follow any warnings.',
      actionState: (runtimeSnapshot?.systemStatus === 'warning' || runtimeSnapshot?.systemStatus === 'critical')
        ? 'Check the highlighted issue below.'
        : 'No action needed.',
    },
    'mc-summary': {
      source: 'simple-config',
      whatThisPageIs: 'This page gives a quick summary of how your system is currently running.',
      whatToDo: 'Use it for quick orientation, then open Detailed view if you need full context.',
      actionState: 'No action needed.',
    },
    'system-improvements': {
      source: 'simple-config',
      whatThisPageIs: 'This page tracks fixes and improvements made to your system.',
      whatToDo: 'Check recent improvements first, especially after any issue was flagged.',
      actionState: 'No action needed.',
    },
    'share-export': {
      source: 'simple-config',
      whatThisPageIs: 'This page gives you links to view or share your system.',
      whatToDo: 'Use the main link for normal viewing and the advanced link only for integrations.',
      actionState: 'No action needed.',
    },
    changelog: {
      source: 'simple-config',
      whatThisPageIs: 'This page shows what changed and when.',
      whatToDo: 'Review recent changes first, then open related pages if you need more context.',
      actionState: 'No action needed.',
    },
    'operational-truth-model': {
      source: 'simple-config',
      whatThisPageIs: 'This page explains how status is decided in your system.',
      whatToDo: 'Use it to understand why status changed before investigating further.',
      actionState: (runtimeSnapshot?.systemStatus === 'warning' || runtimeSnapshot?.systemStatus === 'critical')
        ? 'Check the highlighted issue below.'
        : 'No action needed.',
    },
  };

  const simpleContent = simpleContentBySection[initialSection];
  if (isSimple && simpleContent.source === 'documentation') {
    throw new Error('Simple view must not use documentation source');
  }

  const renderReadable = (content?: string) => {
    if (isSimple) {
      throw new Error('Detailed renderer should not run in Simple view');
    }

    const transformed = isReaderMode ? toPlainText(content) : toDetailedReadable(content);
    return toParagraphs(transformed).map((line, idx) => (
      <p key={`${idx}-${line.slice(0, 20)}`} className="text-[13px] text-muted-foreground leading-6">
        {line}
      </p>
    ));
  };

  const keyFacts = [
    { label: 'Page type', value: initialSection === 'overview' ? 'System dashboard' : 'Documentation page' },
    { label: 'Source of truth', value: initialSection === 'cron-jobs' ? 'ops/control-center/cron-jobs.md + ops/automation-manifest.json' : initialSection === 'standards' ? 'ops/standards-registry.json + ops/standards/*' : 'workspace/ops + openclaw-control-center docs' },
    { label: 'Updates tracked', value: String(latestChanges.length) },
    ...(initialSection === 'cron-jobs' || initialSection === 'overview' ? [{ label: 'Cron count', value: String(cronRows.length) }] : []),
    ...(initialSection === 'standards' || initialSection === 'overview' ? [{ label: 'Standards', value: String(standardCounts.total) }] : []),
  ];

  const sourceLinks = SOURCE_DEFS.filter((d) => d.section === initialSection);

  const incidentSummary = useMemo(() => {
    const text = byPath.get('ops/error-register.md')?.content || '';
    const issueIds = Array.from(new Set((text.match(/ERR_[A-Z_]+/g) || [])));
    const open = (text.match(/\bopen\b/gi) || []).length;
    const monitoring = (text.match(/\bmonitoring\b/gi) || []).length;
    const resolved = (text.match(/\bresolved\b/gi) || []).length;
    const regressed = (text.match(/\bregressed\b/gi) || []).length;
    return { issueIds, open, monitoring, resolved, regressed };
  }, [byPath]);

  const cronOps = Array.isArray(runtimeSnapshot?.cronOperations) ? runtimeSnapshot.cronOperations : [];
  const statusTone = (s?: string) => (s === 'critical' ? 'text-rose-300 border-rose-400/40 bg-rose-500/12' : s === 'warning' ? 'text-amber-300 border-amber-400/40 bg-amber-500/12' : 'text-emerald-300 border-emerald-400/40 bg-emerald-500/12');

  const snapshotAgeMin = useMemo(() => {
    const ts = runtimeSnapshot?.generatedAt ? new Date(runtimeSnapshot.generatedAt).getTime() : 0;
    if (!ts) return null;
    return Math.max(0, Math.round((Date.now() - ts) / 60000));
  }, [runtimeSnapshot]);

  const snapshotValidationState = useMemo(() => {
    if (runtimeSnapshot?.validation?.validationStatus === 'fail' || runtimeSnapshot?.integrity?.status === 'fail') return 'failed';
    const warnAfter = runtimeSnapshot?.stalenessRules?.warningAfterMinutes ?? 10;
    const critAfter = runtimeSnapshot?.stalenessRules?.criticalAfterMinutes ?? 20;
    if (snapshotAgeMin != null && snapshotAgeMin > critAfter) return 'failed';
    if (snapshotAgeMin != null && snapshotAgeMin > warnAfter) return 'stale';
    return 'valid';
  }, [runtimeSnapshot, snapshotAgeMin]);

  const effectiveActiveIssues = Math.max(Number(runtimeSnapshot?.activeIssues ?? 0), Number(incidentSummary.open || 0));
  const reconciliationReason = runtimeSnapshot?.trustSummary?.reason || runtimeSnapshot?.statusDerivationPreview?.why || 'Data not available';

  useEffect(() => {
    if (runtimeSnapshot?.generatedAt) {
      setShowRefreshing(false);
      return;
    }
    const t = setTimeout(() => setShowRefreshing(true), 400);
    return () => clearTimeout(t);
  }, [runtimeSnapshot?.generatedAt]);

  const semanticState = runtimeSnapshot?.systemStatus === 'critical' ? 'critical' : (runtimeSnapshot?.degraded ? 'degraded' : (runtimeSnapshot?.systemStatus === 'warning' ? 'warning' : 'healthy'));
  const statusTint = semanticState === 'critical' ? 'bg-rose-500/10' : semanticState === 'degraded' ? 'bg-yellow-500/10' : semanticState === 'warning' ? 'bg-amber-500/10' : 'bg-emerald-500/10';
  const statusLabel = semanticState === 'critical' ? '🔴 critical' : semanticState === 'degraded' ? '🟡 degraded' : semanticState === 'warning' ? '⚠️ warning' : '✅ healthy';
  const plainStatusText = semanticState === 'critical'
    ? 'Something needs attention. One or more key parts are not working.'
    : semanticState === 'degraded'
    ? 'Some system data is incomplete or out of date.'
    : semanticState === 'warning'
    ? 'Everything is working, but one part has not updated recently.'
    : 'Everything is running smoothly.';
  const confidenceMeaning = (runtimeSnapshot?.confidenceScore ?? 0) >= 85
    ? 'Everything looks reliable'
    : (runtimeSnapshot?.confidenceScore ?? 0) >= 60
    ? 'Some data may be out of date'
    : 'System needs attention';
  const latestCronFailureTs = useMemo(() => {
    const vals = cronOps.map((c: any) => c?.lastFailure).filter(Boolean).map((t: string) => new Date(t).getTime()).filter((n: number) => !Number.isNaN(n));
    if (!vals.length) return null;
    return new Date(Math.max(...vals)).toISOString();
  }, [cronOps]);
  const latestIncidentChangeTs = useMemo(() => {
    const evs = Array.isArray(runtimeSnapshot?.events) ? runtimeSnapshot.events : [];
    const hit = evs.find((e: any) => ['warning','critical','failed'].includes(String(e?.status || '').toLowerCase()));
    return hit?.ts || null;
  }, [runtimeSnapshot]);

  return (
    <div className="h-full flex">
      {!isReaderMode && (
        <aside className="w-72 border-r border-border/50 p-3 space-y-1 shrink-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1">OpenClaw Control</div>
          {SECTION_ORDER.map((s) => (
            <Link key={s.key} href={`/control-center/${s.key}`} className={cn('w-full rounded-md px-2 py-1.5 text-[13px] flex items-center gap-2', s.key === initialSection ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40')}>
              <FileText className="h-3.5 w-3.5" />
              <span className="truncate">{s.label}</span>
            </Link>
          ))}
        </aside>
      )}

      <main className={cn('flex-1 overflow-auto p-6 transition-opacity duration-200 ease-out', isReaderMode && 'mx-auto max-w-4xl p-0 sm:p-2')}>
        <article className={cn('space-y-6 transition-opacity duration-200 ease-out', isReaderMode ? 'max-w-4xl' : 'max-w-7xl')}>
          {!isReaderMode && !isSimple && !focusMode && (
          <section className={cn("sticky top-2 z-20 rounded-2xl border border-border/60 p-3 bg-card/95 shadow-sm backdrop-blur text-[12px] transition-colors duration-200 ease-out", statusTint)}>
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('inline-flex rounded-full border px-2 py-0.5 font-medium shadow-sm transition-all duration-200 ease-out', statusTone(runtimeSnapshot?.systemStatus))}>{statusLabel}</span>
                <span className="text-foreground">{plainStatusText}</span>
                <span className="text-muted-foreground">issues {effectiveActiveIssues}</span>
                <span className="text-muted-foreground">confidence {runtimeSnapshot?.confidenceScore ?? 'n/a'}% · {confidenceMeaning}</span>
                <span className="text-muted-foreground">{snapshotAgeMin != null && snapshotAgeMin > (runtimeSnapshot?.stalenessRules?.warningAfterMinutes ?? 10) ? `Last updated ${snapshotAgeMin} minutes ago (out of date)` : relativeTime(runtimeSnapshot?.generatedAt)}</span>
                <span className="text-muted-foreground">Last issue: {latestIncidentChangeTs ? relativeTime(latestIncidentChangeTs) : 'No recent issues'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {showRefreshing && !runtimeSnapshot?.generatedAt && <span className="text-[11px] text-muted-foreground animate-pulse">Refreshing…</span>}
                {(semanticState === 'warning' || semanticState === 'degraded' || semanticState === 'critical') && (
                  <>
                    <a href="#status-rule-eval" className="px-2.5 py-1 rounded-md text-[11px] border border-border/60 hover:bg-accent/40 transition duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />View issue</a>
                    <a href="#cron-operations-panel" className="px-2.5 py-1 rounded-md text-[11px] border border-border/60 hover:bg-accent/40 transition duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1"><Info className="h-3 w-3" />Go to affected section</a>
                  </>
                )}
                <button onClick={() => setShowSystemDetails((v) => !v)} className="px-2.5 py-1 rounded-md text-[11px] border border-border/60 hover:bg-accent/40 transition duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1"><Info className="h-3 w-3" /> {showSystemDetails || initialSection === 'overview' || runtimeSnapshot?.systemStatus === 'critical' ? 'Hide system details' : 'View system details'}</button>
                <button onClick={() => setFocusMode(true)} className="px-2.5 py-1 rounded-md text-[11px] border border-border/60 hover:bg-accent/40 transition duration-200 ease-out active:scale-[0.98]">Focus mode</button>
              </div>
            </div>
            {semanticState === 'healthy' && <div className="mt-2 text-[11px] text-emerald-200/90">Everything is running smoothly.</div>}
          </section>
          )}

          {!isReaderMode && !isSimple && (showSystemDetails || initialSection === 'overview' || runtimeSnapshot?.systemStatus === 'critical') && (
            <section id="status-reconciliation" className="rounded-2xl border border-border/60 p-4 bg-card/60 shadow-sm text-[12px] space-y-3 transition-all duration-200 ease-out ease-in-out">
              <div className="font-medium">System details and reconciliation</div>
              <div>System is <span className="font-semibold">{semanticState}</span>: {reconciliationReason}</div>
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-2">
                <div className="rounded border border-border/50 p-2"><div className="text-[10px] uppercase text-muted-foreground">Snapshot freshness</div><div>{snapshotAgeMin != null ? `${snapshotAgeMin}m` : 'Data not available'}</div></div>
                <div className="rounded border border-border/50 p-2"><div className="text-[10px] uppercase text-muted-foreground">Validation</div><div>{runtimeSnapshot?.validation?.validationStatus || 'Data not available'}</div></div>
                <div className="rounded border border-border/50 p-2"><div className="text-[10px] uppercase text-muted-foreground">Confidence</div><div>{runtimeSnapshot?.confidenceScore ?? 'Data not available'}%</div></div>
                <div className="rounded border border-border/50 p-2"><div className="text-[10px] uppercase text-muted-foreground">Integrity</div><div>{runtimeSnapshot?.integrity?.status || 'Data not available'}</div></div>
                <div className="rounded border border-border/50 p-2"><div className="text-[10px] uppercase text-muted-foreground">Completeness</div><div>{runtimeSnapshot?.completenessScore ?? 'Data not available'}%</div></div>
              </div>
              <div className="text-[11px] text-muted-foreground">Issue count combines the latest system check and known open issues.</div>
              {runtimeSnapshot?.systemStatus !== 'healthy' && (
                <div className="text-[11px] space-x-3"><a className="underline" href="#status-rule-eval">Triggering rule</a><a className="underline" href="#cron-operations-panel">Affected cron/panel</a></div>
              )}
            </section>
          )}

          {readerIntro && (
            <section className="sticky top-2 z-20 rounded-lg border border-border/60 bg-card/95 p-3 sm:p-4 backdrop-blur-sm space-y-3">
              <div className="flex flex-wrap gap-2 text-[11px]">
                {READER_PATH_LINKS.map((item) => {
                  const active = item.href === `/control-center/${currentReaderSlug}`;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'rounded-full border px-2.5 py-1 transition-colors',
                        active ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <div className="rounded border border-border/50 bg-background/70 p-3 text-[13px] space-y-1.5">
                <p><span className="font-medium">What this page is:</span> {readerIntro.what}</p>
                <p><span className="font-medium">Who it is for:</span> {readerIntro.who}</p>
                <p><span className="font-medium">What to read next:</span> {readerIntro.next}</p>
              </div>
            </section>
          )}

          <header className="rounded-lg border border-border/60 bg-card/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold">{pageHeading}</h1>
                <p className="text-[13px] text-muted-foreground mt-1">{pageIntro}</p>
                <p className="text-[11px] text-muted-foreground mt-2">Page content updated: {formatUpdated((isReaderMode ? selectedSourceDoc?.updated_at : selectedDoc?.updated_at))}</p>
                <p className="text-[10px] text-muted-foreground">Runtime snapshot timestamp: {runtimeSnapshot?.generatedAt ? formatUpdated(runtimeSnapshot.generatedAt) : 'Data not available'} · Governance timestamp: {runtimeSnapshot?.lastGovernanceRun?.timestamp ? formatUpdated(runtimeSnapshot.lastGovernanceRun.timestamp) : 'Data not available'}</p>
                {isSimple && <p className="text-[11px] text-muted-foreground mt-1">This view shows a simplified version of your system. Switch to Detailed view for full technical information.</p>}
              </div>
              {!isReaderMode && (
                <div className="w-full max-w-md space-y-2">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setViewMode('simple')} className={cn('px-2.5 py-1 rounded-md text-[11px] border transition', viewMode === 'simple' ? 'bg-accent border-border' : 'border-border/60 hover:bg-accent/40')}>Simple view</button>
                    <button onClick={() => setViewMode('detailed')} className={cn('px-2.5 py-1 rounded-md text-[11px] border transition', viewMode === 'detailed' ? 'bg-accent border-border' : 'border-border/60 hover:bg-accent/40')}>Detailed (advanced)</button>
                    {focusMode && <button onClick={() => setFocusMode(false)} className="px-2.5 py-1 rounded-md text-[11px] border border-border/60 hover:bg-accent/40 transition duration-200 ease-out active:scale-[0.98]">Exit focus</button>}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search standards, cron jobs, docs, errors" className="h-9 w-full rounded-md border border-border/70 bg-background pl-8 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
              )}
            </div>
          </header>

          <>
          {!isReaderMode && (
            <>
              <SectionCard title="Quick status overview">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {keyFacts.map((f) => (
                    <div key={`${f.label}-${f.value}`} className="rounded border border-border/50 p-2">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{f.label}</div>
                      <div className="text-[13px] font-medium mt-1 break-words">{f.value}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="How this works">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>This page gives you the full picture for this section, including current status, detailed metrics, and supporting context.</p>
                  <p>Start at the top summary, then move through the panels below to see what is healthy, what needs attention, and what to do next.</p>
                </div>
              </SectionCard>
            </>
          )}

          {!isReaderMode && query.trim().length > 0 && (
            <SectionCard title={`Search results (${searchResults.length})`}>
              <div className="space-y-2">
                {searchResults.map((r, idx) => (
                  <Link key={`${r.type}-${idx}`} href={r.href} className="block rounded border border-border/50 p-2 hover:bg-accent/40">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.type}</div>
                    <div className="text-[13px] font-medium">{r.label}</div>
                    <div className="text-[12px] text-muted-foreground">{r.detail}</div>
                  </Link>
                ))}
              </div>
            </SectionCard>
          )}

          {initialSection === 'system-map' && (
            <>
              <SectionCard title="What this page is for">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>This page is the short map of the Jamie OS system. Use it to orient yourself quickly, not to inspect live runtime health in detail.</p>
                  <p>It should tell you what lives where, which pages answer which questions, and where to go next when you need deeper truth.</p>
                </div>
              </SectionCard>

              <SectionCard title="How to use this page well">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>Use System Map when you need structure: how the operator surfaces, governance views, cron truth, source documents, and handbook pages relate to each other.</p>
                  <p>If you need current health, go to <a className="underline" href="/control-center/overview">Overview</a>. If you need retained cron truth, go to <a className="underline" href="/control-center/cron-jobs">Cron Jobs</a>. If you need authoritative document hierarchy, go to <a className="underline" href="/control-center/source-of-truth-model">Source-of-Truth Model</a>.</p>
                </div>
              </SectionCard>

              <SectionCard title="What this map covers">
                <div className="grid md:grid-cols-2 gap-3 text-[13px] text-muted-foreground">
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Operator surfaces</div><p>Overview, Cron Jobs, Governance, Operator Guide, and related control pages used for active operation.</p></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Source documents</div><p>The underlying source-of-truth and reference documents that explain what the system is supposed to do.</p></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Shared handbook flow</div><p>The public/shareable reading path for explanation, onboarding, and external-friendly context.</p></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Escalation path</div><p>Use this page for orientation first, then move to the more specific page that owns the truth you need.</p></div>
                </div>
              </SectionCard>
            </>
          )}

          {initialSection === 'overview' && (
            <>
              <SectionCard title="Cron operations panel">
                <p className="text-[12px] text-muted-foreground mb-2">This shows whether automations are running normally. Action needed if any row is warning or critical.</p>
                <div className="rounded border border-border/50 bg-background/60 p-3 mb-3 text-[12px] text-muted-foreground space-y-1">
                  <p>Retained cron set: 9 total = 6 enabled + 3 parked (snapshot, not live execution state).</p>
                  <p>Freshness indicates snapshot recency only (not execution success).</p>
                  <p>Green: ≤15m • Amber: 16–60m • Red: &gt;60m since last retained snapshot.</p>
                </div>
                <div id="cron-operations-panel" />
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead><tr className="border-b border-border/40 text-left"><th className="py-2 pr-3">Cron</th><th className="py-2 pr-3">Schedule</th><th className="py-2 pr-3">State</th><th className="py-2 pr-3">Last run</th><th className="py-2 pr-3">Last success</th><th className="py-2 pr-3">Last failure</th><th className="py-2 pr-3">Consecutive failures</th><th className="py-2">Status</th></tr></thead>
                    <tbody>
                      {[...cronOps].sort((a: any, b: any) => (b.consecutiveFailures || 0) - (a.consecutiveFailures || 0)).map((c: any) => (
                        <tr key={c.name} className="border-b border-border/20">
                          <td className="py-2 pr-3 font-medium">{c.name}</td>
                          <td className="py-2 pr-3">{c.schedule}</td>
                          <td className="py-2 pr-3">{c.state || 'Data not available'}</td>
                          <td className="py-2 pr-3">{c.lastRun ? formatUpdated(c.lastRun) : 'Data not available'}</td>
                          <td className="py-2 pr-3">{c.lastSuccess ? formatUpdated(c.lastSuccess) : 'Data not available'}</td>
                          <td className="py-2 pr-3">{c.lastFailure ? formatUpdated(c.lastFailure) : 'Data not available'}</td>
                          <td className="py-2 pr-3">{c.consecutiveFailures ?? 'Data not available'}</td>
                          <td className="py-2"><span className={cn('inline-flex rounded-full border px-2 py-0.5', statusTone(c.status === 'healthy' ? 'healthy' : c.status === 'warning' ? 'warning' : 'critical'))}>{c.status || 'No data available'}</span>{isSimple ? <div className="text-[10px] text-muted-foreground mt-1">{c?.trust?.reason || (c?.consecutiveFailures ? "This automation didn't run successfully recently" : 'Running normally')}</div> : <div className="text-[10px] text-muted-foreground mt-1">src:runtime · rule:{runtimeSnapshot?.derivationRuleIds?.cronColour || 'n/a'} · updated:{runtimeSnapshot?.generatedAt ? formatUpdated(runtimeSnapshot.generatedAt) : 'n/a'} · {snapshotValidationState} · {c?.trust?.reason || (c?.consecutiveFailures ? 'recent failures' : 'stable')}</div>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!isSimple && <div className="text-[10px] text-muted-foreground mt-2">Panel trust: src runtime+snapshot · freshness {snapshotAgeMin ?? 'n/a'}m · validation {snapshotValidationState} · completeness {runtimeSnapshot?.completenessScore ?? 'n/a'}% · last recompute {runtimeSnapshot?.generatedAt ? formatUpdated(runtimeSnapshot.generatedAt) : 'n/a'}</div>}
              </SectionCard>

              <SectionCard title="Agent / task panel">
                <p className="text-[12px] text-muted-foreground mb-3">This shows whether agents are actively working. Action needed only if data is missing for long periods or failed tasks appear.</p>
                <div className="grid md:grid-cols-3 gap-3 text-[12px]">
                  <div className="rounded border border-border/50 p-3"><div className="font-medium mb-2">Active tasks</div><div>{runtimeSnapshot?.agentActivity?.dataState === 'no-activity' ? 'No active tasks' : 'Data not available'}</div><div className="text-[10px] text-muted-foreground mt-1">src:{runtimeSnapshot?.agentActivity ? 'snapshot' : 'none'} · {snapshotValidationState}</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium mb-2">Recent completed tasks</div><div>{runtimeSnapshot?.agentActivity?.dataState === 'no-activity' ? 'No recent completed tasks in current sample' : 'Data not available'}</div><div className="text-[10px] text-muted-foreground mt-1">last heartbeat: {runtimeSnapshot?.agentActivity?.lastHeartbeatAt ? formatUpdated(runtimeSnapshot.agentActivity.lastHeartbeatAt) : 'Data not available'}</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium mb-2">Failed tasks</div><div>{runtimeSnapshot?.agentActivity?.dataState === 'no-activity' ? 'No failed tasks in current sample' : 'Data not available'}</div><div className="text-[10px] text-muted-foreground mt-1">source state: {runtimeSnapshot?.agentActivity?.dataState || 'no-data'}</div></div>
                </div>
              </SectionCard>

              <SectionCard title="Incidents panel">
                <p className="text-[12px] text-muted-foreground mb-3">This tracks known problems and whether they are resolved. Action needed if open or regressed counts are above zero.</p>
                <div className="grid md:grid-cols-3 gap-3 text-[12px]">
                  <div className="rounded border border-border/50 p-3"><div className="font-medium mb-1">Open issues</div><div>{incidentSummary.open}</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium mb-1">Recurring / regressed</div><div>{incidentSummary.regressed}</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium mb-1">Recently resolved</div><div>{incidentSummary.resolved}</div></div>
                </div>

              </SectionCard>

              <SectionCard title="Governance proof panel">
                <p className="text-[12px] text-muted-foreground mb-3">This confirms policy checks are passing. Action needed if drift is non-zero or memory append fails.</p>
                <div id="status-rule-eval" className="rounded border border-border/50 p-3 mb-3 text-[12px]">
                  <div className="font-medium mb-2">Status derivation preview</div>
                  {(Array.isArray(runtimeSnapshot?.statusDerivationPreview?.evaluations) ? runtimeSnapshot.statusDerivationPreview.evaluations : []).map((e: any, i: number) => (
                    <div key={`${e.ruleId}-${i}`} className="flex items-start justify-between border-b border-border/20 py-1 last:border-0">
                      <div><span className="font-medium">{e.ruleId}</span> · {e.message}</div>
                      <span className={cn('text-[10px] rounded border px-1.5 py-0.5', e.result === 'warning' ? statusTone('warning') : e.result === 'fail' ? statusTone('critical') : statusTone('healthy'))}>{e.result}</span>
                    </div>
                  ))}
                  <div className="mt-2 text-[11px]">Final status: <span className={cn('inline-flex rounded border px-2 py-0.5 ml-1', statusTone(runtimeSnapshot?.statusDerivationPreview?.final || runtimeSnapshot?.systemStatus))}>{runtimeSnapshot?.statusDerivationPreview?.final || runtimeSnapshot?.systemStatus || 'Data not available'}</span></div>
                  <div className="text-[10px] text-muted-foreground mt-1">Remediation hint: {runtimeSnapshot?.trustSummary?.reason || 'Data not available'}</div>
                </div>
                <div className="grid md:grid-cols-4 gap-3 text-[12px]">
                  <div className="rounded border border-border/50 p-3"><div className="text-muted-foreground">checks</div><div>Data not available</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="text-muted-foreground">warnings</div><div>Data not available</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="text-muted-foreground">drift</div><div>{runtimeSnapshot?.lastGovernanceRun?.driftCount ?? 'Data not available'}</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="text-muted-foreground">standards drift</div><div>{runtimeSnapshot?.lastGovernanceRun?.standardsDrift ?? 'Data not available'}</div></div>
                </div>
                <div className="mt-3 text-[12px] text-muted-foreground">Latest audit: {runtimeSnapshot?.lastGovernanceRun?.timestamp ? formatUpdated(runtimeSnapshot.lastGovernanceRun.timestamp) : 'Data not available'} · Memory append: {runtimeSnapshot?.lastGovernanceRun?.memoryAppendStatus || 'Data not available'}</div>
                {!isSimple && <div className="text-[10px] text-muted-foreground mt-1">Panel trust: src snapshot+governance · rule:{runtimeSnapshot?.derivationRuleIds?.governanceStatus || 'n/a'} · freshness {snapshotAgeMin ?? 'n/a'}m · validation {snapshotValidationState} · completeness {runtimeSnapshot?.completenessScore ?? 'n/a'}% · last recompute {runtimeSnapshot?.generatedAt ? formatUpdated(runtimeSnapshot.generatedAt) : 'n/a'}</div>}
              </SectionCard>

              <SectionCard title="Basic metrics panel (last 24h)">
                <p className="text-[12px] text-muted-foreground mb-3">This summarises overall reliability in the last day. Action needed if failure rate rises or recovery count spikes.</p>
                <div className="grid md:grid-cols-6 gap-3 text-[12px]">
                  <div className="rounded border border-border/50 p-3"><div className="text-muted-foreground">Total runs</div><div>{runtimeSnapshot?.metrics24h?.totalRuns ?? 'Data not available'}</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="text-muted-foreground">Successful</div><div>{runtimeSnapshot?.metrics24h?.successfulRuns ?? 'Data not available'}</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="text-muted-foreground">Failed</div><div>{runtimeSnapshot?.metrics24h?.failedRuns ?? 'Data not available'}</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="text-muted-foreground">Success rate</div><div>{runtimeSnapshot?.metrics24h?.successRate ?? 'Data not available'}%</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="text-muted-foreground">Avg runtime</div><div>{runtimeSnapshot?.metrics24h?.averageRuntimeMs ?? 'Data not available'} ms</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="text-muted-foreground">Recovery count</div><div>{runtimeSnapshot?.metrics24h?.recoveryCount ?? 'Data not available'}</div></div>
                </div>

              </SectionCard>

              {viewMode === 'detailed' && (
                <SectionCard title="Recent event timeline (last 10)">
                  <div className="space-y-2 text-[12px]">
                    {(Array.isArray(runtimeSnapshot?.events) ? runtimeSnapshot.events : []).slice(0, 10).map((ev: any, i: number) => (
                      <div key={`${ev.ts}-${i}`} className="rounded border border-border/40 p-2 flex items-start justify-between gap-3">
                        <div><div className="font-medium">{ev.type} · {ev.status}</div><div className="text-muted-foreground">{ev.message}</div></div>
                        <div className="text-muted-foreground whitespace-nowrap">{ev.ts ? formatUpdated(ev.ts) : 'Data not available'}</div>
                      </div>
                    ))}
                    {(!Array.isArray(runtimeSnapshot?.events) || runtimeSnapshot.events.length === 0) && <div>Data not available</div>}
                  </div>
                </SectionCard>
              )}

              {viewMode === 'detailed' && (
              <SectionCard title="Snapshot auditability and derivation transparency">
                <div className="grid md:grid-cols-3 gap-3 text-[12px] mb-3">
                  <div className="rounded border border-border/50 p-3"><div className="text-muted-foreground">Schema version</div><div>{runtimeSnapshot?.schemaVersion || 'Data not available'}</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="text-muted-foreground">Completeness score</div><div>{runtimeSnapshot?.completenessScore ?? 'Data not available'}%</div></div>
                  <div className="rounded border border-border/50 p-3"><div className="text-muted-foreground">Validation status</div><div>{runtimeSnapshot?.validation?.validationStatus || 'Data not available'}</div></div>
                </div>
                <details className="rounded border border-border/50 p-3 mb-2">
                  <summary className="cursor-pointer font-medium">Runtime snapshot schema (full)</summary>
                  <div className="mt-2 rounded border border-border/40 bg-background p-3 text-[12px] text-muted-foreground">{toDetailedReadable(`Schema fields tracked: ${Object.keys(runtimeSnapshot?.fieldSchema || {}).length}. This section is generated from your system configuration and documentation.`)}</div>
                </details>
                <details className="rounded border border-border/50 p-3 mb-2">
                  <summary className="cursor-pointer font-medium">Field provenance by panel</summary>
                  <div className="mt-2 rounded border border-border/40 bg-background p-3 text-[12px] text-muted-foreground">{toDetailedReadable(`Data source groups tracked: ${Object.keys(runtimeSnapshot?.fieldProvenance || {}).length}. This shows where each panel gets its data.`)}</div>
                </details>
                <details className="rounded border border-border/50 p-3 mb-2">
                  <summary className="cursor-pointer font-medium">Deterministic derivation rules</summary>
                  <div className="mt-2 rounded border border-border/40 bg-background p-3 text-[12px] text-muted-foreground">{toDetailedReadable(`Rule groups available: ${Object.keys(runtimeSnapshot?.derivationRules || {}).length}. These rules explain how status and trust signals are calculated.`)}</div>
                </details>
                <details className="rounded border border-border/50 p-3 mb-2">
                  <summary className="cursor-pointer font-medium">Staleness + validation rules</summary>
                  <div className="mt-2 rounded border border-border/40 bg-background p-3 text-[12px] text-muted-foreground">{toDetailedReadable('This section explains freshness limits, check results, and which sources were used for this view.')}</div>
                </details>
                <details className="rounded border border-border/50 p-3">
                  <summary className="cursor-pointer font-medium">Completeness matrix + incident/metrics logic</summary>
                  <div className="mt-2 rounded border border-border/40 bg-background p-3 text-[12px] text-muted-foreground">{toDetailedReadable('This section shows completeness checks, issue linking logic, and how reliability metrics are calculated.')}</div>
                </details>
              </SectionCard>
              )}
            </>
          )}

          {initialSection === 'cron-jobs' && (
            <SectionCard title={isSimple ? "Automations explained" : "Automations"}>
              <p className="text-[13px] text-muted-foreground mb-2">{isSimple ? 'This section lists every automation, when it runs, and whether it is healthy.' : 'This page shows your automations, when they run, and what they do.'}</p>
              <div className="rounded border border-border/50 bg-background/60 p-3 mb-5 text-[12px] text-muted-foreground space-y-1">
                <p>Retained set breakdown: 9 total = 6 enabled + 3 parked.</p>
                <p>This page reflects retained/runtime snapshot truth for configured jobs; it is not a live run-state monitor.</p>
              </div>
              <div className="space-y-5">
                {cronRowsResolved.map((c) => {
                  const promptSummary = summary(toPlainText(c.promptMessage || c.purpose || ''), 180) || 'No data available';
                  const hasFailure = !!c.lastFailure || (typeof (c as any).consecutiveFailures === 'number' && (c as any).consecutiveFailures > 0);
                  const statusLine = cronStatusLine(!!c.enabled, hasFailure, c.lastRun || null);
                  const desc = cronHumanDescription(c.name || 'Automation', isSimple ? toSimpleLanguage(c.purpose || c.outputs) : (c.purpose || c.outputs));
                  return (
                    <div key={c.name} className={cn('rounded-2xl border border-border/60 p-6 bg-card/70 shadow-sm', hasFailure ? 'bg-amber-500/5 border-amber-400/30' : '')}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="text-[16px] font-semibold leading-6">{c.name || 'No data available'}</h3>
                          <p className="text-[13px] text-muted-foreground leading-6">{desc.what}</p>
                          <p className="text-[13px] text-muted-foreground leading-6">{desc.why}</p>
                        </div>
                        <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-sm', statusBadge(c.enabled ? 'enabled' : 'disabled'))}>{c.enabled ? 'Active' : 'Paused'}</span>
                      </div>

                      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-[12px]">
                        <div><div className="text-muted-foreground">Schedule</div><div className="mt-1">{c.schedule || 'No data available'}</div></div>
                        <div><div className="text-muted-foreground">Status</div><div className="mt-1">{statusLine}</div></div>
                        <div><div className="text-muted-foreground">Last run</div><div className="mt-1">{c.lastRun ? relativeTime(c.lastRun) : "This hasn’t run yet"}</div></div>
                      </div>

                      {(hasFailure || !c.enabled) && (
                        <div className="mt-4 flex items-center gap-2 text-[12px]">
                          <a href="#status-rule-eval" className="px-2.5 py-1 rounded-md border border-border/60 hover:bg-accent/40 transition duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />View issue</a>
                          <a href="#status-rule-eval" className="px-2.5 py-1 rounded-md border border-border/60 hover:bg-accent/40 transition duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1"><Info className="h-3 w-3" />Investigate</a>
                        </div>
                      )}

                      {!isSimple && (
                      <details className="mt-5 rounded-xl border border-border/50 p-3">
                        <summary className="cursor-pointer text-[12px] font-medium">View technical details</summary>
                        <div className="mt-3 max-h-80 overflow-auto rounded-lg bg-background/40 p-3 space-y-4 text-[12px] leading-6">
                          <section>
                            <div className="text-muted-foreground mb-1">Prompt</div>
                            <div>{promptSummary}</div>
                            <details className="mt-2 rounded border border-border/40 p-2">
                              <summary className="cursor-pointer">View full prompt</summary>
                              <div className="mt-2 rounded border border-border/40 bg-background p-3 text-[12px] text-muted-foreground">{toDetailedReadable(c.promptMessage || 'No data available')}</div>
                            </details>
                          </section>
                          <section>
                            <div className="text-muted-foreground mb-1">Metadata</div>
                            <div>Owner: {c.owner || 'No data available'}</div>
                            <div>Purpose: {c.purpose || 'No data available'}</div>
                          </section>
                          <section>
                            <div className="text-muted-foreground mb-1">Standards</div>
                            <div>{c.relatedStandards?.length ? c.relatedStandards.join(', ') : 'No data available'}</div>
                          </section>
                        </div>
                      </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {initialSection === 'standards' && (
            <SectionCard title={isSimple ? "Standards explained" : "What you can do here"}>
              <div className="grid sm:grid-cols-4 gap-2 mb-4 text-[12px]">
                {[
                  ['Total', standardCounts.total],
                  ['Canonical', standardCounts.canonical],
                  ['Derived', standardCounts.derived],
                  ['Transitional', standardCounts.transitional],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded border border-border/50 p-2"><div className="text-muted-foreground uppercase tracking-wide text-[11px]">{label}</div><div className="font-semibold text-[14px] mt-1">{value}</div></div>
                ))}
              </div>

              <div className="grid lg:grid-cols-[300px,1fr] gap-4">
                <aside className="rounded border border-border/50 p-2 max-h-[760px] overflow-auto">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1">Standards index</div>
                  {Object.entries(standardsByDomain).map(([domain, rows]) => (
                    <div key={domain} className="mb-2">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1">{domain}</div>
                      {rows.map((s) => (
                        <button key={s.document_id} onClick={() => setSelectedStandardId(s.document_id)} className={cn('w-full text-left rounded px-2 py-2 text-[12px] border mb-1', (activeStandard?.document_id || '') === s.document_id ? 'bg-accent border-border' : 'border-transparent hover:bg-accent/40')}>
                          <div className="font-medium">{s.title}</div>
                          <div className="mt-1"><span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px]', statusBadge(s.status))}>{s.status}</span></div>
                        </button>
                      ))}
                    </div>
                  ))}
                </aside>

                <div className="rounded border border-border/50 p-4 space-y-3">
                  {activeStandard ? (
                    <>
                      <h3 className="font-semibold text-[15px]">{activeStandard.title}</h3>
                      <div className="grid sm:grid-cols-2 gap-2 text-[12px]">
                        <div><span className="text-muted-foreground">ID:</span> {activeStandard.document_id}</div>
                        <div><span className="text-muted-foreground">Type:</span> <span className={cn('inline-flex rounded-full border px-2 py-0.5 ml-1 text-[11px]', statusBadge(activeStandard.status))}>{activeStandard.status}</span></div>
                        <div><span className="text-muted-foreground">Domain:</span> {activeStandard.domain}</div>
                        <div><span className="text-muted-foreground">Source:</span> <code>{activeStandard.canonical_reference || 'ops/standards/*'}</code></div>
                        <div><span className="text-muted-foreground">Enforcement:</span> {activeStandard.status === 'canonical' ? 'enforced' : activeStandard.status === 'derived' ? 'partial' : 'guidance'}</div>
                        <div><span className="text-muted-foreground">Used by:</span> {(standardUsage[(activeStandard.canonical_reference || '').split('/').pop() || ''] || []).join(', ') || 'governance/runtime references'}</div>
                      </div>
                      <details className="rounded border border-border/50 p-3 border-t border-border/40 pt-3">
                        <summary className="cursor-pointer text-[12px] font-medium">Full standard content</summary>
                        <div className="mt-2 space-y-2">{renderReadable(activeStandardDoc?.content || activeStandard?.title || 'This section is generated from your system configuration and documentation.')}</div>
                      </details>
                    </>
                  ) : (
                    <div className="text-[13px] text-muted-foreground">No standards available.</div>
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {initialSection === 'governance' && (
            <>
              <SectionCard title="What governance means here">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>Governance in Jamie OS means the checks that help confirm the system is aligned with its intended setup, rules, and audit expectations.</p>
                  <p>This page is about trust, drift, validation, and policy alignment. It is not the page for live cron execution detail or day-to-day runtime triage.</p>
                </div>
              </SectionCard>

              <SectionCard title="What this page is summarising">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>This page summarises governance-alignment checks, drift indicators, validation state, standards-related signals, and the latest governance audit timestamp where available.</p>
                  <p>Use it to answer: are the rules, records, and expected system shape still in sync?</p>
                </div>
              </SectionCard>

              <SectionCard title="What governance covers — and what it does not">
                <div className="grid md:grid-cols-2 gap-3 text-[13px] text-muted-foreground">
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Governance does cover</div><p>Drift, audit evidence, validation signals, standards alignment, and whether the system still matches its declared operating rules.</p></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Governance does not cover</div><p>Real-time cron execution, live incident triage, or whether a single automation just failed moments ago. Use runtime and cron pages for that.</p></div>
                </div>
              </SectionCard>

              <SectionCard title="How governance relates to the rest of Control Center">
                <div className="grid md:grid-cols-2 gap-3 text-[13px] text-muted-foreground">
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Operational truth</div><p><a className="underline" href="/control-center/operational-truth-model">Operational Truth Model</a> explains how trust and status are derived across surfaces.</p></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Cron / runtime state</div><p><a className="underline" href="/control-center/overview">Overview</a> and <a className="underline" href="/control-center/cron-jobs">Cron Jobs</a> are where you inspect current runtime state and retained cron truth.</p></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Source-of-truth docs</div><p><a className="underline" href="/control-center/source-of-truth-model">Source-of-Truth Model</a> is the path to use when you need to settle which source is authoritative.</p></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Troubleshooting</div><p><a className="underline" href="/control-center/fixing-problems">Fixing Problems</a> is the practical next stop when governance and runtime surfaces stop agreeing.</p></div>
                </div>
              </SectionCard>

              <SectionCard title="If governance and runtime truth disagree">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>Do not treat one page as automatically wrong. Check freshness first, then specificity: runtime pages for current state, governance for alignment/drift, and source-of-truth docs for authority.</p>
                  <p>If runtime looks healthy but governance shows drift or stale validation, treat that as a trust problem that still needs operator attention.</p>
                </div>
              </SectionCard>

              <SectionCard title="Canonical source of truth for governance questions">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>The canonical governance anchor is <code>ops/automation-manifest.json</code>, supported by the linked standards and source-of-truth documents.</p>
                  <p>Use this page as the operator summary; use the source-of-truth docs when you need to settle the final authoritative answer.</p>
                </div>
              </SectionCard>
            </>
          )}

          {initialSection === 'operator-guide' && (
            <>
              <SectionCard title="What this page is for">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>This is the short operator page for Jamie OS. Use it when you want a quick, trustworthy read on system health without opening the full handbook.</p>
                  <p>It tells you what to check daily, which page answers which question, and what to trust when different surfaces appear to disagree.</p>
                </div>
              </SectionCard>

              <SectionCard title="Minimum daily operator checks">
                <div className="space-y-3 text-[13px] text-muted-foreground">
                  <div className="rounded border border-border/50 p-3">
                    <div className="font-medium text-foreground mb-1">1. Check the overview first</div>
                    <p>Open <a className="underline" href="/control-center/overview">/control-center/overview</a>. If overall status is healthy, confidence is solid, and nothing is flagged, you usually do not need a deeper pass.</p>
                  </div>
                  <div className="rounded border border-border/50 p-3">
                    <div className="font-medium text-foreground mb-1">2. Check cron truth next</div>
                    <p>Open <a className="underline" href="/control-center/cron-jobs">/control-center/cron-jobs</a> to confirm the retained job set, parked jobs, and any recent failure signals. Use this page for job truth, not assumptions from summary badges.</p>
                  </div>
                  <div className="rounded border border-border/50 p-3">
                    <div className="font-medium text-foreground mb-1">3. Check governance only if trust is in doubt</div>
                    <p>Open <a className="underline" href="/control-center/governance">/control-center/governance</a> when the system looks stale, contradictory, or you need to confirm drift, validation, or audit status.</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="How to tell whether Jamie OS is healthy">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>Jamie OS is healthy when the Overview page is healthy, the runtime snapshot is reasonably fresh, confidence is high enough to trust the page, and there are no unresolved warnings or repeated cron failures demanding attention.</p>
                  <p>If the status is warning or critical, the snapshot is stale, confidence drops, or cron failures stack up, treat the system as needing operator attention even if one surface still looks calm.</p>
                </div>
              </SectionCard>

              <SectionCard title="Where to go for each question">
                <div className="grid md:grid-cols-2 gap-3 text-[13px] text-muted-foreground">
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Runtime overview</div><p><a className="underline" href="/control-center/overview">/control-center/overview</a> — first stop for current health, confidence, freshness, and issue signals.</p></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Cron truth</div><p><a className="underline" href="/control-center/cron-jobs">/control-center/cron-jobs</a> — retained configured job truth and recent runtime snapshot context.</p></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Governance</div><p><a className="underline" href="/control-center/governance">/control-center/governance</a> — drift, audit status, validation, and policy-check context.</p></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Troubleshooting</div><p><a className="underline" href="/control-center/fixing-problems">/control-center/fixing-problems</a> — plain-English troubleshooting flow when something looks wrong.</p></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Source-of-truth docs</div><p><a className="underline" href="/control-center/source-of-truth-model">/control-center/source-of-truth-model</a> — use this when you need to know which file or surface is authoritative.</p></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Shared/public handbook</div><p><a className="underline" href="/control-center/share-export">/control-center/share-export</a> and <a className="underline" href="/control-center/openclaw-complete-reference">/control-center/openclaw-complete-reference</a> — for readable sharing and broader orientation.</p></div>
                </div>
              </SectionCard>

              <SectionCard title="When trust surfaces disagree">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>Do not average conflicting signals. Start from the freshest trustworthy surface, then step down to the more specific page: Overview for broad state, Cron Jobs for retained job truth, Governance for drift/validation, then the source-of-truth model if needed.</p>
                  <p>If a summary surface looks healthy but a deeper surface shows stale data, repeated failures, or drift, trust the more specific page and the fresher evidence.</p>
                </div>
              </SectionCard>

              <SectionCard title="Canonical source of truth">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>The canonical governance anchor is <code>ops/automation-manifest.json</code>, supported by the governance and standards documents linked through the source-of-truth model.</p>
                  <p>Use Control Center pages for operator interpretation, but use the source-of-truth docs when you need to settle what is actually authoritative.</p>
                </div>
              </SectionCard>

              <SectionCard title="When to use handbook pages vs operator surfaces">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>Use the public/shared handbook when you need a readable explanation, onboarding path, or something safe to hand to another person.</p>
                  <p>Use operator surfaces when you are actively checking health, validating trust, investigating mismatch, or deciding whether intervention is needed.</p>
                </div>
              </SectionCard>
            </>
          )}

          {initialSection === 'governance' && (
            <SectionCard title={isSimple ? "Governance details" : "Governance source details"}>
              <div className="space-y-4 text-[13px]">
                <details className="rounded border border-border/50 p-3">
                  <summary className="cursor-pointer font-medium text-[13px]">Governance logic and audit checks</summary>
                  <div className="prose prose-sm dark:prose-invert max-w-none mt-2">
                    <div className="space-y-2">{renderReadable(byPath.get('ops/governance-alignment-check.md')?.content || selectedDoc?.content || '')}</div>
                  </div>
                </details>
                <div className="rounded border border-border/50 p-3">
                  <h3 className="font-medium mb-2">Drift detection + GOV_ALIGN_SUMMARY output structure</h3>
                  <div className="rounded border border-border/40 bg-background p-3 text-[12px] space-y-2">
                    {renderReadable('Summary format: checks, warnings, drift, standards drift, and overall severity. This section flags when setup checks fail, when things are out of sync, or when audit logging does not complete.')}
                  </div>
                </div>
                <details className="rounded border border-border/50 p-3">
                  <summary className="cursor-pointer font-medium text-[13px]">Automation manifest (full fields + runtime usage)</summary>
                  <div className="rounded border border-border/40 bg-background p-3 text-[12px] text-muted-foreground mt-2 space-y-2">
                    {renderReadable(byPath.get('ops/automation-manifest.json')?.content || 'No data available')}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-2">This page is generated from your system configuration and documentation.</p>
                </details>
              </div>
            </SectionCard>
          )}

          {initialSection === 'mc-summary' && (
            <>
              <SectionCard title="What this page is for">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>This page is the short summary view of Jamie OS. Use it for quick orientation when you want the shape of the system without opening the full handbook.</p>
                  <p>It is not the canonical handbook, not the source-of-truth model, and not the operator runbook for active trust checks.</p>
                </div>
              </SectionCard>

              <SectionCard title="What belongs here">
                <div className="space-y-2 text-[13px] text-muted-foreground leading-6">
                  <p>Keep this page focused on the current high-level model: agent/runtime shape, memory architecture, and how scheduled work connects into Jamie OS.</p>
                  <p>Detailed trust interpretation belongs in Operator Guide, source authority belongs in Source-of-Truth Model, and broader explanation belongs in the handbook.</p>
                </div>
              </SectionCard>

              <SectionCard title="How to use it well">
                <div className="grid md:grid-cols-2 gap-3 text-[13px] text-muted-foreground">
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Use this page for</div><p>Quick orientation, current structure, and a short explanation of how Jamie OS fits together.</p></div>
                  <div className="rounded border border-border/50 p-3"><div className="font-medium text-foreground mb-1">Do not use this page for</div><p>Canonical rules, detailed troubleshooting, governance decisions, or resolving trust conflicts between deeper surfaces.</p></div>
                </div>
              </SectionCard>
            </>
          )}

          {initialSection === 'system-improvements' && (
            <SectionCard title={isSimple ? "Improvements explained" : "What you can do here"}>
              <div className="space-y-4 text-[13px]">
                <details className="rounded border border-border/50 p-3">
                  <summary className="cursor-pointer font-medium text-[13px]">Learning loop (full error register entries)</summary>
                  <div className="mt-2 space-y-2">{renderReadable(byPath.get('ops/error-register.md')?.content || '')}</div>
                </details>
                <div className="rounded border border-border/50 p-3">
                  <h3 className="font-medium mb-2">Recurrence rules, lifecycle transitions, update logic</h3>
                  <div className="rounded border border-border/40 bg-background p-3 text-[12px] space-y-2">
                    {renderReadable('Issue flow: open, investigating, fix applied, monitoring, then resolved. If an issue comes back, it is treated as a recurring problem and tracked again.')}
                  </div>
                </div>
                <div className="rounded border border-border/50 p-3">
                  <h3 className="font-medium mb-2">System improvements register</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="space-y-2">{renderReadable(byPath.get('ops/hub/system-improvements.md')?.content || selectedDoc?.content || '')}</div>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {initialSection === 'mc-summary' && (
            <SectionCard title={isSimple ? "MC summary details" : "Summary source details"}>
              <div className="space-y-4 text-[13px]">
                <div className="rounded border border-border/50 p-3">
                  <h3 className="font-medium mb-2">Agent/runtime model and lifecycle</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="space-y-2">{renderReadable(byTitle.get('OpenClaw Agent Operating Model')?.content || byTitle.get('Jamie OS Summary')?.content || '')}</div>
                  </div>
                </div>
                <div className="rounded border border-border/50 p-3">
                  <h3 className="font-medium mb-2">Memory architecture and retention model</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="space-y-2">{renderReadable(byTitle.get('Memory & Learning Architecture')?.content || '')}</div>
                  </div>
                </div>
                <div className="rounded border border-border/50 p-3">
                  <h3 className="font-medium mb-2">Task linkage and cron-triggered execution</h3>
                  <div className="rounded border border-border/40 bg-background p-3 text-[12px] space-y-2">
                    {renderReadable('Automations trigger scheduled work and create updates in reporting and memory logs. Guardrails ensure work follows the required setup checks before anything changes.')}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {isReaderMode && selectedSourceDoc && (
            <SectionCard title={isSimple ? 'Document content' : 'Document content'}>
              <div className="space-y-2">{renderReadable(selectedSourceDoc.content || '')}</div>
            </SectionCard>
          )}

          {!isReaderMode && initialSection === 'share-export' && (
            <SectionCard title={isSimple ? "Sharing explained" : "What you can do here"}>
              <div className="space-y-3 text-[13px]">
                <div className="rounded border border-border/50 p-3 text-muted-foreground space-y-2">
                  <p>This page helps you access your system and share it safely.</p>
                  <p>It matters because everyone can use the same up-to-date links.</p>
                  <p>Use the main link to view your dashboard, or copy a link to share.</p>
                </div>
                <div className="rounded border border-border/50 p-3 flex items-center justify-between gap-3">
                  <div><div className="font-medium">Control Center URL</div><div className="text-muted-foreground break-all">https://mission-control-leadrise.vercel.app/control-center</div><div className="text-[12px] text-muted-foreground mt-1">Human operator and shared viewer surface.</div></div>
                  <button onClick={() => copyText('cc', 'https://mission-control-leadrise.vercel.app/control-center')} className="px-2 py-1 rounded border border-border/70 text-[12px]">{copyState.cc === 'copied' ? 'Copied' : 'Copy'}</button>
                </div>
                <div className="rounded border border-border/50 p-3 flex items-center justify-between gap-3">
                  <div><div className="font-medium">Advanced: API access</div><div className="text-muted-foreground break-all">https://mission-control-leadrise.vercel.app/control-center/context.json</div><div className="text-[12px] text-muted-foreground mt-1">Used for integrations and developers.</div></div>
                  <button onClick={() => copyText('json', 'https://mission-control-leadrise.vercel.app/control-center/context.json')} className="px-2 py-1 rounded border border-border/70 text-[12px]">{copyState.json === 'copied' ? 'Copied' : 'Copy'}</button>
                </div>
                <div className="rounded border border-border/50 p-3 text-[12px] text-muted-foreground space-y-2">
                  <p>Open your dashboard: <a className="underline" href="/control-center/runtime-status-snapshot">/control-center/runtime-status-snapshot</a></p>
                  <p>Advanced data feed: <a className="underline" href="/control-center/runtime-status-snapshot.json">/control-center/runtime-status-snapshot.json</a></p>
                  <p>How your system is set up: <a className="underline" href="/control-center/operational-truth-model">/control-center/operational-truth-model</a></p>
                  <p>Use these links to view your setup, share status, or connect integrations.</p>
                </div>
              </div>
            </SectionCard>
          )}

          {initialSection === 'changelog' && (
            <SectionCard title={isSimple ? "Changes explained" : "What you can do here"}>
              <div className="space-y-2 text-[12px]">
                {latestChanges.map((d) => (
                  <div key={d.id} className="flex items-start justify-between gap-2 border-b border-border/20 pb-2 last:border-0">
                    <div><div className="font-medium">{d.title}</div><div className="text-muted-foreground">{d.path}</div></div>
                    <div className="text-muted-foreground whitespace-nowrap">{formatUpdated(d.updated_at)}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}


          <SectionCard title={isSimple ? "Where this information comes from" : "Reference links"}>
            {initialSourceSlug === 'cron-inventory' && (
              <div className="rounded border border-border/50 bg-background/60 p-3 mb-3 text-[12px] text-muted-foreground space-y-1">
                <p>Source view shows retained cron inventory snapshot at capture time.</p>
                <p>Counts/statuses represent retained configuration state, not real-time execution outcomes.</p>
              </div>
            )}
            {initialSourceSlug === 'improvement-programme-status-matrix' && (
              <div className="rounded border border-border/50 bg-background/60 p-3 mb-3 text-[12px] text-muted-foreground space-y-1">
                <p>This matrix should track shipped status only and stay aligned with what is actually live.</p>
                <p>Recent live fixes now include trust-clarity wording, Operator Guide strengthening, System Map cleanup, and Governance framing cleanup.</p>
              </div>
            )}
            {initialSourceSlug === 'source-of-truth-model' && (
              <div className="rounded border border-border/50 bg-background/60 p-3 mb-3 text-[12px] text-muted-foreground space-y-1">
                <p>Canonical handbook pages explain the system; operator pages summarise and guide use; source pages expose underlying source records; runtime and retained snapshots describe current or retained state.</p>
                <p>When surfaces disagree, prefer the more authoritative source for meaning and the fresher, more specific source for current state.</p>
              </div>
            )}
            {initialSourceSlug === 'memory-operating-model' && (
              <div className="rounded border border-border/50 bg-background/60 p-3 mb-3 text-[12px] text-muted-foreground space-y-1">
                <p>Current memory layers separate durable memory, working summaries, and source documents; memory preserves continuity, but it does not override fresher runtime state or more authoritative source records.</p>
                <p>If memory wording conflicts with fresher source or runtime surfaces, trust the fresher and more authoritative surface first, then treat memory as context to reconcile.</p>
              </div>
            )}
            {initialSourceSlug === 'public-private-view-model' && (
              <div className="rounded border border-border/50 bg-background/60 p-3 mb-3 text-[12px] text-muted-foreground space-y-1">
                <p>Public/shared pages are for readable explanation and safe sharing; operator pages are for active use and trust decisions; source pages expose underlying records; runtime and retained snapshot pages answer current-state questions.</p>
                <p>If surfaces overlap, choose by audience first, then by truth type: explanation, operator guidance, source reference, or current/retained state.</p>
              </div>
            )}
            {initialSourceSlug === 'troubleshooting-baseline' && (
              <div className="rounded border border-border/50 bg-background/60 p-3 mb-3 text-[12px] text-muted-foreground space-y-1">
                <p>Start with Overview for broad current-state health, then use Cron Jobs for retained job truth, Governance for drift or validation doubt, Operator Guide for practical decision flow, and Source-of-Truth Model when authority is unclear.</p>
                <p>If surfaces disagree, trust the fresher current-state surface for live status and the more authoritative source page or handbook surface for meaning and rules.</p>
              </div>
            )}
            {initialSourceSlug === 'fixing-problems' && (
              <div className="rounded border border-border/50 bg-background/60 p-3 mb-3 text-[12px] text-muted-foreground space-y-1">
                <p>Before editing anything, verify whether the issue is actually current-state data, a stale summary, a metadata/render-path mismatch, or a genuine source-record problem.</p>
                <p>Use Overview and Cron Jobs for current or retained state, Governance and Operator Guide for trust interpretation, Source-of-Truth Model for authority, and only treat it as a docs issue when the fresher or more authoritative surface is not the one that is correct.</p>
              </div>
            )}
            {initialSourceSlug === 'file-document-map' && (
              <div className="rounded border border-border/50 bg-background/60 p-3 mb-3 text-[12px] text-muted-foreground space-y-1">
                <p>This map is for locating layers and source paths: public/shared entry surfaces, canonical handbook pages, operator pages, source pages, and runtime or retained snapshot surfaces.</p>
                <p>If live rendering seems wrong, use this page to identify whether the issue is in the source record, slug/path mapping, shared renderer path, or simply that another page layer is the correct one for that question.</p>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-2">
              {sourceLinks.map((src) => (
                <Link key={src.slug} href={`/control-center/source/${src.slug}`} className={cn('text-[12px] rounded border px-2 py-1.5', initialSourceSlug === src.slug ? 'bg-accent border-border' : 'border-border/60 hover:bg-accent/40')}>
                  {src.label}
                </Link>
              ))}
            </div>
            {selectedSourceDoc && (
              <details className="rounded border border-border/40 p-3 mt-3">
                <summary className="cursor-pointer text-[12px] font-medium">Source preview (long raw content)</summary>
                <div className="mt-2 space-y-2">
                  {toParagraphs(toPlainText(selectedSourceDoc.content), 260).map((line, idx) => (
                    <p key={idx} className="text-[13px] text-muted-foreground leading-6">{line}</p>
                  ))}
                </div>
              </details>
            )}
            <div className="mt-3 text-[12px] text-muted-foreground">Use these links when you want to review the original source behind this page.</div>
            <div className="mt-2 text-[12px]"><Link href="/control-center/changelog" className="underline text-muted-foreground hover:text-foreground inline-flex items-center gap-1">Global changelog <ExternalLink className="h-3 w-3" /></Link></div>
          </SectionCard>

          </>
        </article>
      </main>
    </div>
  );
}

