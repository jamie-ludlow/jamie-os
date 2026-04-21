'use client';

import { TaskAgentActivity } from '@/components/tasks/task-agent-activity';
import { activityIcon } from './task-sheet-utils';

interface ActivityEntry {
  id: string;
  text: string;
  time: string;
  icon: string;
}

interface TaskSheetActivityProps {
  activityLog: ActivityEntry[];
  taskId?: string;
}

export function TaskSheetActivity({ activityLog, taskId }: TaskSheetActivityProps) {
  // If we have a task ID, show agent activity from the database
  if (taskId) {
    return <TaskAgentActivity taskId={taskId} />;
  }

  // Otherwise, fall back to session-only activity (for new tasks)
  return (
    <div className="px-5 py-3">
      <p className="text-[11px] text-muted-foreground/30 mb-3">
        * This session only — activity is not persisted.
      </p>
      <div className="space-y-2">
        {activityLog.map((a) => (
          <div key={a.id} className="flex items-center gap-2 py-1">
            <span className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground/60">
              {activityIcon(a.icon)}
            </span>
            <span className="text-[13px] text-muted-foreground/60 flex-1">{a.text}</span>
            <span className="text-[11px] text-muted-foreground/30">{a.time}</span>
          </div>
        ))}
        {activityLog.length === 0 && (
          <p className="text-[13px] text-muted-foreground/30">No activity yet</p>
        )}
      </div>
    </div>
  );
}
