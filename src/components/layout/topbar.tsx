'use client';

import Link from 'next/link';
import { GlobalSearch } from '@/components/search/global-search';
import { useTheme } from '@/components/layout/theme-provider';
import { Sun, Moon, Settings, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ScheduleToggle } from '@/components/layout/schedule-toggle';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useMobileSidebar } from './mobile-sidebar-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';

export function Topbar() {
  const { theme, toggle } = useTheme();
  const { toggle: toggleSidebar } = useMobileSidebar();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <header aria-label="Top bar" className="sticky top-0 z-30 flex h-12 items-center justify-between gap-4 border-b border-border/20 bg-background/80 px-4 backdrop-blur-sm">
      {/* Left: Hamburger (mobile only) */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 md:hidden"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Right: Actions */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block mr-2">
            <GlobalSearch />
          </div>
          <ErrorBoundary fallback={<div />}>
            <ScheduleToggle />
          </ErrorBoundary>
          <NotificationBell />
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/settings">
                <button className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.95] transition-all duration-150 hidden sm:inline-flex" aria-label="Settings">
                  <Settings size={16} />
                </button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[12px]">Settings</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={toggle} className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.95] transition-all duration-150" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[12px]">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={handleSignOut} className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.95] transition-all duration-150" aria-label="Sign out">
                <LogOut size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[12px]">Sign out</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </header>
  );
}
