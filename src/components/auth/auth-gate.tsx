'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const showSkipLink = pathname !== '/login' && !pathname.startsWith('/reset-password');

  useEffect(() => {
    let mounted = true;
    if (pathname === '/login' || pathname.startsWith('/reset-password')) {
      setReady(true);
      return;
    }

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setReady(true);
    };

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session && pathname !== '/login') {
        router.replace('/login');
        return;
      }
      setReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (pathname === '/login') return <>{children}</>;
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading Jamie OS…
      </div>
    );
  }

  return (
    <>
      {showSkipLink ? (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-[13px] focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
      ) : null}
      {children}
    </>
  );
}
