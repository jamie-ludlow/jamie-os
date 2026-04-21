'use client';

interface TaskSheetFooterProps {
  onDiscard: () => void;
  onCreate: () => Promise<void>;
}

export function TaskSheetFooter({ onDiscard, onCreate }: TaskSheetFooterProps) {
  return (
    <div className="px-5 py-3 border-t border-border/20 flex items-center justify-between sticky bottom-0 bg-card z-10">
      <button
        onClick={onDiscard}
        className="px-3 py-1.5 text-[13px] text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40 rounded-md transition-colors duration-150"
      >
        Discard
      </button>
      <button
        onClick={onCreate}
        className="px-4 py-1.5 text-[13px] bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors duration-150 font-medium"
      >
        Create task
      </button>
    </div>
  );
}
