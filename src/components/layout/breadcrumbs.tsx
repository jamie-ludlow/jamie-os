'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

const PAGE_NAMES: Record<string, string> = {
  '': 'Dashboard',
  'board': 'Board',
  'calendar': 'Calendar',
  'documents': 'Documents',
  'control-center': 'OpenClaw Control Center',
  'goals': 'Goals',
  'projects': 'Projects',
  'changelog': 'Changelog',
  'agents': 'Agents',
  'journal': 'Journal',
  'sops': 'SOPs',
  'resources': 'Resources',
  'activity': 'Activity',
  'settings': 'Settings',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  
  const segments = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    
    const breadcrumbs = [
      { label: 'Home', href: '/', isLast: parts.length === 0 }
    ];
    
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += `/${part}`;
      
      // Skip UUIDs and numeric IDs
      if (/^[0-9a-f-]{36}$/i.test(part) || /^\d+$/.test(part)) {
        continue;
      }
      
      const label = PAGE_NAMES[part] || part.charAt(0).toUpperCase() + part.slice(1);
      const isLast = i === parts.length - 1;
      
      breadcrumbs.push({
        label,
        href: currentPath,
        isLast,
      });
    }
    
    return breadcrumbs;
  }, [pathname]);

  if (segments.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      {segments.map((segment, index) => (
        <div key={segment.href} className="flex items-center gap-1.5">
          {index > 0 && (
            <ChevronRight className="h-3 w-3 opacity-50" />
          )}
          {segment.isLast ? (
            <span className="text-foreground font-medium truncate max-w-[200px]">{segment.label}</span>
          ) : (
            <Link
              href={segment.href}
              className="hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {segment.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
