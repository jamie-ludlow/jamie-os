'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UsagePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/agents');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-[13px] text-muted-foreground">Redirecting to Agents page…</p>
    </div>
  );
}
