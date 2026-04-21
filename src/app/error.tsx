'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="rounded-lg border border-border/20 bg-card px-10 py-8 max-w-md w-full text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">Something went wrong</h1>
        <p className="text-[13px] text-muted-foreground mb-6">
          An unexpected error occurred. You can try again or head back to the dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </Button>
          <Button size="sm" asChild>
            <Link href="/">
              <Home className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
