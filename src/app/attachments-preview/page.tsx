'use client';

import { useState } from 'react';
import {
  Paperclip,
  ChevronDown,
  Download,
  Eye,
  Trash2,
  FileImage,
  FileText,
  File,
  Plus,
  Upload,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

type FileData = {
  name: string;
  size: string;
  type: 'image' | 'document' | 'generic';
};

const mockFiles = {
  three: [
    { name: 'design-mockup-v2.png', size: '245 KB', type: 'image' as const },
    { name: 'api-spec.pdf', size: '1.2 MB', type: 'document' as const },
    { name: 'meeting-notes.md', size: '12 KB', type: 'generic' as const },
  ],
  five: [
    { name: 'design-mockup-v2.png', size: '245 KB', type: 'image' as const },
    { name: 'api-spec.pdf', size: '1.2 MB', type: 'document' as const },
    { name: 'meeting-notes.md', size: '12 KB', type: 'generic' as const },
    { name: 'screenshot-2026-02-13.jpg', size: '892 KB', type: 'image' as const },
    { name: 'requirements.docx', size: '456 KB', type: 'document' as const },
  ],
  thirtyTwo: [
    { name: 'design-mockup-v2.png', size: '245 KB', type: 'image' as const },
    { name: 'api-spec.pdf', size: '1.2 MB', type: 'document' as const },
    { name: 'meeting-notes.md', size: '12 KB', type: 'generic' as const },
    { name: 'screenshot-2026-02-13.jpg', size: '892 KB', type: 'image' as const },
    { name: 'requirements.docx', size: '456 KB', type: 'document' as const },
    { name: 'wireframes-final.png', size: '1.5 MB', type: 'image' as const },
    { name: 'budget-q1.xlsx', size: '234 KB', type: 'generic' as const },
    { name: 'contract-signed.pdf', size: '678 KB', type: 'document' as const },
    { name: 'logo-variations.ai', size: '3.4 MB', type: 'generic' as const },
    { name: 'presentation-deck.pptx', size: '8.9 MB', type: 'document' as const },
    { name: 'user-research.pdf', size: '2.1 MB', type: 'document' as const },
    { name: 'prototype-v3.fig', size: '12 MB', type: 'generic' as const },
    { name: 'analytics-report.csv', size: '89 KB', type: 'generic' as const },
    { name: 'brand-guidelines.pdf', size: '5.6 MB', type: 'document' as const },
    { name: 'photo-shoot-1.jpg', size: '4.2 MB', type: 'image' as const },
    { name: 'photo-shoot-2.jpg', size: '3.8 MB', type: 'image' as const },
    { name: 'invoice-january.pdf', size: '156 KB', type: 'document' as const },
    { name: 'team-headshots.zip', size: '45 MB', type: 'generic' as const },
    { name: 'sitemap.xml', size: '23 KB', type: 'generic' as const },
    { name: 'database-schema.sql', size: '67 KB', type: 'generic' as const },
    { name: 'deployment-guide.md', size: '34 KB', type: 'generic' as const },
    { name: 'security-audit.pdf', size: '1.8 MB', type: 'document' as const },
    { name: 'competitor-analysis.xlsx', size: '445 KB', type: 'generic' as const },
    { name: 'customer-feedback.docx', size: '234 KB', type: 'document' as const },
    { name: 'roadmap-2026.pdf', size: '890 KB', type: 'document' as const },
    { name: 'style-guide.sketch', size: '15 MB', type: 'generic' as const },
    { name: 'launch-checklist.md', size: '18 KB', type: 'generic' as const },
    { name: 'demo-video.mp4', size: '89 MB', type: 'generic' as const },
    { name: 'testimonials.txt', size: '8 KB', type: 'generic' as const },
    { name: 'legal-terms.pdf', size: '567 KB', type: 'document' as const },
    { name: 'changelog.md', size: '45 KB', type: 'generic' as const },
    { name: 'backup-config.json', size: '12 KB', type: 'generic' as const },
  ],
};

function FileIcon({ type }: { type: FileData['type'] }) {
  const iconClass = 'w-[14px] h-[14px]';
  
  switch (type) {
    case 'image':
      return <FileImage className={iconClass} />;
    case 'document':
      return <FileText className={iconClass} />;
    default:
      return <File className={iconClass} />;
  }
}

function AttachmentsSection({
  files,
}: {
  files: FileData[];
}) {
  const [isExpanded, setIsExpanded] = useState(files.length <= 3);
  const [showAll, setShowAll] = useState(false);
  
  const count = files.length;
  const hasFiles = count > 0;
  const MAX_VISIBLE = 5;
  const displayFiles = showAll ? files : files.slice(0, MAX_VISIBLE);
  const hasMore = count > MAX_VISIBLE;
  
  const toggleExpand = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (!next) setShowAll(false);
  };

  const handleDownloadAll = () => {
    alert(`Downloading ${count} files as ZIP`);
  };
  
  const handleDelete = (filename: string) => {
    if (confirm(`Delete ${filename}?`)) {
    }
  };
  
  const handleView = (filename: string) => {
  };
  
  const handleDownload = (filename: string) => {
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Paperclip className="w-[14px] h-[14px] text-muted-foreground/60" />
          <span className="text-[11px] text-muted-foreground/60">
            Attachments ({count})
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {count >= 2 && (
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground/30 hover:text-muted-foreground transition-colors"
            >
              <Download className="w-[12px] h-[12px]" />
              Download all
            </button>
          )}
          
          {hasFiles && (
            <button
              onClick={toggleExpand}
              className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <ChevronDown
                className={`w-[14px] h-[14px] transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!hasFiles ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <Upload className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-[13px] text-muted-foreground/30">
            No files attached. Drag & drop or click to upload.
          </p>
          <button className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-muted-foreground/60 hover:text-muted-foreground border border-border/20 hover:border-border/20 rounded-lg transition-colors">
            <Plus className="w-[12px] h-[12px]" />
            Add file
          </button>
        </div>
      ) : isExpanded ? (
        // File list
        <div className="space-y-1">
          {displayFiles.map((file, index) => (
            <div
              key={index}
              className="group flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileIcon type={file.type} />
                <span className="text-[13px] truncate">{file.name}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-muted-foreground/30 tabular-nums">
                  {file.size}
                </span>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleView(file.name)}
                        className="p-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>View</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleDownload(file.name)}
                        className="p-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleDelete(file.name)}
                        className="p-1 text-muted-foreground/60 hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          ))}
          
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[12px] text-primary/60 hover:text-primary transition-colors mt-2 ml-2"
            >
              {showAll ? 'Show less' : `Show all (${count})`}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function AttachmentsPreviewPage() {
  return (
    <TooltipProvider delayDuration={300}>
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-xl font-semibold mb-2">Attachments Preview</h1>
      <p className="text-[13px] text-muted-foreground/60 mb-8">
        4 scenarios — evaluate the design
      </p>

      <div className="space-y-6 max-w-3xl">
        {/* 0 Attachments */}
        <div className="bg-card/50 rounded-xl border border-border/20 p-5">
          <h2 className="text-[13px] font-medium mb-4">0 Attachments</h2>
          <AttachmentsSection files={[]} />
        </div>

        {/* 3 Attachments */}
        <div className="bg-card/50 rounded-xl border border-border/20 p-5">
          <h2 className="text-[13px] font-medium mb-4">3 Attachments (≤3 = expanded by default)</h2>
          <AttachmentsSection files={mockFiles.three} />
        </div>

        {/* 5 Attachments */}
        <div className="bg-card/50 rounded-xl border border-border/20 p-5">
          <h2 className="text-[13px] font-medium mb-4">5 Attachments (≥4 = collapsed by default, Show All/Less)</h2>
          <AttachmentsSection files={mockFiles.five} />
        </div>

        {/* 32 Attachments */}
        <div className="bg-card/50 rounded-xl border border-border/20 p-5">
          <h2 className="text-[13px] font-medium mb-4">32 Attachments (Show All/Less)</h2>
          <AttachmentsSection files={mockFiles.thirtyTwo} />
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
