/** Shared style constants — single source of truth for status/priority styling */

/** Apps tracked in the unified changelog */
export const APPS = [
  { id: 'mission-control', label: 'Mission Control', color: 'indigo' },
  { id: 'air-social', label: 'Air Social', color: 'emerald' },
] as const;

export type AppId = (typeof APPS)[number]['id'];

export const APP_BADGE: Record<string, { label: string; className: string }> = {
  'mission-control': { label: 'Mission Control', className: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' },
  'air-social': { label: 'Air Social', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
};

/** Unified changelog status config */
export const CHANGELOG_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  request:     { label: 'Request',     bg: 'bg-amber-500/10',   text: 'text-amber-400',    border: 'border-amber-500/20',   dot: 'bg-amber-400' },
  backlog:     { label: 'Backlog',     bg: 'bg-muted/50',       text: 'text-muted-foreground', border: 'border-muted-foreground/20', dot: 'bg-muted-foreground' },
  in_progress: { label: 'In Progress', bg: 'bg-blue-500/10',    text: 'text-blue-400',     border: 'border-blue-500/20',    dot: 'bg-blue-400' },
  shipped:     { label: 'Shipped',     bg: 'bg-emerald-500/10', text: 'text-emerald-400',  border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  reverted:    { label: 'Reverted',    bg: 'bg-destructive/10', text: 'text-destructive',  border: 'border-destructive/20', dot: 'bg-destructive' },
};

export const CHANGELOG_STATUSES: Array<{ value: string; label: string }> = [
  { value: 'request',     label: 'Request' },
  { value: 'backlog',     label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'shipped',     label: 'Shipped' },
  { value: 'reverted',    label: 'Reverted' },
];

export const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  // backlog mapped to todo styles for graceful fallback
  backlog: { dot: 'var(--status-warning)', bg: 'bg-status-warning/10', text: 'text-amber-400', label: 'To Do' },
  todo: { dot: 'var(--status-warning)', bg: 'bg-status-warning/10', text: 'text-amber-400', label: 'To Do' },
  doing: { dot: 'var(--status-doing)', bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'In Progress' },
  done: { dot: 'var(--status-success)', bg: 'bg-status-success/10', text: 'text-status-success', label: 'Done' },
};

export const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string; border: string }> = {
  P1: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Critical', border: 'border-destructive/20' },
  P2: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'High', border: 'border-orange-500/20' },
  P3: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Medium', border: 'border-blue-500/20' },
  P4: { bg: 'bg-status-success/15', text: 'text-status-success', label: 'Low', border: 'border-status-success/20' },
};

export const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  P1: { label: 'CRITICAL', className: 'bg-destructive/20 text-destructive border-destructive/20' },
  P2: { label: 'HIGH', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  P3: { label: 'MEDIUM', className: 'bg-blue-500/20 text-blue-400 border-primary/20' },
  P4: { label: 'LOW', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

export const ASSIGNEE_COLORS: Record<string, string> = {
  // Display names
  'Jamie Ludlow': 'bg-green-500/20 text-green-400',
  'Jamie': 'bg-green-500/20 text-green-400',
  'Casper': 'bg-primary/20 text-primary',
  'Developer': 'bg-blue-500/20 text-blue-400',
  'UI/UX Designer': 'bg-purple-500/20 text-purple-400',
  'QA Tester': 'bg-destructive/20 text-destructive',
  'Copywriter': 'bg-amber-500/20 text-amber-400',
  'Analyst': 'bg-cyan-500/20 text-cyan-400',
  'Manager': 'bg-muted-foreground/20 text-slate-400',
  'Trainer': 'bg-orange-500/20 text-orange-400',
  'Heartbeat': 'bg-pink-500/20 text-pink-400',
  // Paperclip / external roles
  'CEO': 'bg-emerald-500/20 text-emerald-400',
  'Engineer': 'bg-sky-500/20 text-sky-400',
  'Designer': 'bg-fuchsia-500/20 text-fuchsia-400',
  'QA': 'bg-rose-500/20 text-rose-400',
  // DB slugs (same colours)
  'jamie': 'bg-green-500/20 text-green-400',
  'casper': 'bg-primary/20 text-primary',
  'developer': 'bg-blue-500/20 text-blue-400',
  'ui-designer': 'bg-purple-500/20 text-purple-400',
  'qa-tester': 'bg-destructive/20 text-destructive',
  'copywriter': 'bg-amber-500/20 text-amber-400',
  'analyst': 'bg-cyan-500/20 text-cyan-400',
  'manager': 'bg-muted-foreground/20 text-slate-400',
  'trainer': 'bg-orange-500/20 text-orange-400',
  'heartbeat': 'bg-pink-500/20 text-pink-400',
};

/** Assignee name ↔ slug mappings — single source of truth */
export const NAME_TO_SLUG: Record<string, string> = {
  // Paperclip agent roles only
  'CEO': 'CEO',
  'Engineer': 'Engineer',
  'Designer': 'Designer',
  'QA': 'QA',
};

export const SLUG_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_TO_SLUG).map(([name, slug]) => [slug, name])
);

export function toSlug(nameOrSlug: string): string {
  if (NAME_TO_SLUG[nameOrSlug]) return NAME_TO_SLUG[nameOrSlug];
  if (SLUG_TO_NAME[nameOrSlug]) return nameOrSlug; // already a slug
  return nameOrSlug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function toDisplayName(slugOrName: string): string {
  return SLUG_TO_NAME[slugOrName] || slugOrName;
}

/** Get 2-character initials from a display name or slug */
export function getInitials(nameOrSlug: string): string {
  const name = toDisplayName(nameOrSlug);
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 1);
}

/** Normalise priority values — DB may have mixed formats like "HIGH", "CRITICAL" etc. */
export function normalisePriority(raw: string): 'P1' | 'P2' | 'P3' | 'P4' {
  if (!raw) return 'P3';
  const upper = raw.toUpperCase().trim();
  if (upper === 'P1' || upper === 'P2' || upper === 'P3' || upper === 'P4') return upper;
  const map: Record<string, 'P1' | 'P2' | 'P3' | 'P4'> = {
    CRITICAL: 'P1', URGENT: 'P1',
    HIGH: 'P2',
    MEDIUM: 'P3', NORMAL: 'P3', DEFAULT: 'P3',
    LOW: 'P4', MINOR: 'P4',
  };
  return map[upper] || 'P3';
}
