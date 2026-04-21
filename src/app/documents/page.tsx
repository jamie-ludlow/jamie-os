'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { DocumentsPageContent } from '@/components/documents/documents-page';

export default function DocumentsRoute() {
  return (
    <ErrorBoundary fallbackTitle="Documents failed to load" fallbackSubtitle="Something went wrong loading documents. Try again.">
      <Suspense fallback={<div className="p-6"><div className="h-6 w-32 rounded bg-muted/30 animate-pulse" /></div>}>
        <DocumentsPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
