'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, Image, FileSpreadsheet, File } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPTED_TYPES: Record<string, string> = {
  'text/markdown': '.md',
  'text/plain': '.txt',
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'text/csv': '.csv',
};

const ACCEPT_STRING = '.md,.txt,.pdf,.png,.jpg,.jpeg,.csv';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
    case 'jpg':
    case 'jpeg':
      return <Image className="h-5 w-5 text-status-success" />;
    case 'pdf':
      return <FileText className="h-5 w-5 text-destructive" />;
    case 'csv':
      return <FileSpreadsheet className="h-5 w-5 text-status-success" />;
    case 'md':
    case 'txt':
      return <FileText className="h-5 w-5 text-primary" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export function UploadModal({ open, onOpenChange, onUploadComplete }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFiles([]);
    setProgress(0);
    setError(null);
    setUploading(false);
  }, []);

  const handleClose = useCallback(
    (val: boolean) => {
      if (!val) reset();
      onOpenChange(val);
    },
    [onOpenChange, reset]
  );

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE) return `${file.name} exceeds 10MB limit`;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPT_STRING.split(',').includes(ext)) return `${file.name}: unsupported file type`;
    return null;
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    for (const f of arr) {
      const err = validateFile(f);
      if (err) {
        setError(err);
        return;
      }
    }
    setError(null);
    setFiles((prev) => [...prev, ...arr]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setProgress(0);

    let completed = 0;
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        setUploading(false);
        return;
      }

      completed++;
      setProgress(Math.round((completed / files.length) * 100));
    }

    setUploading(false);
    toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`);
    onUploadComplete();
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border/20 hover:border-primary/50 hover:bg-secondary/50'
          }`}
        >
          <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-[13px] font-medium text-foreground">
            Drop files here or click to browse
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            .md, .txt, .pdf, .png, .jpg, .csv — max 10MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_STRING}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {files.length > 0 && (
          <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-3 rounded-md border border-border/20 bg-card px-3 py-2"
              >
                {getFileIcon(file.name)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-foreground">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {!uploading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-150"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="mt-2 space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-[11px] text-muted-foreground text-center">{progress}%</p>
          </div>
        )}

        {error && (
          <p className="mt-2 text-[13px] text-destructive">{error}</p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => handleClose(false)}
            disabled={uploading}
            className="rounded-md border border-border/20 bg-transparent px-4 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="rounded-md border border-border/20 bg-primary px-4 py-2 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
