# Claude Code Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Web 应用，将 Claude Code CLI 的交互实时映射到 Web 界面，支持局域网/远程访问。

**Architecture:** 前后端分离 monorepo（npm workspaces）。后端 Express + WebSocket 服务器通过 claude-agent-sdk 调用 Claude Code，将流式事件解析为语义化消息推送给前端。前端 React SPA 渲染富 UI（消息卡片、工具调用可视化、费用统计）。

**Tech Stack:** Node.js + TypeScript, Express, ws, @anthropic-ai/claude-agent-sdk, React 18, Vite, Tailwind CSS, react-markdown, JWT

---

## 文件结构总览

```
ccw/
├── package.json                    # npm workspaces 根
├── tsconfig.base.json              # 共享 TS 配置
├── shared/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── protocol.ts             # WebSocket 协议类型
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # 入口
│       ├── auth.ts                 # 认证
│       ├── session.ts              # 会话管理
│       ├── ws-handler.ts           # WebSocket 处理
│       └── types.ts                # 服务端类型
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── hooks/
│       │   └── useWebSocket.ts
│       ├── context/
│       │   └── AuthContext.tsx
│       ├── components/
│       │   ├── Login.tsx
│       │   ├── SessionList.tsx
│       │   ├── ChatView.tsx
│       │   ├── MessageBubble.tsx
│       │   ├── ToolCallCard.tsx
│       │   └── StatsPanel.tsx
│       └── lib/
│           └── api.ts
└── config/
    └── users.json                  # 用户凭据
```

---

## Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/src/index.css`
- Create: `.gitignore`

- [ ] **Step 1: 创建根 package.json**

```json
{
  "name": "ccw",
  "private": true,
  "workspaces": ["shared", "server", "client"],
  "scripts": {
    "build": "npm run build --workspaces",
    "dev": "concurrently \"npm run dev -w server\" \"npm run dev -w client\"",
    "start": "npm start -w server"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: 创建 shared 包**

`shared/package.json`:
```json
{
  "name": "@ccw/shared",
  "version": "1.0.0",
  "private": true,
  "main": "src/protocol.ts",
  "types": "src/protocol.ts",
  "scripts": {
    "build": "tsc"
  }
}
```

`shared/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 创建 server 包**

`server/package.json`:
```json
{
  "name": "@ccw/server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.2.133",
    "@ccw/shared": "*",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "express-rate-limit": "^7.4.0",
    "helmet": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/ws": "^8.5.12",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

`server/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 5: 创建 client 包**

`client/package.json`:
```json
{
  "name": "@ccw/client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc && vite build",
    "dev": "vite",
    "preview": "vite preview"
  },
  "dependencies": {
    "@ccw/shared": "*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^9.0.1",
    "react-router-dom": "^6.28.0",
    "rehype-highlight": "^7.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.0",
    "vite": "^5.4.10"
  }
}
```

`client/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": true
  },
  "include": ["src"]
}
```

`client/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

`client/index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claude Code Web</title>
  </head>
  <body class="bg-gray-50 dark:bg-gray-900">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`client/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};
```

`client/postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

`client/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: 创建 .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
.env
data/
config/users.json
```

- [ ] **Step 7: 安装依赖并验证构建**

```bash
cd /home/lis/ccw && npm install
npm run build -w shared
```

Expected: 构建成功，无报错。

---

## Task 2: 共享协议类型

**Files:**
- Create: `shared/src/protocol.ts`

- [ ] **Step 1: 创建协议类型定义**

```typescript
// shared/src/protocol.ts

// === 工具信息 ===
export interface ToolInfo {
  name: string;
  input: Record<string, unknown>;
  summary: string;
}

// === 助手消息 ===
export interface AssistantContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
}

