import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { listSessions, createSession, deleteSession } from './session.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USERS_FILE = join(__dirname, '../../config/users.json');
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

interface UserRecord {
  username: string;
  passwordHash: string;
}

function loadUsers(): UserRecord[] {
  if (!existsSync(USERS_FILE)) return [];
  return JSON.parse(readFileSync(USERS_FILE, 'utf-8')).users;
}

function saveUsers(users: UserRecord[]): void {
  writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
}

export function initDefaultUser(): void {
  const users = loadUsers();
  if (users.length === 0) {
    const hash = bcrypt.hashSync('admin', 10);
    users.push({ username: 'admin', passwordHash: hash });
    saveUsers(users);
    console.log('Default user created: admin / admin');
  }
}

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, try again later' },
});

export const authRouter = Router();

authRouter.post('/login', loginLimiter, (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username }, JWT_SECRET!, { expiresIn: '24h' });
  res.json({ token });
});

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'] as string | undefined;
  const token = authHeader?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token required' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as { username: string };
    (req as any).userId = decoded.username;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
}

export function verifyWsToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as { username: string };
    return decoded.username;
  } catch {
    return null;
  }
}

// Session API routes
authRouter.get('/sessions', authenticateToken, (_req, res) => {
  res.json({ sessions: listSessions() });
});

authRouter.post('/sessions', authenticateToken, (req, res) => {
  const { title, model } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const session = createSession(title, model || 'sonnet');
  res.json(session);
});

authRouter.delete('/sessions/:id', authenticateToken, (req, res) => {
  if (deleteSession(req.params.id as string)) {
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});
