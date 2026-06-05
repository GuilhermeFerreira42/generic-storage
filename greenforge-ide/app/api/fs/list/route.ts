import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { validatePath } from '../utils';

async function walkDir(dir: string, baseDir: string): Promise<any[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let results: any[] = [];
  
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next' || entry.name === 'dist') {
      continue;
    }
    
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    const dirname = path.dirname(relPath).replace(/\\/g, '/');
    
    results.push({
      id: relPath,
      name: entry.name,
      type: entry.isDirectory() ? 'folder' : 'file',
      parentId: dirname === '.' ? null : dirname
    });
    
    if (entry.isDirectory()) {
      const subResults = await walkDir(fullPath, baseDir);
      results = results.concat(subResults);
    }
  }
  
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const { path: reqPath } = await req.json();

    const targetPath = reqPath || '.';
    const resolvedPath = validatePath(targetPath);
    
    const files = await walkDir(resolvedPath, resolvedPath);

    return NextResponse.json({ files });
  } catch (error: any) {
    if (error.message.includes('Path traversal')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to list directory' }, { status: 500 });
  }
}
