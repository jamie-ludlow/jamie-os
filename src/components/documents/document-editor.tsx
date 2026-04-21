'use client';

import { useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Heading from '@tiptap/extension-heading';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3, List, ListOrdered, Code, Quote, Undo2, Redo2 } from 'lucide-react';

interface DocumentEditorProps {
  documentId: string;
  documentPath: string;
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  placeholder?: string;
}

function ToolbarButton({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

export function DocumentEditor({ documentId, documentPath, initialContent, onSave, placeholder = 'Start writing...' }: DocumentEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedHtml = useRef(initialContent);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[300px] px-0 py-2 [&_table]:border-collapse [&_td]:border [&_td]:border-border/20 [&_td]:p-2 [&_th]:border [&_th]:border-border/20 [&_th]:p-2 [&_th]:bg-muted/20',
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Debounced save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus('saving');
      saveTimerRef.current = setTimeout(async () => {
        const html = ed.getHTML();
        if (html === lastSavedHtml.current) {
          setSaveStatus((s) => s === 'saving' ? 'idle' : s);
          return;
        }
        try {
          await onSave(html);
          lastSavedHtml.current = html;
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus((s) => s === 'saved' ? 'idle' : s), 2000);
        } catch {
          setSaveStatus('error');
        }
      }, 1000);
    },
  });

  if (!editor) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border/20 pb-2 mb-2">
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <div className="w-px h-4 bg-border/20 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <Heading1 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <div className="w-px h-4 bg-border/20 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">
            <Code className="h-3.5 w-3.5" />
          </ToolbarButton>
          <div className="w-px h-4 bg-border/20 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
            <Undo2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
            <Redo2 className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>

        <div className="flex-1" />

        {/* Save status */}
        <div className="text-[11px] text-muted-foreground/40">
          {saveStatus === 'saving' && <span className="animate-pulse">Saving...</span>}
          {saveStatus === 'saved' && <span>Saved</span>}
          {saveStatus === 'error' && <span className="text-destructive/60">Save failed</span>}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
