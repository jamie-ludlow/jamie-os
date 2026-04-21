'use client';

import { useKeyboardShortcuts, SHORTCUTS } from '@/hooks/use-keyboard-shortcuts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const { helpOpen, setHelpOpen } = useKeyboardShortcuts();

  return (
    <>
      {children}
      
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="border border-border/20 bg-background max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {SHORTCUTS.map((s) => (
              <div key={s.description} className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">{s.description}</span>
                <div className="flex items-center gap-1">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border/20 bg-muted px-1.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
