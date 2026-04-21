'use client';

import React from 'react';
import type { Comment } from '@/lib/types';
import { getInitials, toDisplayName } from '@/lib/constants';
import { MessageSquare, X, Send } from 'lucide-react';
import { formatTimestamp } from './task-sheet-utils';

interface TaskSheetCommentsProps {
  comments: Comment[];
  newComment: string;
  setNewComment: (value: string) => void;
  onAddComment: () => void;
  onDeleteComment: (commentId: string) => void;
  commentInputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function TaskSheetComments({
  comments,
  newComment,
  setNewComment,
  onAddComment,
  onDeleteComment,
  commentInputRef,
}: TaskSheetCommentsProps) {
  return (
    <div className="px-5 py-3">
      {/* Comments list */}
      <div className="space-y-3 mb-3">
        {comments.length === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground/30 mb-2" />
            <p className="text-[13px] text-muted-foreground/60">No comments yet</p>
            <p className="text-[13px] text-muted-foreground/30 mt-0.5">Be the first to add one</p>
          </div>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5 group relative">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] leading-none flex-shrink-0 mt-0.5">
              {getInitials(c.author)}
            </div>
            <button
              aria-label="Delete comment"
              onClick={() => onDeleteComment(c.id)}
              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-destructive transition-all p-1 rounded hover:bg-destructive/20"
            >
              <X size={11} aria-hidden="true" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-[13px] font-medium text-foreground">
                  {toDisplayName(c.author)}
                </span>
                <span className="text-[10px] text-muted-foreground/30">
                  {formatTimestamp(c.created_at)}
                </span>
              </div>
              <p className="text-[13px] text-foreground/75 leading-relaxed whitespace-pre-wrap">
                {c.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <div className="flex items-end gap-2 mt-2 px-1">
        <textarea
          ref={commentInputRef}
          className="flex-1 bg-muted/20 text-[13px] outline-none rounded-lg px-3 py-2.5 placeholder:text-muted-foreground/60 resize-none min-h-[36px] max-h-[200px] focus-visible:ring-2 focus-visible:ring-primary/30 transition-all"
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => {
            setNewComment(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onAddComment();
            }
          }}
          rows={1}
        />
        <button
          onClick={onAddComment}
          aria-label="Send comment"
          className="p-1 text-muted-foreground/30 hover:text-primary transition-colors duration-150 flex-shrink-0 mt-0.5"
        >
          <Send size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
