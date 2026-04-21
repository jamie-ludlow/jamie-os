'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { DocFile } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { FileTree } from '@/components/documents/file-tree';
import { UploadModal } from '@/components/documents/upload-modal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Breadcrumbs } from '@/components/documents/breadcrumbs';
import { FolderGrid } from '@/components/documents/folder-grid';
import { 
  CalendarDays, 
  Clock, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Image, 
  File, 
  Plus, 
  Search, 
  Upload,
  Folder as FolderIcon,
  Brain,
  LayoutGrid,
  List,
  Trash2,
  RotateCcw,
  X,
} from 'lucide-react';
import { DocumentsPageSkeleton } from '@/components/ui/skeleton-loaders';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const TaskDescriptionEditor = dynamic(
  () => import('@/components/board/task-description-editor').then(mod => ({ default: mod.TaskDescriptionEditor })),
  { ssr: false }
);

const DEFAULT_TITLE = 'Untitled document';

type DocumentRecord = {
  id: string;
  path: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
  type?: string;
};

type UploadedFile = {
  id: string;
  path: string;
  title: string;
  file_url: string;
  file_size: number;
  file_type: string;
  original_name: string;
  created_at: string;
  updated_at: string;
};

type BrainFile = {
  name: string;
  path: string;
  content: string;
  size: number;
  modifiedAt: string;
  category: 'core' | 'workflows' | 'memory' | 'research' | 'other';
};

type Tab = 'documents' | 'brain' | 'trash';

type TrashItem = {
  id: string;
  path: string;
  title: string;
  category: string;
  deleted_at: string;
  created_at: string;
  updated_at: string;
};