export interface AssistantMessage {
  content: AssistantContentBlock[];
  stop_reason: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// === 客户端 → 服务端 ===
export type ClientMessage =
  | { type: 'chat'; content: string }
  | { type: 'interrupt' }
  | { type: 'resume'; sessionId: string };

// === 服务端 → 客户端 ===
export type ServerMessage =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_start'; tool: ToolInfo }
  | { type: 'tool_delta'; input: string }
  | { type: 'tool_result'; result: string }
  | { type: 'message_done'; message: AssistantMessage }
  | { type: 'session_info'; sessionId: string; model: string }
  | { type: 'stats'; cost: number; tokens: number; duration: number }
  | { type: 'error'; message: string }
  | { type: 'ready' };

// === REST API 类型 ===
export interface SessionMeta {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  totalCostUsd: number;
  numTurns: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface SessionsResponse {
  sessions: SessionMeta[];
}
```

- [ ] **Step 2: 验证类型构建**

```bash
npm run build -w shared
```

Expected: 构建成功。

---

## Task 3: 服务端核心 — Express + WebSocket 骨架

**Files:**
- Create: `server/src/types.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: 创建服务端类型**

```typescript
// server/src/types.ts
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
```

- [ ] **Step 2: 创建 Express + WebSocket 服务器入口**

```typescript
// server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authRouter } from './auth.js';
import { handleConnection } from './ws-handler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

// 中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));
app.use(cors());
app.use(express.json());

// 静态文件（生产环境 serve 前端构建产物）
const clientDist = join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// API 路由
app.use('/api', authRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// SPA 回退
app.get('*', (_req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

// WebSocket 服务
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', handleConnection);

// 启动
const PORT = parseInt(process.env.PORT || '3000', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Claude Code Web running on http://0.0.0.0:${PORT}`);
});
```

- [ ] **Step 3: 创建空的 auth 和 ws-handler 占位（让 index.ts 编译通过）**

```typescript
// server/src/auth.ts
import { Router } from 'express';
export const authRouter = Router();
```

```typescript
// server/src/ws-handler.ts
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
export function handleConnection(ws: WebSocket, req: IncomingMessage): void {
  // TODO: Task 5 实现
}
```

- [ ] **Step 4: 验证服务端编译**

```bash
npm run build -w server
```

Expected: 编译成功。

---

## Task 4: 认证模块

**Files:**
- Create: `config/users.json`
- Modify: `server/src/auth.ts`

- [ ] **Step 1: 创建用户配置文件**

```bash
mkdir -p /home/lis/ccw/config
```

`config/users.json`:
```json
{
  "users": [
    {
      "username": "admin",
      "passwordHash": "$2b$10$placeholder"
    }
  ]
}
```

- [ ] **Step 2: 生成密码哈希工具脚本**

在 `server/src/auth.ts` 中实现完整的认证模块：

```typescript
// server/src/auth.ts
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

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
  if (!existsSync(USERS_FILE)) {
    return [];
  }
  return JSON.parse(readFileSync(USERS_FILE, 'utf-8')).users;
}

function saveUsers(users: UserRecord[]): void {
  writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
}

// 初始化默认用户（如果不存在）
export function initDefaultUser(): void {
  const users = loadUsers();
  if (users.length === 0) {
    const hash = bcrypt.hashSync('admin', 10);
    users.push({ username: 'admin', passwordHash: hash });
    saveUsers(users);
    console.log('Default user created: admin / admin');
  }
}

// 登录速率限制
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

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

// JWT 验证中间件
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token required' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
    (req as any).userId = decoded.username;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// WebSocket token 验证
export function verifyWsToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
    return decoded.username;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: 更新 index.ts 调用 initDefaultUser**

在 `server/src/index.ts` 的 import 后添加：

```typescript
import { initDefaultUser } from './auth.js';
initDefaultUser();
```

- [ ] **Step 4: 验证编译**

```bash
npm run build -w server
```

---

## Task 5: 会话管理

**Files:**
- Create: `server/src/session.ts`

- [ ] **Step 1: 实现会话管理模块**

```typescript
// server/src/session.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import type { SessionData } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const SESSIONS_FILE = join(DATA_DIR, 'sessions.json');

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSessions(): SessionData[] {
  ensureDataDir();
  if (!existsSync(SESSIONS_FILE)) {
    return [];
  }
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
```

- [ ] **Step 2: 添加会话 API 路由**

在 `server/src/auth.ts` 的 `authRouter` 后添加会话路由：

