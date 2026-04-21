'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Project, Task, ActivityLog } from '@/lib/types';
import { useStatuses } from '@/hooks/use-statuses';
import { STATUS_STYLES, PRIORITY_STYLES } from '@/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FileText, Activity, CheckSquare, Calendar, Plus } from 'lucide-react';
import { formatRelative, formatDueDate, getDueDateColor } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import { TaskSheet } from '@/components/board/task-sheet';
import { ActivityFeed } from '@/components/activity/activity-feed';
import { toast } from 'sonner';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { statuses: dynStatuses } = useStatuses();
  const getStatusLabel = (status: string) => {
    const dyn = dynStatuses.find(s => s.slug === status);
    return dyn?.label || STATUS_STYLES[status]?.label || status;
  };

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', content: '' });

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects`);
    const allProjects = await res.json();
    const found = allProjects.find((p: Project) => p.id === projectId);
    setProject(found || null);
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/tasks?project_id=${projectId}`);
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
  }, [projectId]);

  const fetchActivity = useCallback(async () => {
    // Activity filtered by project would require backend changes
    // For now, just fetch all activity
    const res = await fetch(`/api/activity`);
    const data = await res.json();
    setActivity(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchActivity();
    fetch('/api/projects').then((r) => r.json()).then(setProjects);
  }, [fetchProject, fetchTasks, fetchActivity]);

  useEffect(() => {
    const channel = supabase
      .channel('project-detail-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProject();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, () => {
        fetchActivity();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProject, fetchTasks, fetchActivity]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="h-6 w-40 rounded bg-muted/30 animate-pulse" />
      </div>
    );
  }

  const statusBreakdown = {
    todo: tasks.filter((t) => t.status === 'todo' || (t.status as string) === 'backlog').length,
    doing: tasks.filter((t) => t.status === 'doing').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  const totalTasks = tasks.length;
  const completedTasks = statusBreakdown.done;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const overdueTasks = tasks.filter(
    (t) => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()
  ).length;

  const handleSave = async (data: Partial<Task>) => {
    if (isNew) {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else if (selectedTask) {
      await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
    setSheetOpen(false);
    setSelectedTask(null);
    fetchTasks();
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    await fetch(`/api/tasks/${selectedTask.id}`, { method: 'DELETE' });
    setSheetOpen(false);
    setSelectedTask(null);
    fetchTasks();
    toast.success('Task deleted');
  };

  const handleCreateDocument = async () => {
    if (!newDoc.title || !newDoc.content) return;

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDoc.title,
          content: newDoc.content,
          type: 'document',
          category: 'general',
          path: `/projects/${project?.name || 'untitled'}/${newDoc.title.toLowerCase().replace(/\s+/g, '-')}`,
          project_id: projectId,
        }),
      });

      if (res.ok) {
        setDocDialogOpen(false);
        setNewDoc({ title: '', content: '' });
        // Optionally refresh documents list here
      }
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/projects')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <div className="flex items-center gap-3 mb-1">
          <span
            className="inline-block h-4 w-4 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
        </div>
        {(project as Project & { description?: string }).description && (
          <p className="text-[13px] text-muted-foreground ml-7">
            {((project as Project & { description?: string }).description || '').replace(/<[^>]*>/g, '')}
          </p>
        )}
      </div>

      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tasks">
            <CheckSquare className="h-4 w-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-6">
          {/* Progress section */}
          <div className="rounded-lg border border-border/20 bg-card p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-foreground">Progress</span>
                <span className="text-[13px] text-muted-foreground">
                  {completedTasks} / {totalTasks} completed
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            <div className="grid grid-cols-5 gap-4">
              {Object.entries(statusBreakdown).map(([status, count]) => (
                <div key={status} className="text-center">
                  <div className="text-2xl font-bold text-foreground">{count}</div>
                  <div className="text-[11px] font-medium text-muted-foreground">
                    {getStatusLabel(status)}
                  </div>
                </div>
              ))}
              <div className="text-center">
                <div className={`text-2xl font-bold ${overdueTasks > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {overdueTasks}
                </div>
                <div className="text-[11px] font-medium text-muted-foreground">
                  Overdue
                </div>
              </div>
            </div>
          </div>

          {/* Task list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tasks</h2>
              <Button
                size="sm"
                onClick={() => {
                  setIsNew(true);
                  setSelectedTask({
                    project_id: projectId,
                  } as Task);
                  setSheetOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
            {tasks.length === 0 ? (
              <div className="rounded-lg border border-border/20 bg-card p-12 text-center">
                <div className="rounded-full bg-muted/50 p-4 w-fit mx-auto mb-4">
                  <CheckSquare className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <p className="text-[13px] font-medium text-foreground mb-1">No tasks in this project yet</p>
                <p className="text-[13px] text-muted-foreground mb-4">
                  Create your first task to get started!
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsNew(true);
                    setSelectedTask({ project_id: projectId } as Task);
                    setSheetOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border border-border/20 bg-card p-4 cursor-pointer transition-all duration-150 hover:bg-muted/40 hover:border-border/20"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsNew(false);
                      setSheetOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground mb-1 truncate">{task.title}</h3>
                        {task.description && (
                          <p className="text-[13px] text-muted-foreground line-clamp-2 mb-2">
                            {task.description.replace(/<[^>]*>/g, '')}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[11px]">
                            {getStatusLabel(task.status)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[11px] ${task.priority ? (PRIORITY_STYLES[task.priority]?.bg ?? '') : ''} ${task.priority ? (PRIORITY_STYLES[task.priority]?.text ?? '') : ''} ${task.priority ? (PRIORITY_STYLES[task.priority]?.border ?? '') : ''}`}
                          >
                            {task.priority}
                          </Badge>
                          {task.due_date && (
                            <div className={`flex items-center gap-1 text-[11px] ${getDueDateColor(task.due_date, task.status)}`}>
                              <Calendar className="h-3 w-3" />
                              <span>{formatDueDate(task.due_date, task.status)}</span>
                            </div>
                          )}
                          {task.subtask_count != null && task.subtask_count > 0 && (
                            <Badge variant="outline" className="text-[11px] text-muted-foreground">
                              {task.subtasks_done_count}/{task.subtask_count} subtasks
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            Updated {formatRelative(task.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Project Documents</h2>
            <Button size="sm" onClick={() => setDocDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </div>
          <div className="rounded-lg border border-border/20 bg-card p-12 text-center">
            <div className="rounded-full bg-muted/50 p-4 w-fit mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <p className="text-[13px] font-medium text-foreground mb-1">
              Document filtering by project coming soon!
            </p>
            <p className="text-[13px] text-muted-foreground">
              For now, create documents linked to this project.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeed />
        </TabsContent>
      </Tabs>

      <TaskSheet
        task={selectedTask}
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
        projects={projects}
        isNew={isNew}
        allTasks={tasks}
        onTaskClick={(task) => {
          setSelectedTask(task as Task);
          setIsNew(false);
          setSheetOpen(true);
        }}
      />

      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project Document</DialogTitle>
            <DialogDescription>
              Add a new document to {project?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                placeholder="e.g. Project Brief"
                value={newDoc.title}
                onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doc-content">Content</Label>
              <Textarea
                id="doc-content"
                placeholder="Document content..."
                value={newDoc.content}
                onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDocument} disabled={!newDoc.title || !newDoc.content}>
              Create Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
