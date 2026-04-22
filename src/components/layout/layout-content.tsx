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

  return (
    <main
      id="main-content"
      className={cn(
        'flex-1 overflow-y-auto bg-background transition-all duration-300',
        isReaderMode ? 'md:ml-0' : collapsed ? 'md:ml-16' : 'md:ml-56'
      )}
      tabIndex={-1}
    >
      {!isReaderMode && pathname !== '/auth' && <Topbar />}
      <div className={cn(isReaderMode ? 'px-3 py-4 sm:px-4 sm:py-6' : 'px-4 py-3 sm:px-6 sm:py-4')}>{children}</div>
    </main>
  );
}
