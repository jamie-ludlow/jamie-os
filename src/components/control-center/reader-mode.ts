export const READER_MODE_SLUGS = new Set([
  'share-export',
  'openclaw-complete-reference',
  'file-document-map',
  'source-of-truth-model',
  'memory-operating-model',
  'troubleshooting-baseline',
  'fixing-problems',
  'public-private-view-model',
  'maintenance-prompt-pack',
  'improvement-programme-status-matrix',
]);

export function isControlCenterReaderPath(pathname: string): boolean {
  const match = pathname.match(/^\/control-center\/([^/?#]+)/);
  if (!match) return false;
  return READER_MODE_SLUGS.has(match[1]);
}
