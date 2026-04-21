import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { SettingsPage } from '@/components/settings/settings-page';

export const metadata: Metadata = { title: 'Settings' };

export default function Settings() {
  return (
    <ErrorBoundary fallbackTitle="Settings failed to load" fallbackSubtitle="Something went wrong loading settings. Try again.">
      <SettingsPage />
    </ErrorBoundary>
  );
}
