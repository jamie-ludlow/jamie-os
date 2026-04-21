'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, ListChecks, FolderKanban, FileText, Target, Users, ChevronLeft, ChevronRight, Activity, Rocket, Search, Clock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { AgentStatus } from '@/lib/types';
import { useMobileSidebar } from './mobile-sidebar-context';
import { isControlCenterReaderPath } from '@/components/control-center/reader-mode';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/board', label: 'Tasks', icon: ListChecks },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/control-center', label: 'OpenClaw Control', icon: ShieldCheck },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/running', label: 'Running', icon: Activity },
  { href: '/agents', label: 'Agents', icon: Users },
];

type Agent = AgentStatus & { activity?: string | null };

export function Sidebar() {
  const pathname = usePathname();
  const isReaderMode = isControlCenterReaderPath(pathname);
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const { open: mobileOpen, close: mobileClose, collapsed, setCollapsed } = useMobileSidebar();
  
  // Agent panel hover state
  const ghostRef = useRef<HTMLButtonElement>(null);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  
  // Sidebar collapse state
  const [pendingProposalsCount, setPendingProposalsCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchPendingProposals = async () => {
      try {
        const res = await fetch('/api/proposals');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          // Count items with 'request' status (pending review in the unified changelog)
          setPendingProposalsCount(data.filter((p: { status: string }) => p.status === 'request').length);
        }
      } catch {
        // silently ignore
      }
    };

    fetchPendingProposals();

    const proposalsChannel = supabase
      .channel('sidebar_proposals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => {
        if (mounted) fetchPendingProposals();
      })
      .subscribe();

    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents/status');
        if (!res.ok) return;
        const data: Agent[] = await res.json();
        if (mounted) setAgents(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setAgents([]);
      }
    };

    // Initial fetch
    fetchAgents();

    // Set up Supabase Realtime subscription for instant updates
    const channel = supabase
      .channel('agent_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_status'
        },
        () => {
          // Refetch agents when any change occurs
          if (mounted) fetchAgents();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(proposalsChannel);
      supabase.removeChannel(channel);
    };
  }, []);

  const sortedAgents = useMemo(() => {
    const filtered = agents.filter((a) => a.id !== 'jamie');
    return [...filtered].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      const aTime = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
      const bTime = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [agents]);
  const isWorking = sortedAgents.some((a) => a.status === 'active');
  
  // Determine ghost activity icon based on Casper's current activity
  const casperAgent = agents.find((a) => a.id === 'casper');
  const activityType = casperAgent?.activity?.toLowerCase() || '';
  
  const getActivityIcon = () => {
    if (activityType.includes('deploy')) return <Rocket className="h-2 w-2 text-primary/80" />;
    if (activityType.includes('review') || activityType.includes('qa')) return <Search className="h-2 w-2 text-primary/80" />;
    if (activityType.includes('wait')) return <Clock className="h-2 w-2 text-primary/80" />;
    // Default: thought bubble dots (thinking)
    if (isWorking) {
      return (
        <div className="flex space-x-0.5">
          <span className="h-0.5 w-0.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="h-0.5 w-0.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '200ms' }} />
          <span className="h-0.5 w-0.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      );
    }
    return null;
  };

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const timeAgo = (iso: string | null) => {
    if (!iso) return 'Never';
    const diff = now - new Date(iso).getTime();
    if (diff < 60000) return 'Just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} mins ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 2) return '1 hour ago';
    if (hrs < 24) return `${hrs} hours ago`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  };

  // Handle agent panel hover
  const handleGhostMouseEnter = () => {
    if (ghostRef.current) {
      const rect = ghostRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 8, left: rect.left });
    }
    setShowAgentPanel(true);
  };

  const handleGhostMouseLeave = () => {
    // Delay to allow mouse to move to panel
    setTimeout(() => {
      if (!showAgentPanel) return; // Already hidden
      setShowAgentPanel(false);
    }, 100);
  };

  const handlePanelMouseEnter = () => {
    setShowAgentPanel(true);
  };

  const handlePanelMouseLeave = () => {
    setShowAgentPanel(false);
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    mobileClose();
  }, [pathname, mobileClose]);

  // Listen for toggle sidebar shortcut
  useEffect(() => {
    const handleToggle = () => {
      setCollapsed(!collapsed);
    };

    window.addEventListener('shortcut:toggle-sidebar', handleToggle);
    return () => window.removeEventListener('shortcut:toggle-sidebar', handleToggle);
  }, [collapsed, setCollapsed]);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  if (isReaderMode) return null;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={mobileClose}
          aria-hidden="true"
        />
      )}
      <aside className={cn(
        'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border/20 bg-card transition-all duration-300 ease-out',
        'md:translate-x-0 md:z-40',
        collapsed ? 'w-16' : 'w-56',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
      <div className={cn(
        'flex h-[72px] items-center border-b border-border/20 transition-all duration-300',
        collapsed ? 'justify-center px-0' : 'gap-4 px-5'
      )}>
        <button
          ref={ghostRef}
          type="button"
          onClick={() => router.push('/agents')}
          onMouseEnter={handleGhostMouseEnter}
          onMouseLeave={handleGhostMouseLeave}
          className="group relative z-[60] flex h-9 w-9 items-center justify-center shrink-0 rounded-lg translate-y-[1px] focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          aria-label="View active agents"
        >
          <span className="relative inline-flex items-center justify-center">
            <span
              className={cn(
                'text-xl transition-all duration-500 ease-out',
                isWorking ? 'ghost-working' : 'ghost-idle'
              )}
            >
              👻
            </span>
            {!isWorking && (
              <span className="zzz-container absolute -top-1 -right-2 text-[8px] text-primary/60 pointer-events-none">
                <span className="zzz-letter-1">z</span>
                <span className="zzz-letter-2">z</span>
                <span className="zzz-letter-3">z</span>
              </span>
            )}
            {/* Activity icon overlay */}
            {(() => {
              const icon = isWorking ? getActivityIcon() : null;
              return icon ? (
                <span className="absolute -top-1 -right-2 flex items-center justify-center w-3 h-3 rounded-full bg-background border border-border/20 shadow-sm">
                  {icon}
                </span>
              ) : null;
            })()}
          </span>
        </button>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[13px] font-bold tracking-tight truncate" role="heading" aria-level={2}>Mission Control</div>
            <p className="text-[10px] text-muted-foreground truncate">powered by Casper</p>
          </div>
        )}
      </div>

      <nav aria-label="Main navigation" className={cn('space-y-0.5 py-2 transition-all duration-300', collapsed ? 'px-2' : 'px-3')}>
        {nav.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-lg text-[13px] font-medium transition-all duration-150 ease-out relative group focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                collapsed ? 'justify-center px-2.5 py-2.5' : 'gap-2.5 px-2.5 py-[7px]',
                isActive
                  ? 'bg-primary/[0.08] text-primary before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-primary before:rounded-full before:transition-all before:duration-200'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              )}
            >
              <item.icon className="h-[15px] w-[15px] shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!collapsed && item.href === '/changelog' && pendingProposalsCount > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold px-1">
                  {pendingProposalsCount}
                </span>
              )}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2 rounded-md bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 whitespace-nowrap border border-border/20">
                  {item.label}
                  {item.href === '/changelog' && pendingProposalsCount > 0 && ` (${pendingProposalsCount})`}
                </span>
              )}
              {collapsed && item.href === '/changelog' && pendingProposalsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white px-0.5">
                  {pendingProposalsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={cn('mt-auto border-t border-border/20 transition-all duration-300', collapsed ? 'px-2' : 'px-4')}>
        <button
          onClick={toggleCollapsed}
          className={cn(
            'w-full flex items-center py-2.5 rounded-md hover:bg-muted/40 transition-colors text-muted-foreground/60 hover:text-foreground',
            collapsed ? 'justify-center' : 'gap-2 px-2'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span className="text-[12px]">Collapse</span>}
        </button>
      </div>
      <div className={cn('border-t border-border/20 py-3 transition-all duration-300', collapsed ? 'px-2' : 'px-4')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-[11px] font-bold text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
            JL
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">Jamie Ludlow</p>
              <p className="text-[10px] text-muted-foreground">Owner</p>
            </div>
          )}
        </div>
      </div>

      {/* Agent panel portal */}
      {showAgentPanel && typeof document !== 'undefined' && createPortal(
        <div
          style={{ 
            position: 'fixed', 
            top: panelPos.top, 
            left: panelPos.left, 
            zIndex: 9999 
          }}
          className="w-56 rounded-lg border border-border/40 bg-[#0f1012] px-3 py-2.5 shadow-2xl pointer-events-auto"
          onMouseEnter={handlePanelMouseEnter}
          onMouseLeave={handlePanelMouseLeave}
        >
          <p className="text-[11px] font-medium text-muted-foreground mb-2">Agents</p>
          <div className="space-y-1.5">
            {sortedAgents.map((agent) => (
              <div key={agent.id} className="flex items-center gap-2">
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full shrink-0',
                  agent.status === 'active' ? 'bg-status-success shadow-[0_0_4px_hsl(var(--status-success)/0.6)]' : 'bg-muted-foreground'
                )} />
                <span className={cn(
                  'text-[11px]',
                  agent.status === 'active' ? 'text-foreground' : 'text-muted-foreground'
                )}>{agent.name}</span>
                <span className="text-[10px] text-muted-foreground/60 ml-auto">{agent.status === 'active' ? 'Active' : timeAgo(agent.last_active_at)}</span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      <style jsx>{`
        .ghost-idle {
          animation: ghost-sleep-breathe 5s ease-in-out infinite;
          opacity: 0.65;
          filter: grayscale(0.2) brightness(0.85);
        }
        .ghost-working {
          animation: ghost-energetic 0.8s ease-in-out infinite;
          opacity: 1;
          filter: drop-shadow(0 0 12px rgba(129, 140, 248, 0.8));
        }
        
        /* Sleeping ghost: tilted, breathing pulse */
        @keyframes ghost-sleep-breathe {
          0%, 100% {
            transform: translateY(0px) rotate(-8deg) scale(0.96);
          }
          50% {
            transform: translateY(-1px) rotate(-6deg) scale(1.02);
          }
        }
        
        /* Working ghost: energetic bounce with wiggle */
        @keyframes ghost-energetic {
          0% {
            transform: translateY(0px) translateX(0px) rotate(0deg) scale(1);
            filter: drop-shadow(0 0 8px rgba(129, 140, 248, 0.6));
          }
          25% {
            transform: translateY(-4px) translateX(1px) rotate(1deg) scale(1.05);
            filter: drop-shadow(0 0 16px rgba(129, 140, 248, 0.9));
          }
          50% {
            transform: translateY(-6px) translateX(0px) rotate(0deg) scale(1.08);
            filter: drop-shadow(0 0 20px rgba(129, 140, 248, 1)) drop-shadow(0 0 6px rgba(255, 255, 255, 0.4));
          }
          75% {
            transform: translateY(-4px) translateX(-1px) rotate(-1deg) scale(1.05);
            filter: drop-shadow(0 0 16px rgba(129, 140, 248, 0.9));
          }
          100% {
            transform: translateY(0px) translateX(0px) rotate(0deg) scale(1);
            filter: drop-shadow(0 0 8px rgba(129, 140, 248, 0.6));
          }
        }
        
        /* Floating zzz animation */
        .zzz-container {
          animation: zzz-container-float 3s ease-in-out infinite;
        }
        
        .zzz-letter-1, .zzz-letter-2, .zzz-letter-3 {
          display: inline-block;
          animation: zzz-float 2.5s ease-out infinite;
          opacity: 0;
        }
        
        .zzz-letter-1 {
          animation-delay: 0s;
        }
        .zzz-letter-2 {
          animation-delay: 0.3s;
        }
        .zzz-letter-3 {
          animation-delay: 0.6s;
        }
        
        @keyframes zzz-container-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        
        @keyframes zzz-float {
          0% {
            transform: translateY(0px) scale(0.8);
            opacity: 0;
          }
          20% {
            opacity: 0.8;
            transform: translateY(-2px) scale(1);
          }
          80% {
            opacity: 0.4;
            transform: translateY(-12px) scale(0.9);
          }
          100% {
            opacity: 0;
            transform: translateY(-16px) scale(0.7);
          }
        }
      `}</style>
    </aside>
    </>
  );
}
