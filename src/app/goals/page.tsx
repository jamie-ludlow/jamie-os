'use client';

import { GoalsPage } from '@/components/goals/goals-page';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function Goals() {
  return (
    <ErrorBoundary fallbackTitle="Goals failed to load" fallbackSubtitle="Something went wrong loading goals. Try again.">
      <GoalsPage />
    </ErrorBoundary>
  );
}
