'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { ExternalLink, Library, Plus, Search, X, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface Resource {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  added_by: string | null;
  created_at: string;
}

const tagColours = [
  'bg-primary/20 text-primary/70',
  'bg-status-success/20 text-status-success',
  'bg-status-warning/20 text-status-warning',
  'bg-pink-500/20 text-pink-300',
  'bg-sky-500/20 text-sky-300',
  'bg-purple-500/20 text-purple-300',
  'bg-rose-500/20 text-rose-300',
  'bg-teal-500/20 text-teal-300',
];

function getTagColour(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return tagColours[Math.abs(hash) % tagColours.length];
}

function TagInput({ value, onChange, allTags }: {
  value: string[];
  onChange: (tags: string[]) => void;
  allTags: string[];
}) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const lower = input.toLowerCase();
    return allTags.filter(t => t.toLowerCase().includes(lower) && !value.includes(t)).slice(0, 6);
  }, [input, allTags, value]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-border/20 bg-card px-2 py-1.5 min-h-[32px]">
        {value.map(tag => (
          <span key={tag} className={`inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium ${getTagColour(tag)}`}>
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-foreground ml-0.5 transition-colors duration-150"><X className="h-2.5 w-2.5" /></button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              if (input.trim()) addTag(input);
            } else if (e.key === 'Backspace' && !input && value.length > 0) {
              removeTag(value[value.length - 1]);
            }
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={value.length === 0 ? 'Add tags...' : ''}
          className="bg-transparent text-[11px] text-foreground outline-none flex-1 min-w-[60px] placeholder:text-muted-foreground"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-border/20 bg-popover shadow-lg overflow-hidden">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
              className="block w-full text-left px-3 py-1.5 text-[11px] text-foreground hover:bg-accent transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryFilterPopover({ value, onChange, categories }: { value: string; onChange: (value: string) => void; categories: string[] }) {
  const [open, setOpen] = useState(false);

  const currentLabel = value === 'all' ? 'All categories' : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-8 px-3 text-[11px] bg-card border border-border/20 rounded-lg hover:bg-muted/40 transition-colors duration-150 flex items-center justify-between gap-2 w-40">
          <span className="capitalize truncate">{currentLabel}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/60 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-1" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No category found</CommandEmpty>
            <CommandGroup>
              {categories.map((c) => (
                <CommandItem
                  key={c}
                  onSelect={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === c ? "opacity-100" : "opacity-0")} />
                  <span className="text-[13px] capitalize">{c === 'all' ? 'All categories' : c}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function TagFilterPopover({ value, onChange, tags }: { value: string; onChange: (value: string) => void; tags: string[] }) {
  const [open, setOpen] = useState(false);

  const currentLabel = value === 'all' ? 'All tags' : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-8 px-3 text-[11px] bg-card border border-border/20 rounded-lg hover:bg-muted/40 transition-colors duration-150 flex items-center justify-between gap-2 w-40">
          <span className="truncate">{currentLabel}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/60 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-1" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No tag found</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onChange('all');
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-3.5 w-3.5", value === 'all' ? "opacity-100" : "opacity-0")} />
                <span className="text-[13px]">All tags</span>
              </CommandItem>
              {tags.map((t) => (
                <CommandItem
                  key={t}
                  onSelect={() => {
                    onChange(t);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === t ? "opacity-100" : "opacity-0")} />
                  <span className="text-[13px]">{t}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [newResource, setNewResource] = useState({
    title: '',
    url: '',
    description: '',
    category: '',
    tags: [] as string[],
  });

  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch('/api/resources');
      if (res.ok) {
        const data = await res.json();
        setResources(data);
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('resources-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => {
        fetchResources();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchResources]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    resources.forEach(r => r.tags?.forEach(t => {
      if (!t.startsWith('type:')) set.add(t);
    }));
    return Array.from(set).sort();
  }, [resources]);

  const allCategories = useMemo(() => {
    return ['all', ...new Set(resources.map(r => r.category).filter(Boolean) as string[])];
  }, [resources]);

  const filteredResources = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return resources.filter(r => {
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;
      if (filterTag !== 'all' && !(r.tags || []).includes(filterTag)) return false;
      if (search && !r.title.toLowerCase().includes(search) && !r.url.toLowerCase().includes(search) && !(r.tags || []).some(t => t.toLowerCase().includes(search))) return false;
      return true;
    });
  }, [resources, searchTerm, filterCategory, filterTag]);

  const handleCreate = async () => {
    if (!newResource.title || !newResource.url) return;
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newResource.title,
          url: newResource.url,
          description: newResource.description || null,
          category: newResource.category || null,
          tags: newResource.tags.length > 0 ? newResource.tags : null,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setNewResource({ title: '', url: '', description: '', category: '', tags: [] });
        fetchResources();
      }
    } catch (error) {
      console.error('Failed to create resource:', error);
    }
  };

  const getDisplayTags = (tags: string[] | null) => (tags || []).filter(t => !t.startsWith('type:'));

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-40 rounded bg-muted/30 animate-pulse" />
            <div className="h-4 w-56 rounded bg-muted/30 animate-pulse mt-2" />
          </div>
          <div className="h-9 w-32 rounded bg-muted/30 animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-48 rounded bg-muted/30 animate-pulse" />
          <div className="h-8 w-32 rounded bg-muted/30 animate-pulse" />
        </div>
        <div className="rounded-lg border border-border/20 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 border-b border-border/20 bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Resource Hub</h1>
          <p className="text-[13px] text-muted-foreground">Curated collection of useful resources</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-card border border-border/20 text-foreground hover:bg-secondary transition-colors duration-150">
          <Plus className="h-4 w-4 mr-2" />
          Add Resource
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border/20 h-8 text-[13px]"
          />
        </div>
        <CategoryFilterPopover value={filterCategory} onChange={setFilterCategory} categories={allCategories} />
        <TagFilterPopover value={filterTag} onChange={setFilterTag} tags={allTags} />
        <span className="text-[11px] text-muted-foreground ml-auto">{filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {filteredResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-border/20 bg-card">
          <div className="rounded-full bg-muted/50 p-4 mb-4">
            <Library className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <p className="text-[13px] font-medium text-foreground mb-1">No resources found</p>
          <Button onClick={() => setDialogOpen(true)} size="sm" variant="outline" className="mt-2 border-border/20 text-[11px] h-7">
            <Plus className="h-3 w-3 mr-1" />
            Add Resource
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border/20 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/20 bg-muted/30">
                <th className="text-left text-[11px] font-semibold text-muted-foreground/60 px-4 py-2">Name</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground/60 px-4 py-2">URL</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground/60 px-4 py-2">Tags</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground/60 px-4 py-2">Category</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground/60 px-4 py-2">Added</th>
              </tr>
            </thead>
            <tbody>
              {filteredResources.map((resource, idx) => {
                const displayTags = getDisplayTags(resource.tags);
                return (
                  <tr
                    key={resource.id}
                    className="border-b border-border/20 transition-colors duration-150 hover:bg-muted/40 bg-card"
                  >
                    <td className="px-4 py-2">
                      <span className="text-foreground font-medium text-[13px]">{resource.title}</span>
                    </td>
                    <td className="px-4 py-2 max-w-[200px]">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/70 text-[11px] truncate block transition-colors"
                        title={resource.url} // eslint-disable-line mission-control/no-native-title-tooltip -- showing full URL on truncated link
                      >
                        <span className="inline-flex items-center gap-1">
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{resource.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                        </span>
                      </a>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {displayTags.map(tag => (
                          <span
                            key={tag}
                            className={`inline-block px-1.5 py-0 rounded text-[10px] font-medium ${getTagColour(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {resource.category && (
                        <span className="text-[11px] text-muted-foreground">{resource.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{format(new Date(resource.created_at), 'dd MMM yyyy')}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border border-border/20 bg-background">
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
            <DialogDescription>Add a new link, tool, or reference.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-[11px]">Title</Label>
                <Input
                  placeholder="e.g. Supabase Docs"
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  className="bg-card border-border/20 h-8 text-[13px]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px]">Category</Label>
                <Input
                  placeholder="e.g. Tools, Articles"
                  value={newResource.category}
                  onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                  className="bg-card border-border/20 h-8 text-[13px]"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[11px]">URL</Label>
              <Input
                placeholder="https://"
                value={newResource.url}
                onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                className="bg-card border-border/20 h-8 text-[13px]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[11px]">Tags</Label>
              <TagInput value={newResource.tags} onChange={(tags) => setNewResource({ ...newResource, tags })} allTags={allTags} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[11px]">Description (optional)</Label>
              <Textarea
                placeholder="Brief description..."
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                className="bg-card border-border/20 text-[13px]"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border/20 h-8 text-[11px]">Cancel</Button>
            <Button onClick={handleCreate} disabled={!newResource.title || !newResource.url} className="bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-150 h-8 text-[11px]">Add Resource</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
