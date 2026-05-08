import { Router, Request, Response } from 'express';
import { authenticateToken } from './auth.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import os from 'os';

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || process.cwd();

export const envRouter = Router();
envRouter.use(authenticateToken);

envRouter.get('/', async (_req: Request, res: Response) => {
  const info: Record<string, unknown> = {};

  info.os = `${os.type()} ${os.release()}`;
  info.arch = os.arch();
  info.nodeVersion = process.version;
  info.cpus = os.cpus().length;
  info.totalMemory = os.totalmem();
  info.freeMemory = os.freemem();

  try {
    const df = execSync('df -h / 2>/dev/null | tail -1', { encoding: 'utf-8' }).trim().split(/\s+/);
    info.disk = { total: df[1], used: df[2], available: df[3], percent: df[4] };
  } catch { /* ignore */ }

  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', { cwd: WORKSPACE_DIR, encoding: 'utf-8' }).trim();
    const remote = execSync('git remote get-url origin 2>/dev/null', { cwd: WORKSPACE_DIR, encoding: 'utf-8' }).trim();
    info.git = { branch, remote };
  } catch { info.git = null; }

  try {
    const pkg = JSON.parse(readFileSync(join(WORKSPACE_DIR, 'package.json'), 'utf-8'));
    info.project = {
      name: pkg.name,
      version: pkg.version,
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {}),
    };
  } catch { info.project = null; }

  info.claude = {
    model: process.env.CLAUDE_MODEL || 'sonnet',
    maxTurns: parseInt(process.env.MAX_TURNS || '50', 10),
    maxBudgetUsd: parseFloat(process.env.MAX_BUDGET_USD || '5.0'),
    claudePath: process.env.CLAUDE_PATH || '/home/lis/.local/bin/claude',
  };

  res.json(info);
});
