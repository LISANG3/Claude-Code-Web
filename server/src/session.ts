import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import type { SessionData } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const SESSIONS_FILE = join(DATA_DIR, 'sessions.json');

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadSessions(): SessionData[] {
  ensureDataDir();
  if (!existsSync(SESSIONS_FILE)) return [];
  return JSON.parse(readFileSync(SESSIONS_FILE, 'utf-8')).sessions;
}

function saveSessions(sessions: SessionData[]): void {
  ensureDataDir();
  writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions }, null, 2));
}

export function listSessions(): SessionData[] {
  return loadSessions().sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function createSession(title: string, model: string): SessionData {
  const sessions = loadSessions();
  const session: SessionData = {
    id: randomUUID(),
    title: title.slice(0, 30) + (title.length > 30 ? '...' : ''),
    model,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalCostUsd: 0,
    numTurns: 0,
  };
  sessions.push(session);
  saveSessions(sessions);
  return session;
}

export function updateSession(id: string, updates: Partial<SessionData>): SessionData | null {
  const sessions = loadSessions();
  const idx = sessions.findIndex(s => s.id === id);
  if (idx === -1) return null;
  sessions[idx] = { ...sessions[idx], ...updates, updatedAt: new Date().toISOString() };
  saveSessions(sessions);
  return sessions[idx];
}

export function deleteSession(id: string): boolean {
  const sessions = loadSessions();
  const filtered = sessions.filter(s => s.id !== id);
  if (filtered.length === sessions.length) return false;
  saveSessions(filtered);
  return true;
}

export function getSession(id: string): SessionData | null {
  return loadSessions().find(s => s.id === id) || null;
}
