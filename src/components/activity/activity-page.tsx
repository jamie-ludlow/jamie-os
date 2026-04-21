'use client';

import { useSearchParams } from 'next/navigation';
import { ActivityFeed } from '@/components/activity/activity-feed';

export function ActivityPageContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  return (
    <div className="text-foreground">
      <div className="flex w-full flex-col gap-5">
        <div className="space-y-2">
          <span className="text-[11px] font-medium text-muted-foreground">Activity</span>
          <h1 className="text-2xl font-bold tracking-tight">Mission Control activity</h1>
          <p className="text-[13px] text-muted-foreground">
            Live timeline of actions across tasks, projects, and documents.
          </p>
        </div>
        <ActivityFeed highlightId={highlightId} />
      </div>
    </div>
  );
}
