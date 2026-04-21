'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { ResizableImage } from '@/components/editor/resizable-image';
import { FileAttachment } from '@/components/editor/file-attachment';
import { createSlashCommandExtension } from '@/components/editor/slash-commands';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, ImageIcon, Paperclip } from 'lucide-react';
import { useEffect, useRef, useMemo } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface ChangelogDescriptionEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({ 
  onClick, 
  active, 
  disabled, 
  children, 
  title 
}: { 
  onClick: () => void; 
  active?: boolean; 
  disabled?: boolean; 
  children: React.ReactNode; 
  title: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`p-1.5 rounded-md transition-all ${
            active 
              ? 'bg-primary/20 text-primary dark:bg-primary/20 dark:text-primary ring-1 ring-primary/20' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px]">{title}</TooltipContent>
    </Tooltip>
  );
}

export function ChangelogDescriptionEditor({ content, onChange, placeholder = 'Release summary...' }: ChangelogDescriptionEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const slashCommands = useMemo(
    () => createSlashCommandExtension(
      () => fileInputRef.current?.click(),
      () => docInputRef.current?.click()
    ),
    []
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary dark:text-primary underline decoration-primary/30 dark:decoration-primary/30 hover:text-primary/90 dark:hover:text-primary/70 transition-colors',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      ResizableImage,
      FileAttachment,
      slashCommands,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-1.5 min-h-[72px] text-[11px] prose-p:text-[11px] prose-p:my-1 prose-li:text-[11px] prose-strong:text-foreground prose-em:text-foreground prose-a:text-primary dark:prose-a:text-primary prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        editor.commands.insertContent({ type: 'image', attrs: { src: data.url, alt: file.name } });
      }
    } catch (err) {
      console.error('Image upload failed:', err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDocUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        editor.commands.insertContent({
          type: 'fileAttachment',
          attrs: { src: data.url, fileName: data.fileName || file.name },
        });
      }
    } catch (err) {
      console.error('Document upload failed:', err);
    }
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex flex-col overflow-hidden rounded-lg border border-border/20 bg-card">
      {/* Compact Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-border/20 px-2.5 py-1.5 bg-muted/30">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (⌘B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (⌘I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline (⌘U)"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-3 bg-border mx-1" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-3 bg-border mx-1" />
        
        <ToolbarButton
          onClick={setLink}
          active={editor.isActive('link')}
          title="Insert Link (⌘K)"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-3 bg-border mx-1" />

        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="Insert Image"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <ToolbarButton
          onClick={() => docInputRef.current?.click()}
          title="Attach Document"
        >
          <Paperclip className="h-3.5 w-3.5" />
        </ToolbarButton>
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md"
          onChange={handleDocUpload}
          className="hidden"
        />
      </div>

      {/* Editor */}
      <div className="relative overflow-y-auto bg-background">
        <EditorContent editor={editor} />
        {/* Slash command hint - appears when editor is empty */}
        {editor.isEmpty && (
          <div className="absolute top-3 left-3 pointer-events-none select-none text-[13px] text-muted-foreground/30">
            Type <kbd className="px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground/40 text-[11px] font-mono">/</kbd> for commands
          </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}
