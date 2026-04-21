import type { PaperclipCatalog } from "@/lib/types";

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCatalog(metadata?: Record<string, unknown> | null): PaperclipCatalog | null {
  if (!metadata || !isRecord(metadata)) return null;
  const raw = metadata.paperclip_catalog;
  if (!isRecord(raw)) return null;
  return raw as unknown as PaperclipCatalog;
}

export function getPaperclipAssigneeOptions(args: {
  projectId?: string | null;
  metadata?: Record<string, unknown> | null;
}): string[] {
  const catalog = parseCatalog(args.metadata);
  const base = ['Jamie'];

  if (!catalog || !args.projectId) return base;

  const mapping = catalog.projectMappings?.[args.projectId];
  if (!mapping) return base;

  return unique(['Jamie', ...(mapping.availableRoles || [])]);
}
