'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { ClipboardList, FileText, Plus, Search, Pencil, Trash2, Save, X, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
const TiptapEditor = dynamic(() => import('@/components/board/task-description-editor').then(mod => ({ default: mod.TaskDescriptionEditor })), { ssr: false, loading: () => <div className="h-[200px] rounded-lg border border-border/20 bg-card animate-pulse" /> });
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Document {
  id: string;
  title: string;
  content: string;
  path: string;
  category: string;
  type: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'engineering', label: 'Engineering', className: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-500/20' },
  { value: 'design', label: 'Design', className: 'bg-pink-500/20 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400 border border-pink-500/20' },
  { value: 'operations', label: 'Operations', className: 'bg-status-success/10 text-status-success dark:bg-status-success/10 text-status-success border border-status-success/20' },
  { value: 'hr', label: 'HR', className: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-500/20' },
  { value: 'general', label: 'General', className: 'bg-muted/50 text-muted-foreground border border-border/20' },
] as const;

const categoryMap = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

function getCategoryStyle(category: string) {
  return categoryMap[category]?.className ?? categoryMap.general.className;
}

function getCategoryLabel(category: string) {
  return categoryMap[category]?.label ?? category;
}

function getSnippet(content: string, maxLen = 120): string {
  // Strip HTML tags and get plain text
  const plain = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + '…' : plain;
}

function CategoryPopover({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);

  const currentLabel = CATEGORIES.find(c => c.value === value)?.label || value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-7 px-3 text-[11px] bg-card border border-border/20 rounded-lg hover:bg-muted/40 transition-colors duration-150 flex items-center justify-between gap-2 w-32">
          <span>{currentLabel}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[160px] p-1" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No category found</CommandEmpty>
            <CommandGroup>
              {CATEGORIES.map((cat) => (
                <CommandItem
                  key={cat.value}
                  onSelect={() => {
                    onChange(cat.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === cat.value ? "opacity-100" : "opacity-0")} />
                  <span className="text-[13px]">{cat.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function SOPsPage() {
  const [sops, setSops] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSop, setSelectedSop] = useState<Document | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newSOP, setNewSOP] = useState({ title: '', category: 'general', content: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sopToDelete, setSopToDelete] = useState<string | null>(null);

  const fetchSOPs = useCallback(async () => {
    try {
      const res = await fetch('/api/documents?type=sop');
      if (res.ok) {
        const data: Document[] = await res.json();
        setSops(data);
      }
    } catch (error) {
      console.error('Failed to fetch SOPs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSOPs();
  }, [fetchSOPs]);

  useEffect(() => {
    const channel = supabase
      .channel('documents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {
        fetchSOPs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSOPs]);

  const handleCreateSOP = async () => {
    if (!newSOP.title || !newSOP.content) return;
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSOP.title,
          category: newSOP.category,
          content: newSOP.content,
          type: 'sop',
          path: `/sops/${newSOP.title.toLowerCase().replace(/\s+/g, '-')}`,
        }),
      });
      if (res.ok) {
        toast.success('SOP saved');
        setDialogOpen(false);
        setNewSOP({ title: '', category: 'general', content: '' });
        fetchSOPs();
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create SOP:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!selectedSop) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/documents/${selectedSop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent, category: editCategory }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        toast.success('SOP saved');
        fetchSOPs();
        setSelectedSop({ ...selectedSop, title: editTitle, content: editContent, category: editCategory });
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save SOP:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setSopToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sopToDelete) return;
    try {
      const res = await fetch(`/api/documents/${sopToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('SOP deleted');
        if (selectedSop?.id === sopToDelete) {
          setSelectedSop(null);
          setEditing(false);
        }
        fetchSOPs();
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete SOP:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setDeleteDialogOpen(false);
      setSopToDelete(null);
    }
  };

  const startEditing = (sop: Document) => {
    setSelectedSop(sop);
    setEditContent(sop.content);
    setEditTitle(sop.title);
    setEditCategory(sop.category);
    setEditing(true);
    setSaved(false);
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredSOPs = sops.filter((sop) => {
    // Normalize category for comparison (handle null and case insensitivity)
    const sopCategory = (sop.category || 'general').toLowerCase();
    const filterCategory = selectedCategory.toLowerCase();
    const matchesCategory = filterCategory === 'all' || sopCategory === filterCategory;
    
    const matchesSearch = !normalizedSearch
      || sop.title.toLowerCase().includes(normalizedSearch)
      || sop.content.toLowerCase().includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-64 rounded bg-muted/30 animate-pulse" />
            <div className="h-4 w-48 rounded bg-muted/30 animate-pulse mt-2" />
          </div>
          <div className="h-9 w-28 rounded bg-muted/30 animate-pulse" />
        </div>
        <div className="flex gap-4 flex-1">
          <div className="w-80 shrink-0 space-y-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-lg border border-border/20 bg-card animate-pulse" />
            ))}
          </div>
          <div className="flex-1 rounded-lg border border-border/20 bg-card animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Standard Operating Procedures</h1>
          <p className="text-[13px] text-muted-foreground">Documented processes and guidelines</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-card border border-border/20 text-foreground hover:bg-secondary transition-colors duration-150">
          <Plus className="h-4 w-4 mr-2" />
          Create SOP
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search SOPs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border/20 h-8 text-[13px]"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className={`text-[11px] h-7 px-2.5 transition-colors duration-150 ${
              selectedCategory === 'all'
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground border-primary'
                : 'bg-card border-border/20 text-foreground hover:bg-secondary'
            }`}
          >
            All
          </Button>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
              className={`text-[11px] h-7 px-2.5 transition-colors duration-150 ${
                selectedCategory === cat.value
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground border-primary'
                  : 'bg-card border-border/20 text-foreground hover:bg-secondary'
              }`}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main content: cards + editor */}
      <div className="flex gap-4 flex-1" style={{ minHeight: 0 }}>
        {/* SOP Cards (left panel) */}
        <div className="w-80 shrink-0 flex flex-col gap-1.5 overflow-y-auto pr-1">
          {filteredSOPs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-border/20 bg-card">
              <div className="rounded-full bg-muted/50 p-4 mb-4">
                <ClipboardList className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <p className="text-[13px] font-medium text-foreground mb-1">No SOPs found</p>
              <p className="text-[11px] text-muted-foreground/60">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredSOPs.map((sop) => (
              <button
                key={sop.id}
                onClick={() => { setSelectedSop(sop); setEditing(false); }}
                className={`group w-full text-left px-5 py-3 rounded-lg border transition-colors duration-150 ${
                  selectedSop?.id === sop.id
                    ? 'bg-card border-primary/40 ring-1 ring-primary/10'
                    : 'bg-card border-border/20 hover:border-border/20 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[13px] text-foreground font-medium leading-snug line-clamp-2 group-hover:text-primary dark:group-hover:text-primary transition-colors">
                    {sop.title}
                  </span>
                  <Badge className={`${getCategoryStyle(sop.category)} text-[10px] px-1.5 py-0 shrink-0 font-medium`}>
                    {getCategoryLabel(sop.category)}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {getSnippet(sop.content)}
                </p>
                <span className="text-[10px] text-muted-foreground/60 mt-2 block">
                  {format(new Date(sop.updated_at), 'dd MMM yyyy')}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Editor / Preview (right panel) */}
        <div className="flex-1 rounded-lg border border-border/20 bg-card flex flex-col overflow-hidden">
          {!selectedSop ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="rounded-full bg-muted/50 p-4 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <p className="text-[13px] font-medium text-foreground mb-1">No SOP selected</p>
              <p className="text-[11px] text-muted-foreground/60">Select an SOP to view or edit</p>
            </div>
          ) : editing ? (
            <>
              <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/20 bg-muted/30">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-transparent border-0 text-foreground font-semibold text-base h-7 p-0 focus-visible:ring-0 shadow-none"
                  placeholder="SOP Title"
                />
                <CategoryPopover value={editCategory} onChange={setEditCategory} />
                <div className="flex items-center gap-1.5 ml-auto">
                  {saved && (
                    <span className="flex items-center gap-1 text-[11px] text-status-success text-status-success mr-1 animate-in fade-in">
                      <Check className="h-3.5 w-3.5" /> Saved
                    </span>
                  )}
                  <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 px-2.5 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground border-0 transition-colors duration-150">
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-7 px-2 text-[11px] border-border/20 bg-card hover:bg-muted transition-colors duration-150">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <TiptapEditor 
                  content={editContent} 
                  onChange={setEditContent}
                  placeholder="Write your SOP content..."
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-semibold text-foreground tracking-tight">{selectedSop.title}</h2>
                  <Badge className={`${getCategoryStyle(selectedSop.category)} text-[10px] font-medium`}>
                    {getCategoryLabel(selectedSop.category)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground mr-1">
                    Updated {format(new Date(selectedSop.updated_at), 'dd MMM yyyy')}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => startEditing(selectedSop)} className="h-7 px-2.5 text-[11px] border-border/20 bg-card hover:bg-muted hover:text-foreground transition-colors duration-150">
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDeleteClick(selectedSop.id)} 
                    className="h-7 px-2 text-[11px] border-border/20 bg-card text-destructive dark:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-colors duration-150"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-background">
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-primary dark:prose-a:text-primary"
                  dangerouslySetInnerHTML={{ __html: selectedSop.content }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create SOP Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border border-border/20 bg-background max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New SOP</DialogTitle>
            <DialogDescription>Add a new standard operating procedure.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="title" className="text-[11px]">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Customer Onboarding Process"
                  value={newSOP.title}
                  onChange={(e) => setNewSOP({ ...newSOP, title: e.target.value })}
                  className="bg-card border-border/20 h-8 text-[13px]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="category" className="text-[11px]">Category</Label>
                <CategoryPopover value={newSOP.category} onChange={(value) => setNewSOP({ ...newSOP, category: value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="content" className="text-[11px]">Content</Label>
              <div className="rounded-md border border-border/20 overflow-hidden" style={{ height: '320px' }}>
                <TiptapEditor 
                  content={newSOP.content} 
                  onChange={(val) => setNewSOP({ ...newSOP, content: val })}
                  placeholder="Write your SOP content..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border/20 h-8 text-[11px] transition-colors duration-150">Cancel</Button>
            <Button onClick={handleCreateSOP} disabled={!newSOP.title || !newSOP.content} className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-[11px] transition-colors duration-150">Create SOP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSopToDelete(null);
        }}
        title="Delete SOP?"
        description="This will permanently delete this SOP. This action cannot be undone."
      />
    </div>
  );
}
