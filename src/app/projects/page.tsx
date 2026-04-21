'use client';

import { Suspense } from 'react';
import { ProjectsPageContent } from '@/components/projects/projects-page';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function ProjectsPage() {
  return (
    <ErrorBoundary fallbackTitle="Projects failed to load" fallbackSubtitle="Something went wrong loading projects. Try again.">
      <Suspense fallback={<div className="p-6"><div className="h-6 w-32 rounded bg-muted/30 animate-pulse" /></div>}>
        <ProjectsPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
