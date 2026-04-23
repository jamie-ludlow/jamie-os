'use client';

import { useMobileSidebar } from './mobile-sidebar-context';
import { Topbar } from './topbar';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { isControlCenterReaderPath } from '@/components/control-center/reader-mode';

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useMobileSidebar();
  const pathname = usePathname();
  const isReaderMode = isControlCenterReaderPath(pathname);
  const isAuthPage = pathname.startsWith('/login') || pathname === '/reset-password';

  return (
    <main
      id="main-content"
      className={cn(
        'flex-1 bg-background transition-all duration-300',
        isAuthPage ? 'overflow-hidden md:ml-0' : 'overflow-y-auto',
        !isAuthPage && (isReaderMode ? 'md:ml-0' : collapsed ? 'md:ml-16' : 'md:ml-56')
      )}
      tabIndex={-1}
    >
      {!isReaderMode && !isAuthPage && <Topbar />}
      <div className={cn(
        isAuthPage
          ? 'h-full px-0 py-0'
          : isReaderMode
            ? 'px-3 py-4 sm:px-4 sm:py-6'
            : 'px-4 py-3 sm:px-6 sm:py-4'
      )}>{children}</div>
    </main>
  );
}
