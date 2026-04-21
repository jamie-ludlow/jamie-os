'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACRONYM_MAP: Record<string, string> = {
  sop: 'SOP', sops: 'SOPs', mc: 'MC', api: 'API', ux: 'UX', ui: 'UI', ai: 'AI',
  uk: 'UK', usa: 'USA', seo: 'SEO', crm: 'CRM', csv: 'CSV', pdf: 'PDF',
  html: 'HTML', css: 'CSS', qa: 'QA',
};

interface BreadcrumbsProps {
  path: string;
  onNavigate: (path: string) => void;
  suffix?: string;
}

function toTitleCase(name: string): string {
  return name
    .split(/[-_]/)
    .map(word => ACRONYM_MAP[word.toLowerCase()] || (word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

export function Breadcrumbs({ path, onNavigate, suffix }: BreadcrumbsProps) {
  const segments = path ? path.split('/').filter(Boolean) : [];
  const crumbs = [
    { name: 'Documents', path: '' },
    ...segments.map((segment, index) => ({
      name: toTitleCase(segment),
      path: segments.slice(0, index + 1).join('/'),
    })),
  ];

  return (
    <div className="flex items-center gap-1 text-[13px]">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1 && !suffix;
        return (
          <div key={crumb.path} className="flex items-center gap-1">
            <button
              onClick={() => onNavigate(crumb.path)}
              className={cn(
                'hover:text-foreground transition-colors',
                isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              {crumb.name}
            </button>
            {(!isLast || suffix) && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            )}
          </div>
        );
      })}
      {suffix && (
        <span className="text-foreground font-medium truncate max-w-[200px]">{suffix}</span>
      )}
    </div>
  );
}
