'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Project } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, LayoutGrid, Table2, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ProjectWithStats extends Project {
  task_count: number;
  done_count: number;
  todo_count: number;
  doing_count: number;
  active_agents: string[];
}

export function ProjectsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('rgb(99, 102, 241)');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('projects-viewMode') as 'grid' | 'table') || 'grid';
    return 'grid';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'tasks' | 'progress'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const loadProjects = useCallback(async () => {
    const res = await fetch('/api/projects');
    setProjects(await res.json());
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { localStorage.setItem('projects-viewMode', viewMode); }, [viewMode]);

  useEffect(() => {
    const channel = supabase
      .channel('projects-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadProjects())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadProjects]);

  // ── Quick action from global search (?action=new-project) ─────────────────
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new-project' && !newProjectOpen) {
      setNewProjectOpen(true);
      router.replace('/projects', { scroll: false });
    }
  }, [searchParams, newProjectOpen, router]);

  const createProject = async () => {
    if (!newName.trim()) return;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, color: newColor }),
    });
    if (res.ok) {
      toast.success('Project created');
    } else {
      toast.error('Something went wrong. Please try again.');
    }
    setNewProjectOpen(false);
    setNewName('');
    await loadProjects();
  };

  return (
    <div className="animate-in fade-in duration-200">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="text-[13px] text-muted-foreground/60 mt-1">
          {projects.length} projects · {projects.reduce((s, p) => s + p.task_count, 0)} total tasks
        </p>
      </div>

      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="h-7 w-[180px] pl-7 pr-3 text-[11px] bg-secondary border border-border/20 rounded-lg outline-none focus:border-primary/50 transition-colors duration-150 placeholder:text-muted-foreground/60" />
        </div>
        <div className="flex-1" />
        <ToggleGroup type="single" value={viewMode} onValueChange={(v) => { if (v) setViewMode(v as 'grid' | 'table'); }}>
          <ToggleGroupItem value="grid" aria-label="Grid view" className="focus-visible:ring-2 focus-visible:ring-primary/50">
            <LayoutGrid className="h-4 w-4 mr-1" aria-hidden="true" />
            <span className="text-[13px]">Grid</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view" className="focus-visible:ring-2 focus-visible:ring-primary/50">
            <Table2 className="h-4 w-4 mr-1" aria-hidden="true" />
            <span className="text-[13px]">Table</span>
          </ToggleGroupItem>
        </ToggleGroup>
        <Button size="sm" onClick={() => setNewProjectOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Project
        </Button>
      </div>

      {(() => {
        const filtered = projects.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const toggleSort = (field: typeof sortField) => {
          if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
          else { setSortField(field); setSortDir('asc'); }
        };
        const SortIcon = ({ field }: { field: typeof sortField }) => sortField === field ? (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : null;
        const sorted = [...filtered].sort((a, b) => {
          const dir = sortDir === 'asc' ? 1 : -1;
          switch (sortField) {
            case 'name': return dir * a.name.localeCompare(b.name);
            case 'tasks': return dir * (a.task_count - b.task_count);
            case 'progress': {
              const pa = a.task_count > 0 ? a.done_count / a.task_count : 0;
              const pb = b.task_count > 0 ? b.done_count / b.task_count : 0;
              return dir * (pa - pb);
            }
            default: return 0;
          }
        });

        if (sorted.length === 0) return (
          <div className="rounded-lg border border-border/20 bg-card p-12 text-center">
            <div className="rounded-full bg-muted/50 p-4 w-fit mx-auto mb-4"><Plus className="h-8 w-8 text-muted-foreground/60" /></div>
            <p className="text-[13px] font-medium text-foreground mb-1">{searchQuery ? 'No projects found' : 'No projects yet'}</p>
            <p className="text-[11px] text-muted-foreground/60">{searchQuery ? 'Try adjusting your search' : 'Create your first project to organize tasks'}</p>
          </div>
        );

        if (viewMode === 'table') return (
          <div className="rounded-lg border border-border/20 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border/20 bg-muted/30">
                    {([['name', 'Name'], ['tasks', 'Tasks'], ['progress', 'Progress']] as const).map(([field, label]) => (
                      <th key={field} onClick={() => toggleSort(field)} className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none">
                        <span className="inline-flex items-center gap-1">{label} <SortIcon field={field} /></span>
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">Breakdown</th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">Active agents</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(p => {
                    const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
                    const isComplete = p.task_count > 0 && p.done_count === p.task_count;
                    return (
                      <tr key={p.id} onClick={() => router.push(`/projects/${p.id}`)} className="border-b border-border/10 hover:bg-muted/40 cursor-pointer transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || undefined }} />
                            <span className="font-medium text-foreground">{p.name}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{p.task_count}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="h-1.5 flex-1 rounded-full bg-muted/40 overflow-hidden border border-border/20">
                              <div className={`h-full rounded-full ${isComplete ? 'bg-status-success' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] text-muted-foreground/60 tabular-nums w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[11px] px-1.5 py-0 font-normal text-amber-400 border-amber-400/20">{p.todo_count} todo</Badge>
                            <Badge variant="outline" className="text-[11px] px-1.5 py-0 font-normal text-primary border-primary/20">{p.doing_count} doing</Badge>
                            <Badge variant="outline" className="text-[11px] px-1.5 py-0 font-normal text-status-success border-status-success/20">{p.done_count} done</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {p.active_agents.length > 0 ? (
                            <div className="flex items-center gap-1">
                              {p.active_agents.map(agent => (
                                <Badge key={agent} variant="secondary" className="text-[11px] px-1.5 py-0 font-normal capitalize border-border/20">{agent}</Badge>
                              ))}
                            </div>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sorted.map((p) => {
              const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
              const isComplete = p.task_count > 0 && p.done_count === p.task_count;
              return (
                <Card key={p.id} className="cursor-pointer rounded-lg border-border/20 transition-all duration-150 hover:bg-muted/40 hover:border-border/20 hover:-translate-y-0.5 hover:shadow-sm group focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none" onClick={() => router.push(`/projects/${p.id}`)}>
                  <CardContent className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color || undefined }} />
                      <p className="font-semibold text-foreground leading-tight truncate text-[13px]">{p.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                      <Badge variant="outline" className="text-[11px] px-1.5 py-0 font-normal text-amber-400 border-amber-400/20">{p.todo_count} todo</Badge>
                      <Badge variant="outline" className="text-[11px] px-1.5 py-0 font-normal text-primary border-primary/20">{p.doing_count} doing</Badge>
                      <Badge variant="outline" className="text-[11px] px-1.5 py-0 font-normal text-status-success border-status-success/20">{p.done_count} done</Badge>
                      <span className="text-[11px] text-muted-foreground/60 ml-auto">{p.task_count} total</span>
                    </div>
                    <div className="mb-2">
                      <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden border border-border/20">
                        <div className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-status-success' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-muted-foreground/60">{pct}% complete</span>
                        {isComplete && <span className="text-[11px] text-status-success font-medium">✓ Done</span>}
                      </div>
                    </div>
                    {p.active_agents.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/20">
                        <span className="text-[11px] text-muted-foreground/60">Active:</span>
                        {p.active_agents.map(agent => (
                          <Badge key={agent} variant="secondary" className="text-[11px] px-1.5 py-0 font-normal capitalize border-border/20">{agent}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })()}

      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name..."
              />
            </div>
            <div>
              <Label>Colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-8 w-8 rounded cursor-pointer"
                />
                <Input
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-28"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewProjectOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createProject}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
