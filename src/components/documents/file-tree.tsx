'use client';

import { useState, useRef, useEffect } from 'react';
import type { DocFile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ChevronRight, FileText, Folder, Pencil, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface FileTreeProps {
  files: DocFile[];
  onSelect: (path: string) => void;
  selected?: string;
  onRefresh?: () => void;
  onCreateInFolder?: (folderPath: string) => void;
  onCreateFolderIn?: (folderPath: string) => void;
  onDeleteFile?: (path: string) => void;
}

interface FileTreeItemProps {
  item: DocFile;
  onSelect: (path: string) => void;
  selected?: string;
  depth: number;
  onRefresh?: () => void;
  onCreateInFolder?: (folderPath: string) => void;
  onCreateFolderIn?: (folderPath: string) => void;
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

// Helper: Convert folder name to Title Case
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

function FileTreeItem({ item, onSelect, selected, depth, onRefresh, onCreateInFolder, onCreateFolderIn, onDeleteFile }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paddingLeft = depth * 16 + 8;

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
      // Get doc info
      const res = await fetch(`/api/documents?path=${encodeURIComponent(item.path)}`);
      if (!res.ok) throw new Error('Failed to fetch document');
      const doc = await res.json();
      
      // Update path
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
      // Delete folder
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

  const handleMove = async (targetFolder: string) => {
    if (item.type !== 'file') return;
    
    try {
      const res = await fetch(`/api/documents?path=${encodeURIComponent(item.path)}`);
      if (!res.ok) throw new Error('Failed to fetch document');
      const doc = await res.json();
      
      const fileName = item.path.split('/').pop();
      const newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;
      
      const patchRes = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath }),
      });
      
      if (!patchRes.ok) throw new Error('Failed to move');
      
      toast.success('Document moved');
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to move document');
      console.error(err);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (item.type === 'file') {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.path);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (item.type === 'directory') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (item.type !== 'directory') return;
    
    const sourcePath = e.dataTransfer.getData('text/plain');
    if (!sourcePath || sourcePath === item.path) return;
    
    try {
      const res = await fetch(`/api/documents?path=${encodeURIComponent(sourcePath)}`);
      if (!res.ok) throw new Error('Failed to fetch document');
      const doc = await res.json();
      
      const fileName = sourcePath.split('/').pop();
      const newPath = `${item.path}/${fileName}`;
      
      const patchRes = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath }),
      });
      
      if (!patchRes.ok) throw new Error('Failed to move');
      
      // Preserve source folder if it would become empty (creates .keep placeholder — silently ignored if folder still has files)
      const sourceFolder = sourcePath.includes('/') ? sourcePath.substring(0, sourcePath.lastIndexOf('/')) : '';
      if (sourceFolder) {
        await fetch('/api/documents/folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath: sourceFolder }),
        }).catch(() => {});
      }

      toast.success('Document moved');
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to move document');
      console.error(err);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const displayName = item.type === 'directory' 
      ? toTitleCase(item.name) 
      : (item.title || item.name.replace('.md', ''));
    setNewName(displayName);
    setIsRenaming(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Clear any pending timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    if (item.type === 'directory') {
      setExpanded(!expanded);
    } else {
      // Single click on file - select it
      onSelect(item.path);
    }
  };

  if (item.type === 'directory') {
    const fileCount = item.children?.filter(c => c.type === 'file').length || 0;
    const displayName = toTitleCase(item.name);
    
    if (isRenaming) {
      return (
        <div style={{ paddingLeft: `${paddingLeft}px` }} className="py-1.5">
          <input
            ref={renameInputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameFolder();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onBlur={handleRenameFolder}
            className="w-full px-2 py-1 text-[13px] border border-primary rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      );
    }

    return (
      <div>
        <button
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ x: e.clientX, y: e.clientY, item });
          }}
          onClick={handleClick}
          
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-left transition-colors relative',
            'hover:bg-muted/40 text-muted-foreground hover:text-foreground',
            isDragOver && 'bg-primary/20 border-primary'
          )}
          style={{ paddingLeft: `${paddingLeft}px`, paddingRight: '2rem' }}
        >
          <ChevronRight className={cn(
            'h-3.5 w-3.5 transition-transform shrink-0',
            expanded && 'rotate-90'
          )} />
          <Folder className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium truncate flex-1 text-left">{displayName}</span>
          <span className="text-[11px] text-muted-foreground/60 absolute right-2 top-1/2 -translate-y-1/2 min-w-[1rem] text-right">
            {fileCount > 0 ? fileCount : ''}
          </span>
        </button>
        {expanded && item.children?.map((child) => (
          <FileTreeItem
            key={child.path}
            item={child}
            onSelect={onSelect}
            selected={selected}
            depth={depth + 1}
            onRefresh={onRefresh}
            onCreateInFolder={onCreateInFolder}
            onCreateFolderIn={onCreateFolderIn}
            onDeleteFile={onDeleteFile}
          />
        ))}
        
        {/* Context Menu */}
        {contextMenu && contextMenu.item === item && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onRename={() => {
              setNewName(toTitleCase(item.name));
              setIsRenaming(true);
              setContextMenu(null);
            }}
            onNewDocument={() => {
              onCreateInFolder?.(item.path);
              setContextMenu(null);
            }}
            onNewFolder={() => {
              onCreateFolderIn?.(item.path);
              setContextMenu(null);
            }}
            onDelete={() => {
              const itemCount = item.children?.filter(c => c.type === 'file').length || 0;
              setConfirmDialog({
                message: `Delete folder "${displayName}"?`,
                description: itemCount > 0 
                  ? `This will permanently delete ${itemCount} ${itemCount === 1 ? 'document' : 'documents'}.`
                  : undefined,
                onConfirm: handleDelete,
              });
              setContextMenu(null);
            }}
            isFolder={true}
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
      </div>
    );
  }

  // File item
  const displayName = item.title || item.name.replace('.md', '');

  if (isRenaming) {
    return (
      <div style={{ paddingLeft: `${paddingLeft + 20}px` }} className="py-1">
        <input
          ref={renameInputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameFile();
            if (e.key === 'Escape') setIsRenaming(false);
          }}
          onBlur={handleRenameFile}
          className="w-full px-2 py-1 text-[13px] border border-primary rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    );
  }

  return (
    <>
      <button
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY, item });
        }}
        onClick={handleClick}
        
        draggable
        onDragStart={handleDragStart}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-left transition-colors',
          selected === item.path 
            ? 'bg-primary/10 text-primary border-l-2 border-l-primary' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border-l-2 border-l-transparent'
        )}
        style={{ paddingLeft: `${paddingLeft + 20}px` }}
      >
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate flex-1 text-left">{displayName}</span>
      </button>
      
      {/* Context Menu */}
      {contextMenu && contextMenu.item === item && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={() => {
            setNewName(item.title || item.name.replace('.md', ''));
            setIsRenaming(true);
            setContextMenu(null);
          }}
          onMove={() => {
            toast.info('Use drag & drop to move documents');
            setContextMenu(null);
          }}
          onDelete={() => {
            setConfirmDialog({
              message: `Delete "${displayName}"?`,
              description: 'This action cannot be undone.',
              onConfirm: handleDelete,
            });
            setContextMenu(null);
          }}
          isFolder={false}
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
  onMove,
  onDelete,
  onNewDocument,
  onNewFolder,
  isFolder,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  onNewDocument?: () => void;
  onNewFolder?: () => void;
  isFolder: boolean;
}) {
  return (
    <div
      className="fixed z-50 min-w-[160px] bg-card border border-border/20 rounded-lg shadow-lg py-1"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {isFolder && onNewDocument && (
        <button
          onClick={onNewDocument}
          className="w-full px-3 py-1.5 text-[13px] text-left hover:bg-muted/40 transition-colors text-foreground flex items-center gap-2"
        >
          <FileText className="h-3.5 w-3.5" />
          New document
        </button>
      )}
      {isFolder && onNewFolder && (
        <button
          onClick={onNewFolder}
          className="w-full px-3 py-1.5 text-[13px] text-left hover:bg-muted/40 transition-colors text-foreground flex items-center gap-2"
        >
          <Folder className="h-3.5 w-3.5" />
          New folder
        </button>
      )}
      {onRename && (
        <button
          onClick={onRename}
          className="w-full px-3 py-1.5 text-[13px] text-left hover:bg-muted/40 transition-colors text-foreground flex items-center gap-2"
        >
          <Pencil className="h-3.5 w-3.5" />
          Rename
        </button>
      )}
      {!isFolder && onMove && (
        <button
          onClick={onMove}
          className="w-full px-3 py-1.5 text-[13px] text-left hover:bg-muted/40 transition-colors text-foreground flex items-center gap-2"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          Move to...
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

export function FileTree({ files, onSelect, selected, onRefresh, onCreateInFolder, onCreateFolderIn, onDeleteFile }: FileTreeProps) {
  const [rootDragOver, setRootDragOver] = useState(false);

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setRootDragOver(false);
    
    const sourcePath = e.dataTransfer.getData('text/plain');
    if (!sourcePath || !sourcePath.includes('/')) return; // Already at root
    
    try {
      const res = await fetch(`/api/documents?path=${encodeURIComponent(sourcePath)}`);
      if (!res.ok) throw new Error('Failed to fetch document');
      const doc = await res.json();
      
      const fileName = sourcePath.split('/').pop();
      const newPath = fileName;
      
      const patchRes = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, category: 'general' }),
      });
      
      if (!patchRes.ok) throw new Error('Failed to move');

      // Preserve source folder
      const sourceFolder = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
      if (sourceFolder) {
        await fetch('/api/documents/folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath: sourceFolder }),
        }).catch(() => {});
      }
      
      toast.success('Moved to root');
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to move document');
      console.error(err);
    }
  };

  return (
    <div 
      className="space-y-0.5 min-h-full"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // Only show root drop if dragging over empty space (not a folder)
        if (e.target === e.currentTarget) setRootDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.target === e.currentTarget) setRootDragOver(false);
      }}
      onDrop={handleRootDrop}
    >
      {files.map((item) => (
        <FileTreeItem 
          key={item.path} 
          item={item} 
          onSelect={onSelect} 
          selected={selected} 
          depth={0}
          onRefresh={onRefresh}
          onCreateInFolder={onCreateInFolder}
          onCreateFolderIn={onCreateFolderIn}
          onDeleteFile={onDeleteFile}
        />
      ))}
      {rootDragOver && (
        <div className="mt-2 rounded-md border-2 border-dashed border-primary/40 bg-primary/5 p-3 text-center text-[11px] text-primary/60">
          Drop here to move to root
        </div>
      )}
    </div>
  );
}
