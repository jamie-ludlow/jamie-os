'use client';

import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface TaskSheetTabsProps {
  activeTab: 'details' | 'comments' | 'activity';
  onTabChange: (tab: 'details' | 'comments' | 'activity') => void;
  commentCount: number;
  taskId?: string;
}

export function TaskSheetTabs({ activeTab, onTabChange, commentCount, taskId }: TaskSheetTabsProps) {
  // Only show asterisk if this is a new task (no taskId)
  const showActivityAsterisk = !taskId;

  return (
    <div className="flex items-center gap-1 px-5 py-2">
      {(['details', 'comments', 'activity'] as const).map(tab => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-3 py-1.5 text-[13px] font-medium capitalize rounded-full transition-colors duration-150 ${
            activeTab === tab
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/40'
          }`}
        >
          {tab === 'activity' && showActivityAsterisk ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>Activity *</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[13px]">
                Activity is tracked for this session only
              </TooltipContent>
            </Tooltip>
          ) : (
            tab
          )}
          {tab === 'comments' && commentCount > 0 && (
            <span
              className={`ml-1.5 -mr-1 text-[10px] rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center font-medium ${
                activeTab === 'comments'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted/40 text-muted-foreground/30'
              }`}
            >
              {commentCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
