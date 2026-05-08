# Claude Code Web — 设计文档

## 概述

将 Claude Code CLI 的交互实时映射到 Web 界面，解析 stream-json 事件渲染为富 UI（消息卡片、工具调用可视化、费用统计），支持局域网/远程访问。

## 核心需求

- 远程访问：从局域网内任意设备（笔记本、平板、手机）使用 Claude Code
- 原生 Web UI：解析 stream-json 事件，非终端透传
- MVP 功能：基础对话、工具调用可视化、费用/统计面板、会话管理
- 安全：用户名+密码认证，JWT，速率限制

## 技术栈

| 层      | 技术                                    |
| ------- | --------------------------------------- |
| 后端    | Express + ws + @anthropic-ai/claude-agent-sdk |
| 前端    | React 18 + Vite + TypeScript + Tailwind CSS |
| 共享    | TypeScript 类型（npm workspaces）       |
| 构建    | npm workspaces                          |

## 项目结构

```
ccw/
├── package.json                  # npm workspaces 根配置
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # 入口：Express + WebSocket 服务器
│       ├── auth.ts               # 用户名+密码认证中间件
│       ├── session.ts            # Claude 会话管理（创建/恢复/销毁）
│       ├── ws-handler.ts         # WebSocket 消息路由
│       └── types.ts              # 服务端类型
├── client/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx              # React 入口
│       ├── App.tsx               # 路由：登录 / 会话列表 / 会话界面
│       ├── hooks/
│       │   └── useWebSocket.ts   # WebSocket 连接管理
│       ├── components/
│       │   ├── ChatView.tsx      # 主对话界面
│       │   ├── MessageBubble.tsx # 消息渲染（Markdown + 代码高亮）
│       │   ├── ToolCallCard.tsx  # 工具调用折叠卡片
│       │   ├── StatsPanel.tsx    # 费用/统计面板
│       │   ├── SessionList.tsx   # 会话列表
│       │   └── Login.tsx         # 登录页
│       └── styles/
│           └── globals.css       # Tailwind CSS
└── shared/
    ├── package.json
    └── src/
        └── protocol.ts           # WebSocket 协议类型定义
```

## WebSocket 协议

```typescript
// shared/src/protocol.ts

// 客户端 → 服务端
type ClientMessage =
  | { type: 'chat'; content: string }
  | { type: 'interrupt' }
  | { type: 'resume'; sessionId: string }

// 服务端 → 客户端
type ServerMessage =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_start'; tool: ToolInfo }
  | { type: 'tool_delta'; input: string }
  | { type: 'tool_result'; result: string }
  | { type: 'message_done'; message: AssistantMessage }
  | { type: 'session_info'; sessionId: string; model: string }
  | { type: 'stats'; cost: number; tokens: number; duration: number }
  | { type: 'error'; message: string }
  | { type: 'ready' }
```

服务端将 claude-agent-sdk 的流式事件解析为语义化的 ServerMessage，前端不需要理解 Claude API 原始格式。

### 工具调用生命周期

1. `tool_start` — 工具调用开始（包含工具名、输入参数摘要）
2. `tool_delta` — 输入参数流式片段（仅大输入时出现，如文件内容）
3. `tool_result` — 工具调用完成（包含执行结果）

一次助手回复可能包含多个工具调用，每个独立触发上述三段式。`message_done` 在整条助手回复（含所有工具调用）完成后触发。

## 认证与安全

### 认证流程

1. 用户在登录页输入用户名+密码
2. 后端验证后签发 JWT（默认有效期 24h）
3. WebSocket 连接时通过 query param 传递 token，验证失败断开
4. API 请求通过 Authorization header 验证

### 安全措施

- 密码 bcrypt 哈希，存储在 config/users.json
- JWT secret 通过环境变量 `JWT_SECRET` 配置
- 单用户最多 3 个并发会话
- 速率限制：登录 5次/分钟，消息 30条/分钟
- maxTurns / maxBudgetUsd 上限防止失控
- CSP headers 防 XSS
- CORS 限制

### 不做（MVP 外）

- TLS（反向代理负责）
- 多用户 RBAC
- 审计日志

## 前端 UI

### 页面路由

- `/login` — 登录页
- `/` — 会话列表
- `/chat/:sessionId` — 主对话界面

### 主对话界面布局

```
┌─────────────────────────────────────────────┐
│  [≡] Claude Code Web    [Model: sonnet] [💰] │  ← 顶栏
├─────────────────────────────────────────────┤
│                                             │
│  用户消息                                    │
│                                             │
│  助手回复（Markdown + 代码高亮）              │
│                                             │
│  ┌─ 🔧 Bash: npm test ──────────────── [▸] ┐│  ← 工具调用卡片
│  └─────────────────────────────────────────┘│
│                                             │
│  正在输入...█                                │  ← 流式输出
│                                             │
├─────────────────────────────────────────────┤
│  [📎] 输入消息...                    [Send]  │  ← 底部输入栏
└─────────────────────────────────────────────┘
```

### 交互细节

- 消息气泡：用户右对齐灰底，助手左对齐白底
- Markdown 渲染：react-markdown + rehype-highlight
- 工具调用卡片：图标+工具名+摘要，默认折叠，点击展开
- 流式输出：光标动画，实时追加
- 中断按钮：生成过程中显示
- 费用统计：顶栏 💰 展开抽屉
- 响应式：移动端适配

## 后端架构

### 核心模块

- `index.ts` — 启动 Express + WebSocket
- `auth.ts` — JWT 签发/验证，密码校验
- `session.ts` — Claude 会话生命周期
- `ws-handler.ts` — WebSocket 消息路由

### 数据流

```
浏览器 → WS: chat → 服务端 → claude-agent-sdk query()
服务端 ← stream_event ← claude-agent-sdk
浏览器 ← text_delta/tool_start/stats ← 服务端
```

### 会话管理

- 元数据存储在 data/sessions.json
- 对话历史由 claude-agent-sdk 管理，通过 resume 恢复
- 会话标题：用户第一条消息前 30 字符

### 会话存储格式

```json
{
  "sessions": [
    {
      "id": "uuid",
      "title": "用户第一条消息前30字符...",
      "model": "sonnet",
      "createdAt": "2026-05-08T10:00:00Z",
      "updatedAt": "2026-05-08T10:30:00Z",
      "totalCostUsd": 0.05,
      "numTurns": 3
    }
  ]
}
```

## 环境变量

| 变量            | 必需 | 默认值 | 说明           |
| --------------- | ---- | ------ | -------------- |
| JWT_SECRET      | 是   | —      | JWT 签名密钥   |
| PORT            | 否   | 3000   | 服务端口       |
| CLAUDE_MODEL    | 否   | —      | Claude 模型    |
| MAX_TURNS       | 否   | 50     | 单次最大轮数   |
| MAX_BUDGET_USD  | 否   | 5.0    | 单次最大费用   |

## 部署

```bash
npm install
npm run build     # 构建前后端
npm start         # 启动
```
