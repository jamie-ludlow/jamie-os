import React from 'react';
import { format } from 'date-fns';
import {
  Plus, ArrowRight, Zap, User, Calendar as CalendarIcon, Pencil, Activity,
} from 'lucide-react';

export function formatTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = format(d, 'HH:mm');

  if (diffDays === 0) {
    return `Today at ${timeStr}`;
  }
  if (diffDays === 1) {
    return `Yesterday at ${timeStr}`;
  }
  return format(d, "d MMM ''yy") + ` at ${timeStr}`;
}

export function activityIcon(key: string): React.ReactElement {
  const cls = 'h-3 w-3';
  switch (key) {
    case 'created': return React.createElement(Plus, { className: cls });
    case 'status': return React.createElement(ArrowRight, { className: cls });
    case 'priority': return React.createElement(Zap, { className: cls });
    case 'assignee': return React.createElement(User, { className: cls });
    case 'due_date': return React.createElement(CalendarIcon, { className: cls });
    case 'title': return React.createElement(Pencil, { className: cls });
    default: return React.createElement(Activity, { className: cls });
  }
}
