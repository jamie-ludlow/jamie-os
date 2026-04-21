'use client';

import { AgentsPage } from '@/components/agents/agents-page';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function Agents() {
  return (
    <ErrorBoundary fallbackTitle="Agents failed to load" fallbackSubtitle="Something went wrong loading agents. Try again.">
      <AgentsPage />
    </ErrorBoundary>
  );
}
