import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILENAME_TO_AGENT: Record<string, string> = {
  'developer.md': 'developer',
  'qa.md': 'qa-tester',
  'ui-designer.md': 'ui-designer',
  'analyst.md': 'analyst',
  'copywriter.md': 'copywriter',
  'manager.md': 'manager',
};

export async function GET() {
  const trainingDir = path.join(process.cwd(), 'training');
  const result: Record<string, string> = {};

  try {
    const files = fs.readdirSync(trainingDir);
    for (const file of files) {
      const agentId = FILENAME_TO_AGENT[file];
      if (agentId) {
        result[agentId] = fs.readFileSync(path.join(trainingDir, file), 'utf-8');
      }
    }
  } catch {
    // training directory may not exist
  }

  return NextResponse.json(result);
}
