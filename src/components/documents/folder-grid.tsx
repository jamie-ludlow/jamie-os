'use client';

import { useState, useRef, useEffect } from 'react';
import { Folder, FileText, Pencil, Trash2 } from 'lucide-react';
import type { DocFile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

interface FolderGridProps {
  items: DocFile[];
  viewMode: 'grid' | 'list';
  onNavigate: (path: string) => void;
  onSelectFile: (path: string) => void;
  onRefresh?: () => void;
  onDeleteFile?: (path: string) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: DocFile;
}

interface ConfirmDialogState {
  message: string;
  description?: string;
  onConfirm: () => void;
}

const ACRONYM_MAP: Record<string, string> = {
  sop: 'SOP', sops: 'SOPs', mc: 'MC', api: 'API', ux: 'UX', ui: 'UI', ai: 'AI',
  uk: 'UK', usa: 'USA', seo: 'SEO', crm: 'CRM', csv: 'CSV', pdf: 'PDF',
  html: 'HTML', css: 'CSS', qa: 'QA',
};

function toTitleCase(name: string): string {
  return name
    .split(/[-_]/)
    .map(word => ACRONYM_MAP[word.toLowerCase()] || (word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function GridItem({ 
  item, 
  onNavigate, 
  onSelectFile,
  onRefresh,
  onDeleteFile,
}: { 
  item: DocFile; 
  onNavigate: (path: string) => void; 
  onSelectFile: (path: string) => void;
  onRefresh?: () => void;
  onDeleteFile?: (path: string) => void;
}) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  const isFolder = item.type === 'directory';
  const displayName = isFolder 
    ? toTitleCase(item.name) 
    : (item.title || item.name.replace('.md', ''));
  const fileCount = isFolder && item.children 
    ? item.children.filter(c => c.type === 'file').length 
    : 0;

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const handleRenameFile = async () => {
    if (!newName.trim()) {
      setIsRenaming(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/documents?path=${encodeURIComponent(item.path)}`);
      if (!res.ok) throw new Error('Failed to fetch document');
      const doc = await res.json();
      
      const parts = item.path.split('/');
      parts[parts.length - 1] = newName.endsWith('.md') ? newName : `${newName}.md`;
      const newPath = parts.join('/');
      
      const patchRes = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, title: newName.replace('.md', '') }),
      });
      
      if (!patchRes.ok) throw new Error('Failed to rename');
      
      toast.success('Document renamed');
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to rename document');
      console.error(err);
    }
    
    setIsRenaming(false);
  };

  const handleRenameFolder = async () => {
    if (!newName.trim()) {
      setIsRenaming(false);
      return;
    }

    try {
      const parts = item.path.split('/');
      parts[parts.length - 1] = toSlug(newName);
      const newPath = parts.join('/');

      const res = await fetch('/api/documents/rename-folder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: item.path, newPath }),
      });

      if (!res.ok) throw new Error('Failed to rename folder');

      toast.success('Folder renamed');
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to rename folder');
      console.error(err);
    }

    setIsRenaming(false);
  };

  const handleDelete = async () => {
    if (item.type === 'file') {
      try {
        const res = await fetch(`/api/documents?path=${encodeURIComponent(item.path)}`);
        if (!res.ok) throw new Error('Failed to fetch document');
        const doc = await res.json();
        
        const deleteRes = await fetch(`/api/documents/${doc.id}`, {
          method: 'DELETE',
        });
        
        if (!deleteRes.ok) throw new Error('Failed to delete');
        
        toast.success('Document deleted');
        onDeleteFile ? onDeleteFile(item.path) : onRefresh?.();
      } catch (err) {
        toast.error('Failed to delete document');
        console.error(err);
      }
    } else {
      try {
        const res = await fetch(`/api/documents/folder?path=${encodeURIComponent(item.path)}`, {
          method: 'DELETE',
        });

        if (!res.ok) throw new Error('Failed to delete folder');

        const data = await res.json();
        toast.success(`Folder deleted (${data.deletedCount} documents)`);
        onDeleteFile ? onDeleteFile(item.path) : onRefresh?.();
      } catch (err) {
        toast.error('Failed to delete folder');
        console.error(err);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    clickCountRef.current += 1;

    // Clear any pending timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // Set a timeout to reset the click count
    clickTimeoutRef.current = setTimeout(() => {
      if (clickCountRef.current === 1) {
        // Single click - just select (do nothing for now in grid view)
      } else if (clickCountRef.current === 2) {
        // Double click
        if (isFolder) {
          onNavigate(item.path);
        } else {
          onSelectFile(item.path);
        }
      }
      clickCountRef.current = 0;
    }, 300);
  };

  const handleNameDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rawName = isFolder ? toTitleCase(item.name) : (item.title || item.name.replace('.md', ''));
    setNewName(rawName);
    setIsRenaming(true);
  };

  if (isRenaming) {
    return (
      <div className="rounded-lg border border-primary bg-card p-4">
        <input
          ref={renameInputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (isFolder) {
                handleRenameFolder();
              } else {
                handleRenameFile();
              }
            }
            if (e.key === 'Escape') setIsRenaming(false);
          }}
          onBlur={() => {
            if (isFolder) {
              handleRenameFolder();
            } else {
              handleRenameFile();
            }
          }}
          className="w-full px-2 py-1 text-[13px] border-0 bg-transparent focus:outline-none"
        />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY, item });
        }}
        className={cn(
          'group relative flex items-center gap-3 rounded-lg border border-border/20 bg-card p-3',
          'hover:bg-muted/40 transition-all text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
        )}
      >
        {isFolder ? (
          <Folder className="h-8 w-8 text-muted-foreground shrink-0" />
        ) : (
          <FileText className="h-8 w-8 text-primary shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">
            {displayName}
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            {isFolder 
              ? `${fileCount} ${fileCount === 1 ? 'item' : 'items'}`
              : 'Document'
            }
          </p>
        </div>
      </button>

      {/* Context Menu */}
      {contextMenu && contextMenu.item === item && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={() => {
            const rawName = isFolder ? toTitleCase(item.name) : (item.title || item.name.replace('.md', ''));
            setNewName(rawName);
            setIsRenaming(true);
            setContextMenu(null);
          }}
          onDelete={() => {
            if (isFolder) {
              const itemCount = item.children?.filter(c => c.type === 'file').length || 0;
              setConfirmDialog({
                message: `Delete folder "${displayName}"?`,
                description: itemCount > 0 
                  ? `This will permanently delete ${itemCount} ${itemCount === 1 ? 'document' : 'documents'}.`
                  : undefined,
                onConfirm: handleDelete,
              });
            } else {
              setConfirmDialog({
                message: `Delete "${displayName}"?`,
                description: 'This action cannot be undone.',
                onConfirm: handleDelete,
              });
            }
            setContextMenu(null);
          }}
          isFolder={isFolder}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          description={confirmDialog.description}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </>
  );
}

function ListItem({ 
  item, 
  onNavigate, 
  onSelectFile,
  onRefresh,
  onDeleteFile,
}: { 
  item: DocFile; 
  onNavigate: (path: string) => void; 
  onSelectFile: (path: string) => void;
  onRefresh?: () => void;
  onDeleteFile?: (path: string) => void;
}) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  const isFolder = item.type === 'directory';
  const displayName = isFolder 
    ? toTitleCase(item.name) 
    : (item.title || item.name.replace('.md', ''));
  const fileCount = isFolder && item.children 
    ? item.children.filter(c => c.type === 'file').length 
    : 0;

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const handleRenameFile = async () => {
    if (!newName.trim()) {
      setIsRenaming(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/documents?path=${encodeURIComponent(item.path)}`);
      if (!res.ok) throw new Error('Failed to fetch document');
      const doc = await res.json();
      
      const parts = item.path.split('/');
      parts[parts.length - 1] = newName.endsWith('.md') ? newName : `${newName}.md`;
      const newPath = parts.join('/');
      
      const patchRes = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, title: newName.replace('.md', '') }),
      });
      
      if (!patchRes.ok) throw new Error('Failed to rename');
      
      toast.success('Document renamed');
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to rename document');
      console.error(err);
    }
    
    setIsRenaming(false);
  };

  const handleRenameFolder = async () => {
    if (!newName.trim()) {
      setIsRenaming(false);
      return;
    }

    try {
      const parts = item.path.split('/');
      parts[parts.length - 1] = toSlug(newName);
      const newPath = parts.join('/');

      const res = await fetch('/api/documents/rename-folder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: item.path, newPath }),
      });

      if (!res.ok) throw new Error('Failed to rename folder');

      toast.success('Folder renamed');
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to rename folder');
      console.error(err);
    }

    setIsRenaming(false);
  };

  const handleDelete = async () => {
    if (item.type === 'file') {
      try {
        const res = await fetch(`/api/documents?path=${encodeURIComponent(item.path)}`);
        if (!res.ok) throw new Error('Failed to fetch document');
        const doc = await res.json();
        
        const deleteRes = await fetch(`/api/documents/${doc.id}`, {
          method: 'DELETE',
        });
        
        if (!deleteRes.ok) throw new Error('Failed to delete');
        
        toast.success('Document deleted');
        onDeleteFile ? onDeleteFile(item.path) : onRefresh?.();
      } catch (err) {
        toast.error('Failed to delete document');
        console.error(err);
      }
    } else {
      try {
        const res = await fetch(`/api/documents/folder?path=${encodeURIComponent(item.path)}`, {
          method: 'DELETE',
        });

        if (!res.ok) throw new Error('Failed to delete folder');

        const data = await res.json();
        toast.success(`Folder deleted (${data.deletedCount} documents)`);
        onDeleteFile ? onDeleteFile(item.path) : onRefresh?.();
      } catch (err) {
        toast.error('Failed to delete folder');
        console.error(err);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    clickCountRef.current += 1;

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      if (clickCountRef.current === 2) {
        if (isFolder) {
          onNavigate(item.path);
        } else {
          onSelectFile(item.path);
        }
      }
      clickCountRef.current = 0;
    }, 300);
  };

  const handleNameDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rawName = isFolder ? toTitleCase(item.name) : (item.title || item.name.replace('.md', ''));
    setNewName(rawName);
    setIsRenaming(true);
  };

  if (isRenaming) {
    return (
      <div className="rounded-md p-3 border border-primary bg-card">
        <input
          ref={renameInputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (isFolder) {
                handleRenameFolder();
              } else {
                handleRenameFile();
              }
            }
            if (e.key === 'Escape') setIsRenaming(false);
          }}
          onBlur={() => {
            if (isFolder) {
              handleRenameFolder();
            } else {
              handleRenameFile();
            }
          }}
          className="w-full px-0 py-0 text-[13px] border-0 bg-transparent focus:outline-none"
        />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY, item });
        }}
        className={cn(
          'group flex items-center gap-3 w-full rounded-md p-3 text-left',
          'hover:bg-muted/40 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
        )}
      >
        {isFolder ? (
          <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : (
          <FileText className="h-5 w-5 text-primary shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p 
            className="text-[13px] font-medium text-foreground truncate"
            
          >
            {displayName}
          </p>
        </div>
        <div className="flex items-center gap-6 text-[11px] text-muted-foreground/60 shrink-0">
          {!isFolder && item.created_at && (
            <span className="w-[70px] text-right" title={`Created ${new Date(item.created_at).toLocaleString('en-GB')}`}>
              {formatRelativeDate(item.created_at)}
            </span>
          )}
          {!isFolder && item.updated_at && (
            <span className="w-[70px] text-right" title={`Edited ${new Date(item.updated_at).toLocaleString('en-GB')}`}>
              {formatRelativeDate(item.updated_at)}
            </span>
          )}
          <span className="w-[70px] text-right">
            {isFolder 
              ? `${fileCount} ${fileCount === 1 ? 'item' : 'items'}`
              : 'Document'
            }
          </span>
        </div>
      </button>

      {/* Context Menu */}
      {contextMenu && contextMenu.item === item && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={() => {
            const rawName = isFolder ? toTitleCase(item.name) : (item.title || item.name.replace('.md', ''));
            setNewName(rawName);
            setIsRenaming(true);
            setContextMenu(null);
          }}
          onDelete={() => {
            if (isFolder) {
              const itemCount = item.children?.filter(c => c.type === 'file').length || 0;
              setConfirmDialog({
                message: `Delete folder "${displayName}"?`,
                description: itemCount > 0 
                  ? `This will permanently delete ${itemCount} ${itemCount === 1 ? 'document' : 'documents'}.`
                  : undefined,
                onConfirm: handleDelete,
              });
            } else {
              setConfirmDialog({
                message: `Delete "${displayName}"?`,
                description: 'This action cannot be undone.',
                onConfirm: handleDelete,
              });
            }
            setContextMenu(null);
          }}
          isFolder={isFolder}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          description={confirmDialog.description}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </>
  );
}

function ContextMenu({
  x,
  y,
  onClose,
  onRename,
  onDelete,
  isFolder,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  isFolder: boolean;
}) {
  return (
    <div
      className="fixed z-50 min-w-[160px] bg-card border border-border/20 rounded-lg shadow-lg py-1"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {onRename && (
        <button
          onClick={onRename}
          className="w-full px-3 py-1.5 text-[13px] text-left hover:bg-muted/40 transition-colors text-foreground flex items-center gap-2"
        >
          <Pencil className="h-3.5 w-3.5" />
          Rename
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="w-full px-3 py-1.5 text-[13px] text-left hover:bg-muted/40 transition-colors text-destructive flex items-center gap-2"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      )}
    </div>
  );
}

function ConfirmDialog({
  message,
  description,
  onConfirm,
  onCancel,
}: {
  message: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" 
      onClick={onCancel}
    >
      <div 
        className="bg-card border border-border/20 rounded-lg p-5 max-w-sm w-full mx-4 shadow-lg" 
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[13px] font-semibold text-foreground mb-2">{message}</h3>
        {description && (
          <p className="text-[11px] text-muted-foreground mb-4">{description}</p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="h-8 px-4 text-[11px] rounded-md bg-secondary hover:bg-muted/40 transition-colors text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="h-8 px-4 text-[11px] rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function FolderGrid({ items, viewMode, onNavigate, onSelectFile, onRefresh, onDeleteFile }: FolderGridProps) {
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'edited'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (col: 'name' | 'created' | 'edited') => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir(col === 'name' ? 'asc' : 'desc');
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    // Directories always first
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;

    let cmp = 0;
    if (sortBy === 'name') {
      const nameA = a.title || a.name;
      const nameB = b.title || b.name;
      cmp = nameA.localeCompare(nameB);
    } else if (sortBy === 'created') {
      cmp = (a.created_at || '').localeCompare(b.created_at || '');
    } else {
      cmp = (a.updated_at || '').localeCompare(b.updated_at || '');
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {sortedItems.map((item) => (
          <GridItem 
            key={item.path} 
            item={item} 
            onNavigate={onNavigate} 
            onSelectFile={onSelectFile}
            onRefresh={onRefresh}
            onDeleteFile={onDeleteFile}
          />
        ))}
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="flex items-center gap-3 px-3 py-2 text-[11px] text-muted-foreground/60 border-b border-border/20 mb-1">
        <div className="w-5 shrink-0" />
        <button onClick={() => toggleSort('name')} className={cn('flex-1 text-left hover:text-foreground transition-colors', sortBy === 'name' && 'text-foreground font-medium')}>
          Name {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
        </button>
        <div className="flex items-center gap-6 shrink-0">
          <button onClick={() => toggleSort('created')} className={cn('w-[70px] text-right hover:text-foreground transition-colors', sortBy === 'created' && 'text-foreground font-medium')}>
            Created {sortBy === 'created' && (sortDir === 'asc' ? '↑' : '↓')}
          </button>
          <button onClick={() => toggleSort('edited')} className={cn('w-[70px] text-right hover:text-foreground transition-colors', sortBy === 'edited' && 'text-foreground font-medium')}>
            Edited {sortBy === 'edited' && (sortDir === 'asc' ? '↑' : '↓')}
          </button>
          <span className="w-[70px] text-right">Type</span>
        </div>
      </div>
      <div className="space-y-0.5">
      {sortedItems.map((item) => (
        <ListItem 
          key={item.path} 
          item={item} 
          onNavigate={onNavigate} 
          onSelectFile={onSelectFile}
          onRefresh={onRefresh}
          onDeleteFile={onDeleteFile}
        />
      ))}
      </div>
    </div>
  );
}
