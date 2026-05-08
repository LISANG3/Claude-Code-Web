import { WebSocket } from 'ws';

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  sessionId?: string;
  isAlive?: boolean;
}

export interface User {
  username: string;
  passwordHash: string;
}

export interface SessionData {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  totalCostUsd: number;
  numTurns: number;
}
