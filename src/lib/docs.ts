import { supabaseAdmin } from '@/lib/supabase';
import type { DocFile } from './types';

export async function getFileTree(): Promise<DocFile[]> {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('path, title, created_at, updated_at')
    .is('deleted_at', null)
    .order('path');

  if (error || !data) return [];

  // Build tree from flat paths
  const root: DocFile[] = [];
  const dirs = new Map<string, DocFile>();

  for (const doc of data) {
    const parts = doc.path.split('/');
    const fileName = parts[parts.length - 1];

    // Hide .keep placeholder files
    if (fileName === '.keep') {
      // Still create parent directories so empty folders show
      let currentPath = '';
      let parent: DocFile[] = root;
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        if (!dirs.has(currentPath)) {
          const dir: DocFile = {
            name: parts[i],
            path: currentPath,
            type: 'directory',
            children: [],
          };
          dirs.set(currentPath, dir);
          parent.push(dir);
        }
        parent = dirs.get(currentPath)!.children!;
      }
      continue;
    }

    // Ensure parent directories exist
    let currentPath = '';
    let parent: DocFile[] = root;
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      if (!dirs.has(currentPath)) {
        const dir: DocFile = {
          name: parts[i],
          path: currentPath,
          type: 'directory',
          children: [],
        };
        dirs.set(currentPath, dir);
        parent.push(dir);
      }
      parent = dirs.get(currentPath)!.children!;
    }

    parent.push({
      name: fileName.endsWith('.md') ? fileName : `${fileName}.md`,
      path: doc.path,
      type: 'file',
      title: doc.title,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    });
  }

  // Sort: directories first, then alphabetically
  // Also filter out empty directories (Issue #3)
  const sortAndFilterTree = (items: DocFile[]): DocFile[] => {
    // First, recursively process children
    for (const item of items) {
      if (item.children) {
        item.children = sortAndFilterTree(item.children);
      }
    }

    const filtered = items;

    // Sort: directories first, then alphabetically
    filtered.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  };

  return sortAndFilterTree(root);
}

export async function getDoc(filePath: string): Promise<{
  id: string;
  path: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
} | null> {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id, path, title, content, category, created_at, updated_at')
    .eq('path', filePath)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;
  return data;
}

export async function writeDoc(filePath: string, content: string, explicitTitle?: string): Promise<boolean> {
  // Use explicit title if provided, otherwise extract from content heading, otherwise preserve existing title
  let title = explicitTitle;
  if (!title) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].replace(/[*_`]/g, '').trim();
    } else {
      // Check if doc already exists with a title — don't overwrite with slug
      const { data: existing } = await supabaseAdmin
        .from('documents')
        .select('title')
        .eq('path', filePath)
        .maybeSingle();
      title = existing?.title || filePath.split('/').pop()?.replace('.md', '') || filePath;
    }
  }

  // Determine category from path
  const category = filePath.includes('/') ? filePath.split('/')[0] : 'general';

  const { error } = await supabaseAdmin
    .from('documents')
    .upsert(
      { path: filePath, title, content, category, updated_at: new Date().toISOString() },
      { onConflict: 'path' }
    );

  return !error;
}

export async function searchDocs(query: string): Promise<{ path: string; name: string; snippet: string }[]> {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('path, title, content')
    .is('deleted_at', null)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

  if (error || !data) return [];

  // Strip HTML tags from content for clean snippets
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

  return data.map((doc) => {
    const plainContent = stripHtml(doc.content);
    const lowerContent = plainContent.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const idx = lowerContent.indexOf(lowerQuery);
    const start = Math.max(0, idx - 50);
    const end = Math.min(plainContent.length, idx + query.length + 50);
    const snippet = idx >= 0
      ? (start > 0 ? '...' : '') + plainContent.slice(start, end) + (end < plainContent.length ? '...' : '')
      : doc.content.slice(0, 100) + (doc.content.length > 100 ? '...' : '');

    const fallbackName = doc.path.split('/').pop() || doc.path;
    const name = doc.title || fallbackName.replace('.md', '').split(/[-_]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { path: doc.path, name, snippet };
  });
}