function parseFileMetadata(doc: DocumentRecord): UploadedFile | null {
  if (doc.type !== 'file') return null;
  try {
    const meta = JSON.parse(doc.content);
    return {
      id: doc.id,
      path: doc.path,
      title: doc.title,
      file_url: meta.file_url,
      file_size: meta.file_size,
      file_type: meta.file_type,
      original_name: meta.original_name || doc.title,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  } catch {
    return null;
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
    case 'jpg':
    case 'jpeg':
      return <Image className="h-5 w-5 text-status-success" />;
    case 'pdf':
      return <FileText className="h-5 w-5 text-destructive" />;
    case 'csv':
      return <FileSpreadsheet className="h-5 w-5 text-status-success" />;
    case 'md':
    case 'txt':
      return <FileText className="h-5 w-5 text-primary" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getCategoryLabel(category: BrainFile['category']): string {
  const labels: Record<BrainFile['category'], string> = {
    core: 'Core',
    workflows: 'Workflows',
    memory: 'Memory',
    research: 'Research',
    other: 'Other',
  };
  return labels[category];
}

export function DocumentsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  
  // Document state
  const [files, setFiles] = useState<DocFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftPath, setDraftPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ path: string; name: string; snippet: string }[]>([]);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingFolderInPath, setCreatingFolderInPath] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'document' | 'meeting'>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [areaContextMenu, setAreaContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Folder navigation state
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('documentsViewMode') as 'grid' | 'list') || 'grid';
    }
    return 'grid';
  });
  
  // Brain state
  const [brainFiles, setBrainFiles] = useState<BrainFile[]>([]);
  const [selectedBrainFile, setSelectedBrainFile] = useState<BrainFile | null>(null);
  const [brainLoading, setBrainLoading] = useState(false);
  
  // Trash state
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const titleSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectedPathRef = useRef<string>('');
  const draftPathRef = useRef(draftPath);
  const draftTitleRef = useRef(draftTitle);
  const lastSaved = useRef(draftContent);

  // Update refs when values change
  draftPathRef.current = draftPath;
  draftTitleRef.current = draftTitle;

  const loadFiles = useCallback(async () => {
    const res = await fetch('/api/documents');
    setFiles(await res.json());
    setLoading(false);
  }, []);

  const loadUploadedFiles = useCallback(async () => {
    const res = await fetch('/api/documents?type=file');
    if (!res.ok) return;
    const data: DocumentRecord[] = await res.json();
    const parsed = data.map(parseFileMetadata).filter(Boolean) as UploadedFile[];
    setUploadedFiles(parsed);
  }, []);

  const loadBrainFiles = useCallback(async () => {
    setBrainLoading(true);
    try {
      const res = await fetch('/api/casper-brain');
      if (!res.ok) throw new Error('Failed to load brain files');
      const data = await res.json();
      setBrainFiles(data);
    } catch (err) {
      toast.error('Failed to load Casper\'s Brain');
      console.error(err);
    } finally {
      setBrainLoading(false);
    }
  }, []);

  const loadTrash = useCallback(async () => {
    setTrashLoading(true);
    try {
      const res = await fetch('/api/documents/trash');
      if (!res.ok) throw new Error('Failed to load trash');
      setTrashItems(await res.json());
    } catch {
      toast.error('Failed to load trash');
    } finally {
      setTrashLoading(false);
    }
  }, []);

  // Load brain files when switching to brain tab
  useEffect(() => {
    if (activeTab === 'brain' && brainFiles.length === 0) {
      loadBrainFiles();
    }
  }, [activeTab, brainFiles.length, loadBrainFiles]);

  // Load trash when switching to trash tab
  useEffect(() => {
    if (activeTab === 'trash') {
      loadTrash();
    }
  }, [activeTab, loadTrash]);

  const gridRef = useRef<HTMLDivElement>(null);
  const [panelsCanScroll, setPanelsCanScroll] = useState(false);

  // Page-first scroll: only allow panel scrolling once header is scrolled away
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    
    const checkScroll = () => {
      const grid = gridRef.current;
      if (!grid) return;
      const gridRect = grid.getBoundingClientRect();
      // Topbar is sticky h-12 (48px) + content padding ~16px = ~64px
      // Allow panel scroll once grid is near the top (below topbar + small margin)
      setPanelsCanScroll(gridRect.top <= 80);
    };
    
    main.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
    return () => main.removeEventListener('scroll', checkScroll);
  }, []);

  // Save viewMode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('documentsViewMode', viewMode);
    }
  }, [viewMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K → Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder="Search documents..."]')?.focus();
      }
      // Cmd+N → New document
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && activeTab === 'documents') {
        e.preventDefault();
        // Inline the logic to avoid dependency issues
        setIsCreating(true);
        setDoc(null);
        setSelectedPath('');
        setDraftTitle(DEFAULT_TITLE);
        setDraftContent('');
        const basePath = currentFolder ? `${currentFolder}/` : '';
        setDraftPath(`${basePath}new-document.md`);
        router.replace('/documents');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, currentFolder, router]);

  useEffect(() => {
    loadFiles().catch(() => {});
    loadUploadedFiles().catch(() => {});

    // Real-time subscriptions
    const channel = supabase
      .channel('documents-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'documents' }, () => {
        loadFiles().catch(() => {});
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'documents' }, () => {
        loadFiles().catch(() => {});
        loadUploadedFiles().catch(() => {});
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'documents' 
      }, (payload) => {
        // Only reload tree for path changes (moves/renames), not title/content edits
        const oldPath = (payload.old as Record<string, unknown>)?.path;
        const newPath = (payload.new as Record<string, unknown>)?.path;
        if (oldPath !== newPath) {
          loadFiles().catch(() => {});
        }
        // If currently viewing, update editor (use ref to avoid recreating subscription)
        if ((payload.new as Record<string, unknown>).path === selectedPathRef.current) {
          setDoc(payload.new as DocumentRecord);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadFiles, loadUploadedFiles]);

  const deselectFile = useCallback(() => {
    setIsCreating(false);
    setSelectedPath('');
    setDoc(null);
    setDraftTitle('');
    setDraftContent('');
    setDraftPath('');
    selectedPathRef.current = '';
    window.history.replaceState(null, '', '/documents');
  }, []);

  const selectFile = useCallback(
    async (path: string) => {
      // If clicking the same file, deselect it
      if (path === selectedPathRef.current) {
        deselectFile();
        return;
      }

      setIsCreating(false);
      setSelectedPath(path);
      selectedPathRef.current = path;
      window.history.replaceState(null, '', `/documents?path=${encodeURIComponent(path)}`);
      const res = await fetch(`/api/documents?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (!res.ok) return;
      // Only apply if this is still the selected file (user may have clicked another)
      if (selectedPathRef.current !== path) return;
      setDoc(data);
      const titleFromPath = data.path?.split('/').pop()?.replace('.md', '') || DEFAULT_TITLE;
      setDraftTitle(data.title || titleFromPath);
      setDraftContent(data.content || '');
      lastSaved.current = data.content || '';
      setDraftPath(data.path || path);
    },
    [deselectFile]
  );

  // Sync from URL on initial load only
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (initialLoadDone.current) return;
    const path = searchParams.get('path');
    if (path && activeTab === 'documents') {
      initialLoadDone.current = true;
      selectFile(path).catch(() => {});
    } else {
      initialLoadDone.current = true;
    }
  }, [searchParams, selectFile, activeTab]);

  // Search with debounce
  useEffect(() => {
    if (!search.trim() || activeTab !== 'documents') {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/documents?search=${encodeURIComponent(search)}`);
      setSearchResults(await res.json());
    }, 300);
    return () => clearTimeout(timer);
  }, [search, activeTab]);

  const matchesType = useCallback(
    (item: DocFile) => {
      if (typeFilter === 'all') return true;
      if (typeFilter === 'meeting') {
        return item.path.startsWith('meetings/');
      }
      return !item.path.startsWith('meetings/');
    },
    [typeFilter]
  );

  const filteredFiles = useMemo(() => {
    const filterTree = (items: DocFile[]): DocFile[] => {
      return items.flatMap((item) => {
        if (item.type === 'file') {
          return matchesType(item) ? [item] : [];
        }
        const children = item.children ? filterTree(item.children) : [];
        // Keep empty directories (folders with only .keep files still show)
        return [{ ...item, children }];
      });
    };
    return filterTree(files);
  }, [files, typeFilter, matchesType]);

  const visibleSearchResults = useMemo(
    () => searchResults.filter((result) => {
      return typeFilter === 'all' || 
        (typeFilter === 'meeting' && result.path.startsWith('meetings/')) ||
        (typeFilter === 'document' && !result.path.startsWith('meetings/'));
    }),
    [searchResults, typeFilter]
  );

  const handleCreateNew = useCallback(() => {
    setIsCreating(true);
    setDoc(null);
    setSelectedPath('');
    setDraftTitle(DEFAULT_TITLE);
    setDraftContent('');
    // Pre-fill path with current folder
    const basePath = currentFolder ? `${currentFolder}/` : '';
    setDraftPath(`${basePath}new-document.md`);
    router.replace('/documents');
  }, [router, currentFolder]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      setCreatingFolder(false);
      return;
    }

    try {
      const slug = newFolderName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const basePath = creatingFolderInPath || currentFolder;
      const folderPath = basePath 
        ? `${basePath}/${slug}` 
        : slug;

      const res = await fetch('/api/documents/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create folder');
      }

      toast.success('Folder created');
      setCreatingFolder(false);
      setCreatingFolderInPath(null);
      setNewFolderName('');
      loadFiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create folder');
      console.error(err);
    }
  }, [newFolderName, currentFolder, creatingFolderInPath, loadFiles]);

  const handleContentChange = useCallback((content: string) => {
    setDraftContent(content);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    // Only save if content actually changed
    if (content === lastSaved.current) return;
    setSaveStatus('saving');
    
    saveTimerRef.current = setTimeout(async () => {
      const pathInput = (draftPathRef.current || selectedPathRef.current).trim();
      if (!pathInput || content === lastSaved.current) {
        setSaveStatus((s) => s === 'saving' ? 'idle' : s);
        return;
      }
      try {
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: pathInput, content, title: draftTitleRef.current }),
        });
        if (!res.ok) throw new Error();
        lastSaved.current = content;
        setDoc((prev) => prev ? { ...prev, updated_at: new Date().toISOString() } : prev);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus((s) => s === 'saved' ? 'idle' : s), 2000);
      } catch {
        setSaveStatus('error');
        toast.error('Failed to save document');
      }
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Computed values
  const showEditor = isCreating || Boolean(doc);
  const showEmptyState = !showEditor && activeTab === 'documents';
  const hasDocs = files.length > 0;
  const totalDocs = useMemo(() => {
    const countFiles = (items: DocFile[]): number => {
      return items.reduce((count, item) => {
        if (item.type === 'file') return count + 1;
        return count + (item.children ? countFiles(item.children) : 0);
      }, 0);
    };
    return countFiles(files);
  }, [files]);

  // Group brain files by category
  const brainFilesByCategory = useMemo(() => {
    const groups: Record<BrainFile['category'], BrainFile[]> = {
      core: [],
      workflows: [],
      memory: [],
      research: [],
      other: [],
    };
    brainFiles.forEach(file => {
      groups[file.category].push(file);
    });
    return groups;
  }, [brainFiles]);

  // Get items for current folder
  const currentFolderItems = useMemo(() => {
    if (!currentFolder) {
      // Root level: show top-level folders and files
      return filteredFiles;
    }

    // Navigate to the folder
    const segments = currentFolder.split('/').filter(Boolean);
    let current: DocFile[] = filteredFiles;
    
    for (const segment of segments) {
      const folder = current.find(item => item.name === segment && item.type === 'directory');
      if (!folder || !folder.children) return [];
      current = folder.children;
    }

    return current;
  }, [currentFolder, filteredFiles]);

  if (loading) {
    return <DocumentsPageSkeleton />;
  }

  return (
    <div className="text-foreground animate-in fade-in duration-200">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {activeTab === 'documents' ? 'Documents' : "Casper's Brain"}
            </h1>
            <p className="text-[13px] text-muted-foreground/60 mt-1">
              {activeTab === 'documents' 
                ? 'Design, organize, and share your knowledge'
                : 'Read-only view of Casper\'s knowledge files'
              }
            </p>
          </div>
          
          {activeTab === 'documents' && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
              <span>{totalDocs} {totalDocs === 1 ? 'document' : 'documents'}</span>
            </div>
          )}
          {activeTab === 'brain' && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
              <span>{brainFiles.length} {brainFiles.length === 1 ? 'file' : 'files'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="mb-6 flex items-center rounded-lg border border-border/20 bg-secondary overflow-hidden h-8 w-fit">
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 text-[11px] h-full transition-colors focus-visible:outline-none flex items-center gap-1.5 ${
            activeTab === 'documents'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Documents
        </button>
        <div className="h-4 w-px bg-border/20" />
        <button
          onClick={() => setActiveTab('brain')}
          className={`px-4 text-[11px] h-full transition-colors focus-visible:outline-none flex items-center gap-1.5 ${
            activeTab === 'brain'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Brain className="h-3.5 w-3.5" />
          Casper's Brain
        </button>
        <div className="h-4 w-px bg-border/20" />
        <button
          onClick={() => setActiveTab('trash')}
          className={`px-4 text-[11px] h-full transition-colors focus-visible:outline-none flex items-center gap-1.5 ${
            activeTab === 'trash'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Trash
        </button>
      </div>

      {/* Filter Bar (Documents only) */}
      {activeTab === 'documents' && (
        <div className="mb-6 flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              aria-label="Search documents"
              className="h-8 w-[180px] pl-8 pr-3 text-[11px] bg-secondary border border-border/20 rounded-lg outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors placeholder:text-muted-foreground/60"
            />
          </div>
          
          {/* Type Filter */}
          <div className="flex items-center rounded-lg border border-border/20 bg-secondary overflow-hidden h-8">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 text-[11px] h-full transition-colors focus-visible:outline-none ${
                typeFilter === 'all'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              All
            </button>
            <div className="h-4 w-px bg-border/20" />
            <button
              onClick={() => setTypeFilter('document')}
              className={`px-3 text-[11px] h-full transition-colors focus-visible:outline-none ${
                typeFilter === 'document'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              Documents
            </button>
            <div className="h-4 w-px bg-border/20" />
            <button
              onClick={() => setTypeFilter('meeting')}
              className={`px-3 text-[11px] h-full transition-colors focus-visible:outline-none ${
                typeFilter === 'meeting'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              Meetings
            </button>
          </div>
          
          <div className="flex-1" />
          
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-border/20 bg-secondary overflow-hidden h-8">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 h-full transition-colors focus-visible:outline-none flex items-center ${
                    viewMode === 'grid'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[12px]">Grid view</TooltipContent>
            </Tooltip>
            <div className="h-4 w-px bg-border/20" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 h-full transition-colors focus-visible:outline-none flex items-center ${
                    viewMode === 'list'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[12px]">List view</TooltipContent>
            </Tooltip>
          </div>
          
          {/* Actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setUploadOpen(true)}
                className="h-8 px-3 text-[11px] rounded-lg border border-border/20 bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[12px]">Upload file</TooltipContent>
          </Tooltip>
          <div className="relative">
            <button
              onClick={() => setNewMenuOpen(!newMenuOpen)}
              className="h-8 px-3 text-[11px] rounded-lg border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
            {newMenuOpen && (<>
              <div className="fixed inset-0 z-40" onClick={() => setNewMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 min-w-[160px] bg-card border border-border/20 rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={() => { handleCreateNew(); setNewMenuOpen(false); }}
                  className="w-full px-3 py-1.5 text-[13px] text-left hover:bg-muted/40 transition-colors text-foreground flex items-center gap-2"
                >
                  <FileText className="h-3.5 w-3.5" />
                  New document
                </button>
                <button
                  onClick={() => { setCreatingFolder(true); setCreatingFolderInPath(currentFolder || null); setNewFolderName(''); setNewMenuOpen(false); }}
                  className="w-full px-3 py-1.5 text-[13px] text-left hover:bg-muted/40 transition-colors text-foreground flex items-center gap-2"
                >
                  <FolderIcon className="h-3.5 w-3.5" />
                  New folder
                </button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* Trash View */}
      {activeTab === 'trash' && (
        <div className="rounded-lg border border-border/20 bg-card" style={{ height: 'calc(100vh - 64px)' }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[13px] font-semibold text-foreground">Deleted Documents</h2>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  {trashItems.length} {trashItems.length === 1 ? 'item' : 'items'} in trash
                </p>
              </div>
              {trashItems.length > 0 && (
                <button
                  onClick={async () => {
                    if (!confirm('Permanently delete all items in trash? This cannot be undone.')) return;
                    for (const item of trashItems) {
                      await fetch(`/api/documents/${item.id}?permanent=true`, { method: 'DELETE' });
                    }
                    toast.success('Trash emptied');
                    loadTrash();
                  }}
                  className="h-8 px-3 text-[11px] rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Empty trash
                </button>
              )}
            </div>
            {trashLoading ? (
              <p className="text-[11px] text-muted-foreground animate-pulse py-8 text-center">Loading...</p>
            ) : trashItems.length === 0 ? (
              <div className="rounded-md border border-border/20 bg-muted/20 p-4 text-center">
                <Trash2 className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-[11px] text-muted-foreground">Trash is empty</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Deleted documents will appear here</p>
              </div>
            ) : (
              <div className="space-y-1">
                {trashItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border/20 bg-card p-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground/60">{item.path} · Deleted {formatDateTime(item.deleted_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={async () => {
                              await fetch(`/api/documents/${item.id}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'restore' }),
                              });
                              toast.success('Document restored');
                              loadTrash();
                              loadFiles();
                            }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[12px]">Restore</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={async () => {
                              if (!confirm('Permanently delete this document? This cannot be undone.')) return;
                              await fetch(`/api/documents/${item.id}?permanent=true`, { method: 'DELETE' });
                              toast.success('Permanently deleted');
                              loadTrash();
                            }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[12px]">Delete permanently</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main 2-column layout */}
      {activeTab !== 'trash' && (<>
      {!panelsCanScroll && (
        <style>{`.docs-grid-locked, .docs-grid-locked * { overflow-y: hidden !important; }`}</style>
      )}
      <div ref={gridRef} className={`grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-6 ${!panelsCanScroll ? 'docs-grid-locked' : ''}`} style={{ height: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <div className="rounded-lg border border-border/20 bg-card flex flex-col min-h-0 overflow-hidden">
          <div className="p-3 border-b border-border/20">
            <h2 className="text-[11px] font-semibold text-muted-foreground tracking-wide">
              {activeTab === 'documents' ? 'Files' : 'Knowledge Files'}
            </h2>
          </div>
          <ScrollArea className="h-[calc(100%-3rem)]">
            <div 
              className="p-4"
              onContextMenu={(e) => {
                if (activeTab === 'documents' && !(e.target as HTMLElement).closest('button, [draggable], a')) {
                  e.preventDefault();
                  setAreaContextMenu({ x: e.clientX, y: e.clientY });
                }
              }}
              onClick={(e) => {
                // Deselect when clicking empty space (not on a file/folder)
                if (e.target === e.currentTarget && activeTab === 'documents') {
                  setIsCreating(false);
                  setSelectedPath('');
                  setDoc(null);
                  setDraftTitle('');
                  setDraftContent('');
                  setDraftPath('');
                  selectedPathRef.current = '';
                  window.history.replaceState(null, '', '/documents');
                }
              }}
            >
              {activeTab === 'documents' ? (
                search.trim() ? (
                  visibleSearchResults.length > 0 ? (
                    <div className="space-y-1">
                      {visibleSearchResults.map((result) => (
                        <button
                          key={result.path}
                          onClick={() => selectFile(result.path)}
                          className="w-full rounded-md p-2 text-left transition-colors hover:bg-muted/40"
                        >
                          <p className="text-[13px] font-medium text-foreground">{result.name}</p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{result.snippet}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-border/20 bg-muted/20 p-4 text-center">
                      <p className="text-[11px] text-muted-foreground">No matches found</p>
                    </div>
                  )
                ) : hasDocs ? (
                  filteredFiles.length > 0 ? (
                    <FileTree 
                      files={filteredFiles} 
                      onSelect={selectFile} 
                      selected={selectedPath} 
                      onRefresh={loadFiles}
                      onDeleteFile={(path) => { if (path === selectedPathRef.current) deselectFile(); loadFiles(); }}
                      onCreateInFolder={(folderPath) => {
                        setIsCreating(true);
                        setDoc(null);
                        setSelectedPath('');
                        setDraftTitle(DEFAULT_TITLE);
                        setDraftContent('');
                        setDraftPath(`${folderPath}/new-document.md`);
                        window.history.replaceState(null, '', '/documents');
                      }}
                      onCreateFolderIn={(parentPath) => {
                        setCreatingFolderInPath(parentPath);
                        setCreatingFolder(true);
                        setNewFolderName('');
                      }}
                    />
                  ) : (
                    <div className="rounded-md border border-border/20 bg-muted/20 p-4 text-center">
                      <p className="text-[11px] text-muted-foreground">No documents in this category</p>
                    </div>
                  )
                ) : (
                  <div className="rounded-md border border-border/20 bg-muted/20 p-4 text-center">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-[11px] text-muted-foreground">No documents yet</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">Create your first document to get started</p>
                  </div>
                )
              ) : (
                brainLoading ? (
                  <div className="text-center py-8">
                    <p className="text-[11px] text-muted-foreground animate-pulse">Loading...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(brainFilesByCategory).map(([category, categoryFiles]) => {
                      if (categoryFiles.length === 0) return null;
                      return (
                        <div key={category}>
                          <h3 className="text-[11px] font-semibold text-muted-foreground/60 tracking-wide mb-2">
                            {getCategoryLabel(category as BrainFile['category'])}
                          </h3>
                          <div className="space-y-0.5">
                            {categoryFiles.map((file) => (
                              <button
                                key={file.path}
                                onClick={() => setSelectedBrainFile(file)}
                                className={`w-full rounded-md p-2 text-left transition-colors flex items-center gap-2 ${
                                  selectedBrainFile?.path === file.path
                                    ? 'bg-primary/10 text-primary'
                                    : 'hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-[13px] truncate">{file.name.replace('.md', '')}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
              {creatingFolder && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 p-2 rounded-md border border-primary bg-primary/5">
                    <FolderIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateFolder();
                        if (e.key === 'Escape') {
                          setCreatingFolder(false);
                          setNewFolderName('');
                        }
                      }}
                      onBlur={handleCreateFolder}
                      placeholder="Folder name"
                      className="flex-1 px-1 py-0.5 text-[13px] border-0 bg-transparent focus:outline-none placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>
              )}
            </div>
            
          </ScrollArea>
          {areaContextMenu && (<>
            <div className="fixed inset-0 z-40" onClick={() => setAreaContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setAreaContextMenu(null); }} />
            <div className="fixed z-50 min-w-[160px] bg-card border border-border/20 rounded-lg shadow-lg py-1" style={{ left: areaContextMenu.x, top: areaContextMenu.y }}>
              <button
                onClick={() => { handleCreateNew(); setAreaContextMenu(null); }}
                className="w-full px-3 py-1.5 text-[13px] text-left hover:bg-muted/40 transition-colors text-foreground flex items-center gap-2"
              >
                <FileText className="h-3.5 w-3.5" />
                New document
              </button>
              <button
                onClick={() => { setCreatingFolder(true); setCreatingFolderInPath(currentFolder || null); setNewFolderName(''); setAreaContextMenu(null); }}
                className="w-full px-3 py-1.5 text-[13px] text-left hover:bg-muted/40 transition-colors text-foreground flex items-center gap-2"
              >
                <FolderIcon className="h-3.5 w-3.5" />
                New folder
              </button>
            </div>
          </>)}
        </div>

        {/* Main Panel */}
        <div className="rounded-lg border border-border/20 bg-card min-h-0 overflow-hidden flex flex-col">
          {activeTab === 'documents' ? (
            showEditor ? (
              <div className="flex h-full flex-col p-6">
                {/* Breadcrumbs */}
                <div className="mb-3">
                  <Breadcrumbs 
                    path={doc?.path ? doc.path.split('/').slice(0, -1).join('/') : (draftPath ? draftPath.split('/').slice(0, -1).join('/') : '')} 
                    onNavigate={(path) => {
                      deselectFile();
                      setCurrentFolder(path);
                    }}
                    suffix={draftTitle || doc?.title || 'Untitled'}
                  />
                </div>
                {/* Document Header */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-start justify-between gap-4">
                    <input
                      value={draftTitle}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setDraftTitle(newTitle);
                        // Debounced title autosave
                        if (titleSaveTimerRef.current) clearTimeout(titleSaveTimerRef.current);
                        if (!doc) return;
                        setSaveStatus('saving');
                        titleSaveTimerRef.current = setTimeout(async () => {
                          try {
                            const res = await fetch(`/api/documents/${doc.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ title: newTitle }),
                            });
                            if (!res.ok) throw new Error();
                            // Update sidebar file list with new title (recursive tree update)
                            setFiles(prev => {
                              const updateTree = (items: DocFile[]): DocFile[] => {
                                let changed = false;
                                const updated = items.map(f => {
                                  if (f.path === doc.path && f.title !== newTitle) {
                                    changed = true;
                                    return { ...f, title: newTitle };
                                  }
                                  if (f.children) {
                                    const newChildren = updateTree(f.children);
                                    if (newChildren !== f.children) {
                                      changed = true;
                                      return { ...f, children: newChildren };
                                    }
                                  }
                                  return f;
                                });
                                return changed ? updated : items;
                              };
                              return updateTree(prev);
                            });
                            setSaveStatus('saved');
                            setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2000);
                          } catch {
                            setSaveStatus('error');
                          }
                        }, 1000);
                      }}
                      className="w-full h-9 border-0 bg-transparent px-0 text-2xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-none flex-1"
                      placeholder="Document title"
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={deselectFile}
                          className="shrink-0 p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors mt-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[12px]">Close</TooltipContent>
                    </Tooltip>
                  </div>
                  
                  {/* Metadata row */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground/60">
                    <div className="flex items-center gap-1.5">
                      <FolderIcon className="h-3 w-3" />
                      <span>{(doc?.category || (draftPath.includes('/') ? draftPath.split('/')[0] : 'general')).split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                    </div>
                    {doc?.created_at && (
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3" />
                        <span>Created {formatDateTime(doc.created_at)}</span>
                      </div>
                    )}
                    {doc?.updated_at && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>Updated {formatDateTime(doc.updated_at)}</span>
                      </div>
                    )}
                    {saveStatus === 'saving' && <span className="text-primary/60 animate-pulse">Saving...</span>}
                    {saveStatus === 'saved' && <span className="text-status-success/60">Saved</span>}
                    {saveStatus === 'error' && <span className="text-destructive/60">Save failed</span>}
                  </div>

                  {/* Path input (only when creating) */}
                  {isCreating && (
                    <div className="pt-2 border-t border-border/20">
                      <input
                        value={draftPath}
                        onChange={(e) => setDraftPath(e.target.value)}
                        className="w-full h-7 px-2 border border-border/50 bg-transparent text-[11px] text-muted-foreground placeholder:text-muted-foreground/40 rounded-md focus:border-primary/50 focus:outline-none"
                        placeholder="path/to/document.md"
                      />
                    </div>
                  )}
                </div>

                {/* Editor */}
                <div className="flex-1 min-h-0">
                  <TaskDescriptionEditor
                    key={selectedPath || 'new-doc'}
                    content={draftContent}
                    onChange={handleContentChange}
                    placeholder="Start writing..."
                  />
                </div>
              </div>
            ) : (
              // Folder browser view
              <div className="flex h-full flex-col">
                <div className="p-6 pb-4 border-b border-border/20">
                  <Breadcrumbs 
                    path={currentFolder} 
                    onNavigate={(path) => {
                      setCurrentFolder(path);
                    }} 
                  />
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6" onContextMenu={(e) => {
                    if (!(e.target as HTMLElement).closest('button, [draggable], a')) {
                      e.preventDefault();
                      setAreaContextMenu({ x: e.clientX, y: e.clientY });
                    }
                  }}>
                    {currentFolderItems.length > 0 ? (
                      <FolderGrid
                        items={currentFolderItems}
                        viewMode={viewMode}
                        onNavigate={(path) => {
                          setCurrentFolder(path);
                        }}
                        onSelectFile={(path) => {
                          selectFile(path);
                        }}
                        onRefresh={loadFiles}
                        onDeleteFile={(path) => { if (path === selectedPathRef.current) deselectFile(); loadFiles(); }}
                      />
                    ) : (
                      <div className="flex h-[400px] items-center justify-center">
                        <div className="text-center max-w-sm">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/40">
                            <FolderIcon className="h-8 w-8 text-muted-foreground/60" />
                          </div>
                          <h3 className="text-[13px] font-medium text-foreground mb-1">
                            Empty folder
                          </h3>
                          <p className="text-[11px] text-muted-foreground/60 mb-4">
                            This folder has no documents or subfolders
                          </p>
                          <button
                            onClick={handleCreateNew}
                            className="h-8 px-4 text-[11px] rounded-lg border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-colors inline-flex items-center gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Create Document
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )
          ) : (
            // Brain view
            selectedBrainFile ? (
              <div className="flex h-full flex-col p-6">
                {/* Brain File Header */}
                <div className="space-y-3 mb-4 pb-4 border-b border-border/20">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {selectedBrainFile.name.replace('.md', '')}
                  </h2>
                  
                  {/* Metadata row */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground/60">
                    <div className="flex items-center gap-1.5">
                      <FolderIcon className="h-3 w-3" />
                      <span>{getCategoryLabel(selectedBrainFile.category)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <File className="h-3 w-3" />
                      <span>{formatFileSize(selectedBrainFile.size)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>Modified {formatDateTime(selectedBrainFile.modifiedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1 min-h-0">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{selectedBrainFile.content}</ReactMarkdown>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <div className="text-center max-w-sm">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/40">
                    <Brain className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-[13px] font-medium text-foreground mb-1">
                    No file selected
                  </h3>
                  <p className="text-[11px] text-muted-foreground/60">
                    Choose a file from the sidebar to view its contents
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
      </>)}

      {/* Uploaded files section (Documents tab only) */}
      {activeTab === 'documents' && uploadedFiles.length > 0 && (
        <div className="mt-6 rounded-lg border border-border/20 bg-card p-5">
          <div className="mb-4">
            <h2 className="text-[13px] font-semibold text-foreground">Uploaded Files</h2>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              {uploadedFiles.length} {uploadedFiles.length === 1 ? 'file' : 'files'}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-lg border border-border/20 bg-card p-3 transition-colors hover:bg-muted/40"
              >
                {getFileTypeIcon(file.original_name)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {file.original_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60">
                    {formatFileSize(file.file_size)}
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploadComplete={() => {
          loadFiles();
          loadUploadedFiles();
        }}
      />
    </div>
  );
}