```typescript
// 在 auth.ts 末尾添加
import { listSessions, createSession, deleteSession } from './session.js';

authRouter.get('/sessions', authenticateToken, (_req, res) => {
  res.json({ sessions: listSessions() });
});

authRouter.post('/sessions', authenticateToken, (req, res) => {
  const { title, model } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }
  const session = createSession(title, model || 'sonnet');
  res.json(session);
});

authRouter.delete('/sessions/:id', authenticateToken, (req, res) => {
  if (deleteSession(req.params.id)) {
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});
```

- [ ] **Step 3: 验证编译**

```bash
npm run build -w server
```

---

## Task 6: WebSocket 处理 + Claude SDK 集成

**Files:**
- Modify: `server/src/ws-handler.ts`

- [ ] **Step 1: 实现 WebSocket 消息处理**

```typescript
// server/src/ws-handler.ts
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { verifyWsToken } from './auth.js';
import { createSession, updateSession, getSession } from './session.js';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { ServerMessage, ClientMessage } from '@ccw/shared';
import type { AuthenticatedWebSocket } from './types.js';

const MAX_TURNS = parseInt(process.env.MAX_TURNS || '50', 10);
const MAX_BUDGET_USD = parseFloat(process.env.MAX_BUDGET_USD || '5.0');
const CLAUDE_MODEL = process.env.CLAUDE_MODEL;

// 消息速率限制（每分钟）
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(userId);
  if (!limit || now > limit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (limit.count >= 30) return false;
  limit.count++;
  return true;
}

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// 活跃会话追踪（用于 interrupt）
const activeQueries = new Map<string, { abort: () => void }>();

export function handleConnection(ws: WebSocket, req: IncomingMessage): void {
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(4001, 'Token required');
    return;
  }

  const userId = verifyWsToken(token);
  if (!userId) {
    ws.close(4003, 'Invalid token');
    return;
  }

  const aws = ws as AuthenticatedWebSocket;
  aws.userId = userId;
  aws.isAlive = true;

  send(ws, { type: 'ready' });

  ws.on('pong', () => { aws.isAlive = true; });

  ws.on('message', async (data) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    switch (msg.type) {
      case 'chat':
        await handleChat(aws, msg.content);
        break;
      case 'interrupt':
        handleInterrupt(aws);
        break;
      case 'resume':
        handleResume(aws, msg.sessionId);
        break;
    }
  });

  ws.on('close', () => {
    if (aws.sessionId) {
      activeQueries.delete(aws.sessionId);
    }
  });
}

async function handleChat(ws: AuthenticatedWebSocket, content: string): Promise<void> {
  if (!checkRateLimit(ws.userId!)) {
    send(ws, { type: 'error', message: 'Rate limit exceeded' });
    return;
  }

  // 创建或使用现有会话
  let sessionId = ws.sessionId;
  if (!sessionId) {
    const session = createSession(content, CLAUDE_MODEL || 'sonnet');
    sessionId = session.id;
    ws.sessionId = sessionId;
    send(ws, {
      type: 'session_info',
      sessionId: session.id,
      model: session.model,
    });
  }

  const options: Record<string, unknown> = {
    maxTurns: MAX_TURNS,
    maxBudgetUsd: MAX_BUDGET_USD,
    includePartialMessages: true,
  };
  if (CLAUDE_MODEL) {
    options.model = CLAUDE_MODEL;
  }

  // 检查是否有已有会话需要 resume
  const existingSession = getSession(sessionId);
  if (existingSession && existingSession.numTurns > 0) {
    options.resume = sessionId;
  }

  let aborted = false;
  activeQueries.set(sessionId, {
    abort: () => { aborted = true; },
  });

  try {
    const q = query({
      prompt: content,
      options,
    });

    for await (const event of q) {
      if (aborted) break;

      if (event.type === 'stream_event') {
        const streamEvent = (event as any).event;
        if (streamEvent?.type === 'content_block_start') {
          const block = streamEvent.content_block;
          if (block?.type === 'tool_use') {
            send(ws, {
              type: 'tool_start',
              tool: {
                name: block.name || 'unknown',
                input: block.input || {},
                summary: formatToolSummary(block.name, block.input),
              },
            });
          }
        } else if (streamEvent?.type === 'content_block_delta') {
          const delta = streamEvent.delta;
          if (delta?.type === 'text_delta' && delta.text) {
            send(ws, { type: 'text_delta', text: delta.text });
          } else if (delta?.type === 'input_json_delta' && delta.partial_json) {
            send(ws, { type: 'tool_delta', input: delta.partial_json });
          }
        } else if (streamEvent?.type === 'content_block_stop') {
          // tool_result 在 content_block_stop 时可能已经通过 assistant 事件获取
        }
      } else if (event.type === 'assistant') {
        const msg = event as any;
        // 提取工具结果
        if (msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === 'tool_result' && block.content) {
              send(ws, {
                type: 'tool_result',
                result: typeof block.content === 'string'
                  ? block.content
                  : JSON.stringify(block.content),
              });
            }
          }
          send(ws, {
            type: 'message_done',
            message: {
              content: msg.message.content.map((b: any) => ({
                type: b.type,
                text: b.text,
                name: b.name,
                input: b.input,
                content: typeof b.content === 'string' ? b.content : undefined,
              })),
              stop_reason: msg.message.stop_reason || 'end_turn',
              usage: msg.message.usage,
            },
          });
        }
      } else if (event.type === 'result') {
        const result = event as any;
        send(ws, {
          type: 'stats',
          cost: result.total_cost_usd || 0,
          tokens: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
          duration: result.duration_ms || 0,
        });
        // 更新会话统计
        updateSession(sessionId!, {
          totalCostUsd: (existingSession?.totalCostUsd || 0) + (result.total_cost_usd || 0),
          numTurns: (existingSession?.numTurns || 0) + (result.num_turns || 1),
        });
      }
    }
  } catch (err: any) {
    if (!aborted) {
      send(ws, { type: 'error', message: err.message || 'Unknown error' });
    }
  } finally {
    activeQueries.delete(sessionId!);
  }
}

function handleInterrupt(ws: AuthenticatedWebSocket): void {
  if (ws.sessionId) {
    const active = activeQueries.get(ws.sessionId);
    if (active) {
      active.abort();
    }
  }
}

function handleResume(ws: AuthenticatedWebSocket, sessionId: string): void {
  const session = getSession(sessionId);
  if (session) {
    ws.sessionId = sessionId;
    send(ws, {
      type: 'session_info',
      sessionId: session.id,
      model: session.model,
    });
  } else {
    send(ws, { type: 'error', message: 'Session not found' });
  }
}

function formatToolSummary(name: string, input: any): string {
  if (!input) return name;
  switch (name) {
    case 'Bash':
      return input.command || name;
    case 'Read':
      return input.file_path || name;
    case 'Edit':
      return input.file_path || name;
    case 'Write':
      return input.file_path || name;
    case 'Glob':
      return input.pattern || name;
    case 'Grep':
      return input.pattern || name;
    default:
      return name;
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npm run build -w server
```

