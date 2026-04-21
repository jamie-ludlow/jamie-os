'use client';

import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="rounded-lg border border-border/20 bg-card px-10 py-8 max-w-md w-full text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted/40">
          <FileQuestion className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">Page not found</h1>
        <p className="text-[13px] text-muted-foreground mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Go back
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
