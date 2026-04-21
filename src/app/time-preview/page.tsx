'use client';
import { Clock } from 'lucide-react';

export default function TimePreviewPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-2">Date + Time Display Options</h1>
      <p className="text-[13px] text-muted-foreground/60 mb-8">Pick the separator style that feels right</p>

      {/* Option 1 — Minimal (space + opacity) */}
      <div className="bg-card/50 rounded-xl border border-border/20 p-5 mb-4">
        <h2 className="text-[13px] font-medium mb-4 text-foreground/70">Option 1 — Minimal</h2>
        
        <div className="space-y-3">
          {/* Main task context */}
          <div className="flex items-center gap-3 text-[13px]">
            <span>📅 Due date</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">6 May '27</span>
              <span className="text-[13px] text-foreground/50 ml-2">16:22</span>
            </div>
          </div>

          {/* Subtask context */}
          <div className="flex items-center gap-3 text-[13px]">
            <span>☑ Fix the bug</span>
            <span className="text-muted-foreground/30">[D]</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">6 May '27</span>
              <span className="text-[13px] text-foreground/50 ml-2">16:22</span>
            </div>
            <span className="ml-auto">🗑</span>
          </div>

          {/* Without time */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground/60">Without time:</span>
            <span className="text-[13px] text-foreground/90">6 May '27</span>
          </div>

          {/* With relative date */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground/60">Relative:</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">Tomorrow</span>
              <span className="text-[13px] text-foreground/50 ml-2">16:22</span>
            </div>
          </div>
        </div>
      </div>

      {/* Option 2 — "at" separator */}
      <div className="bg-card/50 rounded-xl border border-border/20 p-5 mb-4">
        <h2 className="text-[13px] font-medium mb-4 text-foreground/70">Option 2 — 'at' separator</h2>
        
        <div className="space-y-3">
          {/* Main task context */}
          <div className="flex items-center gap-3 text-[13px]">
            <span>📅 Due date</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">6 May '27</span>
              <span className="text-[13px] text-foreground/60 mx-1">at</span>
              <span className="text-[13px] text-foreground/60">16:22</span>
            </div>
          </div>

          {/* Subtask context */}
          <div className="flex items-center gap-3 text-[13px]">
            <span>☑ Fix the bug</span>
            <span className="text-muted-foreground/30">[D]</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">6 May '27</span>
              <span className="text-[13px] text-foreground/60 mx-1">at</span>
              <span className="text-[13px] text-foreground/60">16:22</span>
            </div>
            <span className="ml-auto">🗑</span>
          </div>

          {/* Without time */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground/60">Without time:</span>
            <span className="text-[13px] text-foreground/90">6 May '27</span>
          </div>

          {/* With relative date */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground/60">Relative:</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">Tomorrow</span>
              <span className="text-[13px] text-foreground/60 mx-1">at</span>
              <span className="text-[13px] text-foreground/60">16:22</span>
            </div>
          </div>
        </div>
      </div>

      {/* Option 3 — Time in pill/badge */}
      <div className="bg-card/50 rounded-xl border border-border/20 p-5 mb-4">
        <h2 className="text-[13px] font-medium mb-4 text-foreground/70">Option 3 — Time in pill/badge</h2>
        
        <div className="space-y-3">
          {/* Main task context */}
          <div className="flex items-center gap-3 text-[13px]">
            <span>📅 Due date</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">6 May '27</span>
              <span className="text-[11px] text-muted-foreground/60 bg-muted/40 rounded-full px-2 py-0.5 ml-2">16:22</span>
            </div>
          </div>

          {/* Subtask context */}
          <div className="flex items-center gap-3 text-[13px]">
            <span>☑ Fix the bug</span>
            <span className="text-muted-foreground/30">[D]</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">6 May '27</span>
              <span className="text-[11px] text-muted-foreground/60 bg-muted/40 rounded-full px-2 py-0.5 ml-2">16:22</span>
            </div>
            <span className="ml-auto">🗑</span>
          </div>

          {/* Without time */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground/60">Without time:</span>
            <span className="text-[13px] text-foreground/90">6 May '27</span>
          </div>

          {/* With relative date */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground/60">Relative:</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">Tomorrow</span>
              <span className="text-[11px] text-muted-foreground/60 bg-muted/40 rounded-full px-2 py-0.5 ml-2">16:22</span>
            </div>
          </div>
        </div>
      </div>

      {/* Option 4 — Clock icon separator */}
      <div className="bg-card/50 rounded-xl border border-border/20 p-5 mb-4">
        <h2 className="text-[13px] font-medium mb-4 text-foreground/70">Option 4 — Clock icon separator</h2>
        
        <div className="space-y-3">
          {/* Main task context */}
          <div className="flex items-center gap-3 text-[13px]">
            <span>📅 Due date</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">6 May '27</span>
              <Clock size={10} className="text-muted-foreground/30 ml-2 mr-1" />
              <span className="text-[13px] text-foreground/60">16:22</span>
            </div>
          </div>

          {/* Subtask context */}
          <div className="flex items-center gap-3 text-[13px]">
            <span>☑ Fix the bug</span>
            <span className="text-muted-foreground/30">[D]</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">6 May '27</span>
              <Clock size={10} className="text-muted-foreground/30 ml-2 mr-1" />
              <span className="text-[13px] text-foreground/60">16:22</span>
            </div>
            <span className="ml-auto">🗑</span>
          </div>

          {/* Without time */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground/60">Without time:</span>
            <span className="text-[13px] text-foreground/90">6 May '27</span>
          </div>

          {/* With relative date */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground/60">Relative:</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">Tomorrow</span>
              <Clock size={10} className="text-muted-foreground/30 ml-2 mr-1" />
              <span className="text-[13px] text-foreground/60">16:22</span>
            </div>
          </div>
        </div>
      </div>

      {/* Option 5 — Slash with accent */}
      <div className="bg-card/50 rounded-xl border border-border/20 p-5 mb-4">
        <h2 className="text-[13px] font-medium mb-4 text-foreground/70">Option 5 — Slash with accent</h2>
        
        <div className="space-y-3">
          {/* Main task context */}
          <div className="flex items-center gap-3 text-[13px]">
            <span>📅 Due date</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">6 May '27</span>
              <span className="text-[13px] text-primary/30 mx-1.5">/</span>
              <span className="text-[13px] text-primary/60">16:22</span>
            </div>
          </div>

          {/* Subtask context */}
          <div className="flex items-center gap-3 text-[13px]">
            <span>☑ Fix the bug</span>
            <span className="text-muted-foreground/30">[D]</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">6 May '27</span>
              <span className="text-[13px] text-primary/30 mx-1.5">/</span>
              <span className="text-[13px] text-primary/60">16:22</span>
            </div>
            <span className="ml-auto">🗑</span>
          </div>

          {/* Without time */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground/60">Without time:</span>
            <span className="text-[13px] text-foreground/90">6 May '27</span>
          </div>

          {/* With relative date */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground/60">Relative:</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">Tomorrow</span>
              <span className="text-[13px] text-primary/30 mx-1.5">/</span>
              <span className="text-[13px] text-primary/60">16:22</span>
            </div>
          </div>
        </div>
      </div>
      {/* Option 6 — "at" separator, same colour */}
      <div className="bg-card/50 rounded-xl border border-border/20 p-5 mb-4">
        <h2 className="text-[13px] font-medium mb-4 text-foreground/70">Option 6 — "at" separator, same colour</h2>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[13px]">
            <span>📅 Due date</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">6 May &apos;27</span>
              <span className="text-[13px] text-foreground/90 mx-1">at</span>
              <span className="text-[13px] text-foreground/90">16:22</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[13px]">
            <span>☑ Fix the bug</span>
            <span className="text-muted-foreground/30">[D]</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">6 May &apos;27</span>
              <span className="text-[13px] text-foreground/90 mx-1">at</span>
              <span className="text-[13px] text-foreground/90">16:22</span>
            </div>
            <span className="text-muted-foreground/30">🗑</span>
          </div>

          <div className="flex items-center gap-3 text-[13px]">
            <span>📅 Due date</span>
            <span className="text-[13px] text-foreground/90">6 May &apos;27</span>
          </div>

          <div className="flex items-center gap-3 text-[13px]">
            <span>📅 Due date</span>
            <div className="flex items-center">
              <span className="text-[13px] text-foreground/90">Tomorrow</span>
              <span className="text-[13px] text-foreground/90 mx-1">at</span>
              <span className="text-[13px] text-foreground/90">16:22</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
