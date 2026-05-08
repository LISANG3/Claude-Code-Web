import { Router, Request, Response } from 'express';
import { readdir, stat, readFile } from 'fs/promises';
import { join, extname, resolve } from 'path';
import { authenticateToken } from './auth.js';
import type { FileEntry, FileContent } from '@ccw/shared';

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || process.cwd();

function safePath(requestedPath: string): string | null {
  const resolved = resolve(WORKSPACE_DIR, requestedPath);
  if (!resolved.startsWith(resolve(WORKSPACE_DIR))) return null;
  return resolved;
}

const LANG_MAP: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'tsx', '.js': 'javascript', '.jsx': 'jsx',
  '.json': 'json', '.md': 'markdown', '.css': 'css', '.html': 'html',
  '.py': 'python', '.rs': 'rust', '.go': 'go', '.sh': 'bash',
  '.yml': 'yaml', '.yaml': 'yaml', '.toml': 'toml', '.xml': 'xml',
  '.sql': 'sql', '.env': 'plaintext',
};

export const filesRouter = Router();
filesRouter.use(authenticateToken);

filesRouter.get('/list', async (req: Request, res: Response) => {
  const dirPath = (req.query.path as string) || '.';
  const absPath = safePath(dirPath);
  if (!absPath) { res.status(400).json({ error: 'Invalid path' }); return; }

  try {
    const entries = await readdir(absPath, { withFileTypes: true });
    const result: FileEntry[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env') continue;
      if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;

      const entryPath = join(dirPath, entry.name);
      try {
        const s = await stat(join(absPath, entry.name));
        result.push({
          name: entry.name,
          path: entryPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? s.size : undefined,
          modified: s.mtime.toISOString(),
          extension: entry.isFile() ? extname(entry.name) : undefined,
        });
      } catch {
        result.push({
          name: entry.name,
          path: entryPath,
          type: entry.isDirectory() ? 'directory' : 'file',
        });
      }
    }

    result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ entries: result, path: dirPath });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

filesRouter.get('/content', async (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  if (!filePath) { res.status(400).json({ error: 'path required' }); return; }

  const absPath = safePath(filePath);
  if (!absPath) { res.status(400).json({ error: 'Invalid path' }); return; }

  try {
    const s = await stat(absPath);
    if (s.size > 1024 * 1024) {
      res.status(413).json({ error: 'File too large (max 1MB)' });
      return;
    }

    const content = await readFile(absPath, 'utf-8');
    const ext = extname(absPath);
    const result: FileContent = {
      path: filePath,
      content,
      language: LANG_MAP[ext] || 'plaintext',
      size: s.size,
    };
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

filesRouter.get('/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase();
  if (!query) { res.json({ results: [] }); return; }

  const results: { path: string; name: string }[] = [];
  const maxResults = 20;

  async function walk(dir: string, relPath: string) {
    if (results.length >= maxResults) return;
    try {
      const dirEntries = await readdir(dir, { withFileTypes: true });
      for (const entry of dirEntries) {
        if (results.length >= maxResults) return;
        if (entry.name.startsWith('.') || ['node_modules', 'dist', '.git'].includes(entry.name)) continue;

        const fullPath = join(dir, entry.name);
        const rel = relPath === '.' ? entry.name : join(relPath, entry.name);

        if (entry.name.toLowerCase().includes(query)) {
          results.push({ path: rel, name: entry.name });
        }
        if (entry.isDirectory()) {
          await walk(fullPath, rel);
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  await walk(WORKSPACE_DIR, '.');
  res.json({ results });
});