---

## Task 7: 客户端脚手架 — Vite + React + Tailwind

**Files:**
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/lib/api.ts`

- [ ] **Step 1: 创建 React 入口**

```tsx
// client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 2: 创建 API 工具库**

```typescript
// client/src/lib/api.ts
const API_BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('ccw_token');
}

export function setToken(token: string): void {
  localStorage.setItem('ccw_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('ccw_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function login(username: string, password: string): Promise<string> {
  const { token } = await request<{ token: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(token);
  return token;
}

export interface SessionMeta {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  totalCostUsd: number;
  numTurns: number;
}

export async function getSessions(): Promise<SessionMeta[]> {
  const { sessions } = await request<{ sessions: SessionMeta[] }>('/sessions');
  return sessions;
}

export async function createSession(title: string, model?: string): Promise<SessionMeta> {
  return request<SessionMeta>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ title, model }),
  });
}

export async function deleteSession(id: string): Promise<void> {
  await request(`/sessions/${id}`, { method: 'DELETE' });
}
```

- [ ] **Step 3: 创建 App 路由**

```tsx
// client/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import SessionList from './components/SessionList';
import ChatView from './components/ChatView';

export default function App() {
  const { token } = useAuth();

  if (!token) {
    return <Login />;
  }

  return (
    <div className="h-screen flex flex-col">
      <Routes>
        <Route path="/" element={<SessionList />} />
        <Route path="/chat/:sessionId" element={<ChatView />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
```

