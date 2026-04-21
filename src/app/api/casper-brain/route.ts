import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const WORKSPACE = '/Users/jamieludlow/.openclaw/workspace';

interface BrainFile {
  name: string;
  path: string;
  content: string;
  size: number;
  modifiedAt: string;
  category: 'core' | 'workflows' | 'memory' | 'research' | 'other';
}

function categorizeFile(filename: string, relativePath: string): BrainFile['category'] {
  const coreFiles = ['SOUL.md', 'IDENTITY.md', 'USER.md', 'MEMORY.md', 'AGENTS.md', 'TOOLS.md', 'HEARTBEAT.md', 'TASK-GATE.md'];
  const workflowFiles = ['agent-dispatch.md', 'dispatch-checklist.md'];
  
  if (coreFiles.includes(filename)) return 'core';
  if (workflowFiles.includes(filename)) return 'workflows';
  if (relativePath.startsWith('memory/')) return 'memory';
  if (/research|audit|spec/i.test(filename)) return 'research';
  return 'other';
}

function readMdFilesRecursive(dir: string, baseDir: string = dir): BrainFile[] {
  const files: BrainFile[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      // Skip node_modules, .git, etc.
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      
      if (entry.isDirectory()) {
        files.push(...readMdFilesRecursive(fullPath, baseDir));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const stats = fs.statSync(fullPath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          files.push({
            name: entry.name,
            path: relativePath,
            content,
            size: stats.size,
            modifiedAt: stats.mtime.toISOString(),
            category: categorizeFile(entry.name, relativePath),
          });
        } catch (err) {
          console.error(`Failed to read ${fullPath}:`, err);
        }
      }
    }
  } catch (err) {
    console.error(`Failed to read directory ${dir}:`, err);
  }
  
  return files;
}

export async function GET() {
  try {
    const files = readMdFilesRecursive(WORKSPACE);
    
    // Sort by category priority, then alphabetically
    const categoryOrder: Record<BrainFile['category'], number> = {
      core: 1,
      workflows: 2,
      memory: 3,
      research: 4,
      other: 5,
    };
    
    files.sort((a, b) => {
      const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
      if (catDiff !== 0) return catDiff;
      return a.name.localeCompare(b.name);
    });
    
    return NextResponse.json(files);
  } catch (error) {
    console.error('Error reading workspace files:', error);
    return NextResponse.json({ error: 'Failed to read workspace files' }, { status: 500 });
  }
}
