import { Router, Request, Response } from 'express';
import simpleGit from 'simple-git';
import { authenticateToken } from './auth.js';

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || process.cwd();

export const gitRouter = Router();
gitRouter.use(authenticateToken);

gitRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const git = simpleGit(WORKSPACE_DIR);
    const status = await git.status();
    res.json({
      branch: status.current || 'unknown',
      files: status.files.map(f => ({
        path: f.path,
        status: f.index === '?' ? 'added' :
                f.index === 'M' ? 'modified' :
                f.index === 'D' ? 'deleted' :
                f.index === 'R' ? 'renamed' : 'modified',
      })),
      ahead: status.ahead,
      behind: status.behind,
      isClean: status.isClean(),
    });
  } catch (err: any) {
    res.json({ branch: 'unknown', files: [], ahead: 0, behind: 0, error: err.message });
  }
});

gitRouter.get('/log', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string || '20', 10);
  try {
    const git = simpleGit(WORKSPACE_DIR);
    const log = await git.log({ maxCount: limit });
    res.json({
      commits: log.all.map(c => ({
        hash: c.hash.slice(0, 7),
        message: c.message,
        date: c.date,
        author: c.author_name,
      })),
    });
  } catch (err: any) {
    res.json({ commits: [], error: err.message });
  }
});

gitRouter.get('/branches', async (_req: Request, res: Response) => {
  try {
    const git = simpleGit(WORKSPACE_DIR);
    const branches = await git.branchLocal();
    res.json({
      current: branches.current,
      branches: branches.all.map(b => ({
        name: b,
        current: b === branches.current,
      })),
    });
  } catch (err: any) {
    res.json({ current: 'unknown', branches: [], error: err.message });
  }
});

gitRouter.post('/checkout', async (req: Request, res: Response) => {
  const { branch } = req.body;
  if (!branch) { res.status(400).json({ error: 'branch required' }); return; }
  try {
    const git = simpleGit(WORKSPACE_DIR);
    await git.checkout(branch);
    res.json({ ok: true, branch });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