- [ ] **Step 4: 创建 AuthContext**

```tsx
// client/src/context/AuthContext.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { getToken, setToken as storeToken, clearToken } from '../lib/api';

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());

  const login = useCallback((t: string) => {
    storeToken(t);
    setTokenState(t);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
```

- [ ] **Step 5: 验证客户端开发服务器启动**

```bash
npm run dev -w client &
sleep 3
curl -s http://localhost:5173/ | head -5
kill %1 2>/dev/null
```

Expected: HTML 响应包含 `<div id="root">`。

---

## Task 8: WebSocket Hook

**Files:**
- Create: `client/src/hooks/useWebSocket.ts`

- [ ] **Step 1: 实现 WebSocket 连接管理 Hook**

```typescript
// client/src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import type { ClientMessage, ServerMessage } from '@ccw/shared';
import { getToken } from '../lib/api';

interface UseWebSocketOptions {
  sessionId?: string;
  onMessage: (msg: ServerMessage) => void;
}

export function useWebSocket({ sessionId, onMessage }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        onMessageRef.current(msg);
      } catch {
        // ignore invalid messages
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  // 当 sessionId 变化时发送 resume
  useEffect(() => {
    if (sessionId && wsRef.current?.readyState === WebSocket.OPEN) {
      send({ type: 'resume', sessionId });
    }
  }, [sessionId]);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const sendChat = useCallback((content: string) => {
    send({ type: 'chat', content });
  }, [send]);

  const interrupt = useCallback(() => {
    send({ type: 'interrupt' });
  }, [send]);

  return { connected, sendChat, interrupt };
}
```

---

## Task 9: 登录页面

**Files:**
- Create: `client/src/components/Login.tsx`

- [ ] **Step 1: 实现登录组件**

```tsx
// client/src/components/Login.tsx
import { useState, FormEvent } from 'react';
import { login as apiLogin } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = await apiLogin(username, password);
      login(token);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Claude Code Web
        </h1>
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            用户名
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoFocus
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            密码
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  );
}
```

---

## Task 10: 会话列表页面

**Files:**
- Create: `client/src/components/SessionList.tsx`

- [ ] **Step 1: 实现会话列表组件**

```tsx
// client/src/components/SessionList.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions, createSession, deleteSession, type SessionMeta } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function SessionList() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch {
      // handled by api.ts
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    try {
      const session = await createSession(newTitle.trim());
      navigate(`/chat/${session.id}`);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此会话？')) return;
    try {
      await deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* 顶栏 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Claude Code Web</h1>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          退出
        </button>
      </header>

      {/* 新建会话 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 max-w-xl mx-auto">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="输入新会话标题..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          >
            新建
          </button>
        </div>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-xl mx-auto space-y-2">
          {loading ? (
            <p className="text-center text-gray-500">加载中...</p>
          ) : sessions.length === 0 ? (
            <p className="text-center text-gray-500">暂无会话，创建一个开始吧</p>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/chat/${session.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {session.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {session.model} · {session.numTurns} 轮 · ${session.totalCostUsd.toFixed(4)}
                    · {new Date(session.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
                  className="ml-3 text-gray-400 hover:text-red-500 transition-colors"
                  title="删除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Task 11: 主对话界面

**Files:**
- Create: `client/src/components/ChatView.tsx`

- [ ] **Step 1: 实现主对话界面**

```tsx
// client/src/components/ChatView.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import type { ServerMessage, ToolInfo, AssistantMessage } from '@ccw/shared';
import MessageBubble from './MessageBubble';
import ToolCallCard from './ToolCallCard';
import StatsPanel from './StatsPanel';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallState[];
  assistantMessage?: AssistantMessage;
}

interface ToolCallState {
  tool: ToolInfo;
  result?: string;
  expanded: boolean;
}

