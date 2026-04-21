'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronRight, GripVertical, Trash2, Copy } from 'lucide-react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function DetailsComponent(props: any) {
  const [isOpen, setIsOpen] = useState(props.node.attrs.open);
  const [menuOpen, setMenuOpen] = useState(false);
  const isSelectedForDeletion = props.node.attrs.selectedForDeletion || false;

  const handleDelete = () => {
    setMenuOpen(false);
    props.deleteNode();
  };

  const handleDuplicate = () => {
    setMenuOpen(false);
    const { state, dispatch } = props.editor;
    const { tr } = state;
    const pos = props.getPos();
    
    // Insert a copy of this node after the current one
    const nodeContent = props.node.toJSON();
    tr.insert(pos + props.node.nodeSize, state.schema.nodeFromJSON(nodeContent));
    dispatch(tr);
  };

  return (
    <NodeViewWrapper className="details-wrapper group">
      <div
        className={`relative transition-all duration-150 ${
          isSelectedForDeletion
            ? 'ring-2 ring-destructive/50 bg-destructive/5'
            : ''
        }`}
      >
        {/* Drag Handle and Menu */}
        <TooltipProvider delayDuration={300}>
          <div className="absolute left-0 top-0 h-[42px] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" contentEditable={false}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  data-drag-handle
                  className="px-1 cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={4}>
                <p className="text-[13px]">Drag to reorder</p>
              </TooltipContent>
            </Tooltip>

            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      className="p-1 rounded hover:bg-muted/60 transition-colors duration-150"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(!menuOpen);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors duration-150" />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={4}>
                  <p className="text-[13px]">More options</p>
                </TooltipContent>
              </Tooltip>
              
              <PopoverContent side="left" align="start" className="w-40 p-1">
                <button
                  onClick={handleDuplicate}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] rounded hover:bg-muted/60 transition-colors duration-150 text-left"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] rounded hover:bg-destructive/10 text-destructive transition-colors duration-150 text-left"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </TooltipProvider>

        <details
          open={isOpen}
          className="details-node pl-6"
          onToggle={(e) => {
            const newState = (e.target as HTMLDetailsElement).open;
            setIsOpen(newState);
            props.updateAttributes({ open: newState });
          }}
        >
          <summary className="details-summary">
            <ChevronRight className={`chevron ${isOpen ? 'open' : ''}`} />
            <span
              className="summary-text"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const text = (e.target as HTMLSpanElement).textContent || 'Click to expand';
                if (text !== props.node.attrs.summary) {
                  props.updateAttributes({ summary: text });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLSpanElement).blur();
                }
              }}
            >
              {props.node.attrs.summary || 'Click to expand'}
            </span>
          </summary>
          <div className="details-content">
            <NodeViewContent />
          </div>
        </details>
      </div>
    </NodeViewWrapper>
  );
}

export const Details = Node.create({
  name: 'details',

  group: 'block',

  content: 'block+',

  defining: true,

  draggable: true,

  addAttributes() {
    return {
      open: {
        default: false,
        parseHTML: (element) => element.hasAttribute('open'),
        renderHTML: (attributes) => {
          if (!attributes.open) {
            return {};
          }
          return { open: '' };
        },
      },
      summary: {
        default: 'Click to expand',
        parseHTML: (element) => {
          const summary = element.querySelector('summary');
          return summary?.textContent || 'Click to expand';
        },
      },
      selectedForDeletion: {
        default: false,
        rendered: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'details',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes(HTMLAttributes), ['summary', {}, HTMLAttributes.summary], ['div', {}, 0]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DetailsComponent);
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { $from } = editor.state.selection;
        const pos = $from.pos;

        // Check if cursor is at the start of a block after a details node
        if ($from.parentOffset !== 0) {
          return false;
        }

        // Get the node before cursor
        const nodeBefore = $from.nodeBefore;
        if (!nodeBefore || nodeBefore.type.name !== 'details') {
          return false;
        }

        // Find the position of the details node
        const detailsPos = pos - nodeBefore.nodeSize;
        const detailsNode = editor.state.doc.nodeAt(detailsPos);

        if (!detailsNode) {
          return false;
        }

        // If already selected for deletion, delete it
        if (detailsNode.attrs.selectedForDeletion) {
          editor
            .chain()
            .focus()
            .deleteRange({ from: detailsPos, to: pos })
            .run();
          return true;
        }

        // Otherwise, mark it for deletion
        editor
          .chain()
          .focus()
          .setNodeSelection(detailsPos)
          .updateAttributes('details', { selectedForDeletion: true })
          .run();

        // Clear the selection after a moment so user can continue typing
        setTimeout(() => {
          const currentNode = editor.state.doc.nodeAt(detailsPos);
          if (currentNode?.attrs.selectedForDeletion) {
            editor
              .chain()
              .updateAttributes('details', { selectedForDeletion: false })
              .setTextSelection(pos)
              .run();
          }
        }, 2000);

        return true;
      },
    };
  },

  addCommands() {
    return {
      setDetails:
        () =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              open: false,
              summary: 'Click to expand',
              selectedForDeletion: false,
            },
            content: [
              {
                type: 'paragraph',
                content: [],
              },
            ],
          });
        },
    } as any;
  },
});
