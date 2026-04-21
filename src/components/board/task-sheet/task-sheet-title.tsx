'use client';

import React from 'react';

interface TaskSheetTitleProps {
  value: string;
  onChange: (value: string) => void;
  titleInputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function TaskSheetTitle({ value, onChange, titleInputRef }: TaskSheetTitleProps) {
  return (
    <div className="mt-2">
      <textarea
        ref={titleInputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault();
        }}
        placeholder="Task title"
        rows={1}
        className="w-full text-[17px] font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/60 text-foreground leading-snug px-2 py-1 rounded hover:bg-muted/40 focus:bg-muted/40 focus:border-primary/30 transition-colors duration-150 -mx-1 resize-none overflow-hidden"
      />
    </div>
  );
}
