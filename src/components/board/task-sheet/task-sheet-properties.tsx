'use client';

import type { Task, Project } from '@/lib/types';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Activity, Flag, User, Folder, Calendar as CalendarIcon, Tag, X } from 'lucide-react';
import { PropertyRow } from '../property-row';
import { SearchableStatusPopover } from '../searchable-status-popover';
import { SearchablePriorityPopover } from '../searchable-priority-popover';
import { SearchableAssigneePopover } from '../searchable-assignee-popover';
import { SearchableProjectPopover } from '../searchable-project-popover';
import { EnhancedDatePicker, formatRelativeDate } from '../enhanced-date-picker';
import { LabelCombobox } from '../label-combobox';

interface PropertiesFormValues {
  status: Task['status'];
  priority: string;
  assignee: string;
  project_id: string;
  start_date: Date | null;
  due_date: Date | null;
  due_time: string;
  labels: string[];
}

interface TaskSheetPropertiesProps {
  form: PropertiesFormValues;
  assigneeMetadata?: Record<string, unknown> | null;
  onStatusChange: (status: Task['status']) => void;
  onPriorityChange: (priority: string) => void;
  onAssigneeChange: (assignee: string) => void;
  onProjectChange: (projectId: string) => void;
  onStartDateChange: (date: Date | null) => void;
  onDueDateChange: (date: Date | null) => void;
  onDueTimeChange: (time: string) => void;
  onClearStartDate: () => void;
  onClearDueDate: () => void;
  onLabelsChange: (labels: string[]) => void;
  projects: Project[];
  statusOpen: boolean;
  setStatusOpen: (open: boolean) => void;
  priorityOpen: boolean;
  setPriorityOpen: (open: boolean) => void;
  assigneeOpen: boolean;
  setAssigneeOpen: (open: boolean) => void;
  startDateOpen: boolean;
  setStartDateOpen: (open: boolean) => void;
  dueDateOpen: boolean;
  setDueDateOpen: (open: boolean) => void;
  projectOpen: boolean;
  setProjectOpen: (open: boolean) => void;
  labelsOpen: boolean;
  setLabelsOpen: (open: boolean) => void;
  allLabels: string[];
}

export function TaskSheetProperties({
  form,
  assigneeMetadata,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onProjectChange,
  onStartDateChange,
  onDueDateChange,
  onDueTimeChange,
  onClearStartDate,
  onClearDueDate,
  onLabelsChange,
  projects,
  statusOpen,
  setStatusOpen,
  priorityOpen,
  setPriorityOpen,
  assigneeOpen,
  setAssigneeOpen,
  startDateOpen,
  setStartDateOpen,
  dueDateOpen,
  setDueDateOpen,
  projectOpen,
  setProjectOpen,
  labelsOpen,
  setLabelsOpen,
  allLabels,
}: TaskSheetPropertiesProps) {
  return (
    <div className="px-5 pb-3 pt-1 grid grid-cols-2 gap-x-4">
      <PropertyRow icon={<Activity size={13} />} label="Status">
        <SearchableStatusPopover
          value={form.status}
          onChange={(status) => onStatusChange(status as Task['status'])}
          open={statusOpen}
          onOpenChange={setStatusOpen}
        />
      </PropertyRow>

      <PropertyRow icon={<Flag size={13} />} label="Priority">
        <SearchablePriorityPopover
          value={form.priority}
          onChange={onPriorityChange}
          open={priorityOpen}
          onOpenChange={setPriorityOpen}
        />
      </PropertyRow>

      <PropertyRow icon={<User size={13} />} label="Assignee">
        <SearchableAssigneePopover
          value={form.assignee}
          onChange={onAssigneeChange}
          open={assigneeOpen}
          onOpenChange={setAssigneeOpen}
          metadata={assigneeMetadata}
          projectId={form.project_id}
        />
      </PropertyRow>

      <PropertyRow icon={<Folder size={13} />} label="Project">
        <SearchableProjectPopover
          value={
            form.project_id
              ? {
                  id: form.project_id,
                  name: projects.find((p) => p.id === form.project_id)?.name || '',
                  color: projects.find((p) => p.id === form.project_id)?.color || '',
                }
              : null
          }
          projects={projects}
          onChange={(project) => onProjectChange(project?.id || '')}
          open={projectOpen}
          onOpenChange={setProjectOpen}
        />
      </PropertyRow>

      <PropertyRow icon={<CalendarIcon size={13} />} label="Start date">
        <div className="flex items-center gap-1.5 group">
          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
            <PopoverTrigger asChild>
              <button className={`text-[13px] whitespace-nowrap hover:text-foreground/80 transition-colors duration-150 hover:bg-muted/40 rounded px-1.5 py-0.5 ${!form.start_date ? 'text-muted-foreground/30' : ''}`}>
                {formatRelativeDate(form.start_date)}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <EnhancedDatePicker
                date={form.start_date}
                time=""
                onDateChange={onStartDateChange}
                onTimeChange={() => {}}
                onClear={onClearStartDate}
                onOpenChange={setStartDateOpen}
              />
            </PopoverContent>
          </Popover>
          {form.start_date && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onClearStartDate} className="p-1 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors duration-150 opacity-0 group-hover:opacity-100">
                  <X size={11} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[11px]">Clear</TooltipContent>
            </Tooltip>
          )}
        </div>
      </PropertyRow>

      <PropertyRow icon={<CalendarIcon size={13} />} label="End date">
        <div className="flex items-center gap-1.5 group">
          <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
            <PopoverTrigger asChild>
              <button className={`text-[13px] whitespace-nowrap hover:text-foreground/80 transition-colors duration-150 hover:bg-muted/40 rounded px-1.5 py-0.5 ${!form.due_date ? 'text-muted-foreground/30' : ''}`}>
                {formatRelativeDate(form.due_date)}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <EnhancedDatePicker
                date={form.due_date}
                time={form.due_time}
                onDateChange={onDueDateChange}
                onTimeChange={onDueTimeChange}
                onClear={onClearDueDate}
                onOpenChange={setDueDateOpen}
              />
            </PopoverContent>
          </Popover>
          {(form.due_date || form.due_time) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onClearDueDate} className="p-1 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors duration-150 opacity-0 group-hover:opacity-100">
                  <X size={11} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[11px]">Clear</TooltipContent>
            </Tooltip>
          )}
        </div>
      </PropertyRow>

      <PropertyRow icon={<Tag size={13} />} label="Labels">
        <LabelCombobox
          selectedLabels={form.labels}
          allLabels={allLabels}
          onChange={onLabelsChange}
          externalOpen={labelsOpen}
          onOpenChange={setLabelsOpen}
        />
      </PropertyRow>
    </div>
  );
}