export default function ChatView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentTools, setCurrentTools] = useState<ToolCallState[]>([]);
  const [stats, setStats] = useState<{ cost: number; tokens: number; duration: number } | null>(null);
  const [model, setModel] = useState('');
  const [showStats, setShowStats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentText, scrollToBottom]);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'session_info':
        setModel(msg.model);
        break;

      case 'text_delta':
        setCurrentText(prev => prev + msg.text);
        break;

      case 'tool_start':
        setCurrentTools(prev => [
          ...prev,
          { tool: msg.tool, expanded: false },
        ]);
        break;

      case 'tool_delta':
        // 更新最后一个工具的输入
        setCurrentTools(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              tool: {
                ...updated[updated.length - 1].tool,
                input: { _partial: msg.input },
              },
            };
          }
          return updated;
        });
        break;

      case 'tool_result':
        setCurrentTools(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              result: msg.result,
            };
          }
          return updated;
        });
        break;

      case 'message_done':
        // 将当前流式内容合并到消息列表
        setMessages(prev => {
          const newMsg: DisplayMessage = {
            role: 'assistant',
            content: currentText || msg.message.content
              .filter(b => b.type === 'text')
              .map(b => b.text || '')
              .join(''),
            toolCalls: currentTools.length > 0 ? currentTools : undefined,
            assistantMessage: msg.message,
          };
          return [...prev, newMsg];
        });
        setCurrentText('');
        setCurrentTools([]);
        setIsGenerating(false);
        break;

      case 'stats':
        setStats({ cost: msg.cost, tokens: msg.tokens, duration: msg.duration });
        break;

      case 'error':
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${msg.message}`,
        }]);
        setIsGenerating(false);
        break;

      case 'ready':
        break;
    }
  }, [currentText, currentTools]);

  const { connected, sendChat, interrupt } = useWebSocket({
    sessionId,
    onMessage: handleServerMessage,
  });

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setIsGenerating(true);
    setCurrentText('');
    setCurrentTools([]);
    sendChat(trimmed);

    // 重置输入框高度
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // 自动调整高度
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  function toggleTool(index: number) {
    setCurrentTools(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], expanded: !updated[index].expanded };
      return updated;
    });
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* 顶栏 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {model && <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{model}</span>}
          </span>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <button
          onClick={() => setShowStats(!showStats)}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {stats ? `$${stats.cost.toFixed(4)}` : '统计'}
        </button>
      </header>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i}>
            <MessageBubble role={msg.role} content={msg.content} />
            {msg.toolCalls?.map((tc, j) => (
              <ToolCallCard
                key={j}
                tool={tc.tool}
                result={tc.result}
                expanded={tc.expanded}
                onToggle={() => {
                  setMessages(prev => {
                    const updated = [...prev];
                    const msg = { ...updated[i] };
                    const tools = [...(msg.toolCalls || [])];
                    tools[j] = { ...tools[j], expanded: !tools[j].expanded };
                    msg.toolCalls = tools;
                    updated[i] = msg;
                    return updated;
                  });
                }}
              />
            ))}
          </div>
        ))}

        {/* 当前流式输出 */}
        {isGenerating && (
          <div>
            {currentTools.map((tc, j) => (
              <ToolCallCard
                key={j}
                tool={tc.tool}
                result={tc.result}
                expanded={tc.expanded}
                onToggle={() => toggleTool(j)}
              />
            ))}
            {currentText && (
              <MessageBubble role="assistant" content={currentText} streaming />
            )}
            {!currentText && currentTools.length === 0 && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <div className="animate-pulse">思考中...</div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 统计面板 */}
      {showStats && stats && (
        <StatsPanel stats={stats} onClose={() => setShowStats(false)} />
      )}

      {/* 输入栏 */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800 shrink-0">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Shift+Enter 换行)"
            rows={1}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-[200px]"
            disabled={!connected}
          />
          {isGenerating ? (
            <button
              onClick={interrupt}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              停止
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!connected || !input.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
            >
              发送
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Task 12: 消息渲染组件

**Files:**
- Create: `client/src/components/MessageBubble.tsx`
- Create: `client/src/components/ToolCallCard.tsx`

- [ ] **Step 1: 实现消息气泡组件**

```tsx
// client/src/components/MessageBubble.tsx
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export default function MessageBubble({ role, content, streaming }: Props) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children, ...props }) => (
                  <pre {...props} className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto text-sm">
                    {children}
                  </pre>
                ),
                code: ({ children, className, ...props }) => {
                  const isInline = !className;
                  if (isInline) {
                    return <code {...props} className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">{children}</code>;
                  }
                  return <code {...props} className={className}>{children}</code>;
                },
              }}
            >
              {content}
            </ReactMarkdown>
            {streaming && (
              <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 实现工具调用卡片组件**

```tsx
// client/src/components/ToolCallCard.tsx
import type { ToolInfo } from '@ccw/shared';

interface Props {
  tool: ToolInfo;
  result?: string;
  expanded: boolean;
  onToggle: () => void;
}

const TOOL_ICONS: Record<string, string> = {
  Bash: 'terminal',
  Read: 'document',
  Edit: 'pencil',
  Write: 'document-add',
  Glob: 'search',
  Grep: 'search',
  Agent: 'sparkles',
  WebFetch: 'globe',
  WebSearch: 'globe',
};

function getToolIcon(name: string): string {
  return TOOL_ICONS[name] || 'cube';
}

export default function ToolCallCard({ tool, result, expanded, onToggle }: Props) {
  const icon = getToolIcon(tool.name);

  return (
    <div className="ml-4 mb-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/50">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className="text-gray-400 text-xs">{icon}</span>
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{tool.name}</span>
        <span className="text-xs text-gray-500 dark:text-gray-500 truncate flex-1">
          {tool.summary}
        </span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {tool.input && Object.keys(tool.input).length > 0 && (
            <div className="px-3 py-2">
              <div className="text-xs text-gray-500 mb-1">输入</div>
              <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto max-h-[200px]">
                {JSON.stringify(tool.input, null, 2)}
              </pre>
            </div>
          )}
          {result && (
            <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 mb-1">输出</div>
              <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto max-h-[300px]">
                {result}
              </pre>
            </div>
          )}
          {!result && (
            <div className="px-3 py-2 text-xs text-gray-400 animate-pulse">
              执行中...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Task 13: 统计面板

**Files:**
- Create: `client/src/components/StatsPanel.tsx`

- [ ] **Step 1: 实现统计面板组件**

```tsx
// client/src/components/StatsPanel.tsx
interface Props {
  stats: {
    cost: number;
    tokens: number;
    duration: number;
  };
  onClose: () => void;
}

export default function StatsPanel({ stats, onClose }: Props) {
  const durationSec = (stats.duration / 1000).toFixed(1);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">费用: </span>
            <span className="font-mono text-gray-900 dark:text-white">${stats.cost.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-gray-500">Tokens: </span>
            <span className="font-mono text-gray-900 dark:text-white">{stats.tokens.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">耗时: </span>
            <span className="font-mono text-gray-900 dark:text-white">{durationSec}s</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

---

## Task 14: 集成测试与最终验证

- [ ] **Step 1: 全量构建**

```bash
cd /home/lis/ccw
npm run build
```

Expected: 所有三个包构建成功，无报错。

- [ ] **Step 2: 启动服务**

```bash
JWT_SECRET=test-secret-key npm start &
sleep 3
curl -s http://localhost:3000/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 3: 测试登录 API**

```bash
# 使用默认用户登录
curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

Expected: 返回包含 `token` 的 JSON。

- [ ] **Step 4: 测试会话 API**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 创建会话
curl -s -X POST http://localhost:3000/api/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"测试会话"}'

# 获取会话列表
curl -s http://localhost:3000/api/sessions \
  -H "Authorization: Bearer $TOKEN"
```

Expected: 返回会话列表 JSON。

- [ ] **Step 5: 测试 WebSocket 连接**

```bash
# 使用 wscat 测试（如果没有安装：npm i -g wscat）
wscat -c "ws://localhost:3000/ws?token=$TOKEN" -x '{"type":"chat","content":"hello"}'
```

Expected: 收到 `ready` 消息，然后收到流式响应。

- [ ] **Step 6: 验证前端页面可访问**

```bash
curl -s http://localhost:3000/ | head -20
```

Expected: 返回 HTML 页面（包含 `<div id="root">`）。

- [ ] **Step 7: 停止服务**

```bash
kill %1 2>/dev/null
```
