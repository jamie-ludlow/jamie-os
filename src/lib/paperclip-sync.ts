import type { Task } from "@/lib/types";

export type PaperclipSyncState = 'local' | 'draft' | 'synced' | 'failed';

type PaperclipTaskLike = Pick<
  Task,
  'external_source' | 'external_id' | 'external_url' | 'external_metadata' | 'external_updated_at'
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasPaperclipMarker(task: PaperclipTaskLike): boolean {
  const metadata = task.external_metadata;
  if (metadata && typeof metadata === 'object') {
    const source = (metadata as Record<string, unknown>).source;
    if (source === 'paperclip') return true;

    const syncState = (metadata as Record<string, unknown>).sync_state;
    if (syncState === 'draft' || syncState === 'synced') return true;
  }

  return Boolean(task.external_id || task.external_url || task.external_updated_at);
}

export function getPaperclipSyncState(task: PaperclipTaskLike | null | undefined): PaperclipSyncState | null {
  if (!task) return null;
  const metadata = task.external_metadata;
  if (isRecord(metadata)) {
    const syncState = metadata.sync_state;
    if (syncState === 'failed' || syncState === 'sync_failed') return 'failed';
    if (syncState === 'draft') return 'draft';
    if (syncState === 'synced') return 'synced';
    if (syncState === 'local') return 'local';
  }
  if (task.external_source === 'paperclip') return 'synced';
  if (hasPaperclipMarker(task)) return 'draft';
  return null;
}

export function getPaperclipIdentifier(task: PaperclipTaskLike | null | undefined): string | null {
  if (!task) return null;
  const metadata = task.external_metadata;
  if (isRecord(metadata)) {
    const identifier = metadata.paperclipIdentifier;
    if (typeof identifier === 'string' && identifier.trim()) return identifier.trim();
  }
  return null;
}
