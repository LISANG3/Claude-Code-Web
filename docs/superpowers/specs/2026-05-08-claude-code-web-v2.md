# Claude Code Web v2 — Codex-Level Feature Upgrade Spec

## 概述

将 CCW 从基础聊天界面对标 OpenAI Codex GUI 的功能覆盖级别。当前实现仅有基础对话、工具调用折叠卡片、费用统计和会话管理。v2 需要增加：文件浏览器、代码 Diff 视图、Git 集成、任务队列、环境面板、多标签聊天、增强工具可视化、设置面板、活动时间线、成本仪表盘。

## 当前状态

已有功能：
- 基础聊天 + 流式输出
- 工具调用折叠卡片（仅显示 JSON）
- 思考过程展开/折叠
- 终端原始事件查看器
- 25 个斜杠命令
- 费用/Token/耗时统计
- 会话 CRUD
- JWT 认证

## 目标架构

```
┌──────────────────────────────────────────────────────────────────────┐
│  [☰] Claude Code Web    [Project: ccw] [Branch: main] [⚙️] [👤]     │  ← 全局顶栏
├────────┬─────────────────────────────────────────────┬───────────────┤
│        │                                             │               │
│  文件  │  聊天区域                                    │   环境面板    │
│  浏览  │  ┌─────────────────────────────────────┐    │   ┌─────────┐ │
│  器    │  │ 用户消息                             │    │   │ Git 信息│ │
│        │  │ 助手回复 (Markdown)                  │    │   │ 分支    │ │
│  ────  │  │ ┌─ Diff: src/foo.ts ────────────┐   │    │   │ 最近提交│ │
│  项目  │  │ │ - old line                     │   │    │   ├─────────┤ │
│  文件  │  │ │ + new line                     │   │    │   │ 依赖    │ │
│  树    │  │ └────────────────────────────────┘   │    │   │ 环境变量│ │
│        │  │ ┌─ 🔧 Bash: npm test ──────────┐    │    │   ├─────────┤ │
│  ────  │  │ │ stdout: ...                   │    │    │   │ 任务队列│ │
│  Git   │  │ └────────────────────────────────┘   │    │   │ 运行中  │ │
│  面板  │  │ 正在输入...█                          │    │   │ 排队中  │ │
│        │  └─────────────────────────────────────┘    │   └─────────┘ │
│        │  ┌─ 输入栏 ─────────────────────────┐      │               │
│        │  │ / 命令菜单                 [发送]  │      │               │
│        │  └──────────────────────────────────┘      │               │
├────────┴─────────────────────────────────────────────┴───────────────┤
│  [Terminal] [活动时间线] [成本: $0.05] [Tokens: 12k] [耗时: 3.2s]   │  ← 底部状态栏
└──────────────────────────────────────────────────────────────────────┘
```

## 功能模块

### 模块 1: 文件浏览器 (File Browser)

**目标:** 左侧文件树面板，可浏览项目文件、查看文件内容、搜索文件。

**UI:**
- 可折叠左侧边栏 (240px)
- 递归文件树，支持展开/折叠目录
- 文件图标区分类型（ts/tsx/json/md 等）
- 点击文件显示内容（只读预览）
- 文件搜索（Ctrl+P 风格模糊搜索）
- 文件大小和最后修改时间
- 右键菜单：复制路径、在终端打开

**后端 API:**
- `GET /api/files?path=` — 列出目录内容
- `GET /api/files/content?path=` — 读取文件内容
- `GET /api/files/search?q=` — 搜索文件名

**安全:** 路径遍历防护，限制在 `WORKSPACE_DIR` 内。

### 模块 2: 代码 Diff 视图 (Diff View)

**目标:** 工具调用中的 Edit/Write 操作显示代码差异，而非原始 JSON。

**UI:**
- 并排 diff 视图（side-by-side）
- 行号标注
- 绿色新增 / 红色删除 / 灰色上下文
- 语法高亮
- 文件路径作为标题
- 可折叠（默认展开当前 diff，折叠历史 diff）

**实现:**
- 客户端解析 Edit/Write 工具的 input，提取 old_string/new_string 或 content
- 使用 diff 库生成差异
- 新组件 `DiffView.tsx`

**依赖:** `diff` (npm)

### 模块 3: Git 集成面板 (Git Panel)

**目标:** 右侧面板显示 Git 状态，支持分支切换、提交历史查看。

**UI:**
- 当前分支名 + 切换下拉
- 工作区变更文件列表（modified/added/deleted）
- 最近 10 条提交（hash + message + date）
- 暂存区状态
- 一键提交按钮（调用 Claude 执行 git commit）
- PR 创建快捷按钮

**后端 API:**
- `GET /api/git/status` — git status
- `GET /api/git/log?limit=10` — git log
- `GET /api/git/branches` — 分支列表
- `POST /api/git/checkout` — 切换分支
- `POST /api/git/commit` — 提交（message）

**安全:** 只读操作默认允许，写操作（commit/checkout）需要确认。

### 模块 4: 任务队列 (Task Queue)

**目标:** 支持多任务并发，类似 Codex 的任务面板。

**UI:**
- 右侧面板或底部抽屉
- 任务卡片：标题、状态（运行中/排队中/完成/失败）、进度
- 任务操作：暂停、取消、重试
- 任务间快速切换
- 并发任务数限制显示

**后端:**
- 改造 `ws-handler.ts` 支持多任务并行
- 新增 `task_queue.ts` 模块
- 任务状态持久化到 `data/tasks.json`

**WebSocket 协议扩展:**
```typescript
// 新增 ClientMessage
| { type: 'task_create'; content: string; sessionId?: string }
| { type: 'task_cancel'; taskId: string }
| { type: 'task_switch'; taskId: string }

// 新增 ServerMessage
| { type: 'task_update'; taskId: string; status: 'queued'|'running'|'done'|'failed'; progress?: number }
| { type: 'task_list'; tasks: TaskInfo[] }
```

### 模块 5: 环境面板 (Environment Panel)

**目标:** 右侧可折叠面板，显示运行环境信息。

**UI:**
- 系统信息：OS、Node 版本、磁盘空间
- Git 信息：分支、最近提交、远程仓库
- 项目依赖：package.json 中的关键依赖
- 环境变量：可配置的 env 列表（脱敏显示）
- Claude 配置：当前模型、maxTurns、maxBudgetUsd

**后端 API:**
- `GET /api/environment` — 聚合所有环境信息

### 模块 6: 增强工具可视化 (Enhanced Tool Rendering)

**目标:** 每种工具有专用渲染，而非统一 JSON。

**工具渲染器:**
- **Bash:** 终端风格输出，支持 ANSI 颜色码、stdout/stderr 分离
- **Read:** 代码文件预览，带行号和语法高亮
- **Edit:** Diff 视图（见模块 2）
- **Write:** 新文件内容预览
- **Glob:** 文件列表，可点击跳转
- **Grep:** 搜索结果列表，带匹配行预览和行号
- **WebFetch:** 网页内容摘要
- **WebSearch:** 搜索结果卡片
- **Agent:** 子任务嵌套展示

**新组件:**
- `tools/BashOutput.tsx`
- `tools/FilePreview.tsx`
- `tools/DiffView.tsx`
- `tools/FileList.tsx`
- `tools/SearchResults.tsx`
- `tools/WebResult.tsx`

### 模块 7: 多标签聊天 (Multi-Tab Chat)

**目标:** 顶部标签栏，支持同时打开多个聊天会话。

**UI:**
- 顶部标签栏，可拖拽排序
- 新建标签按钮 (+)
- 标签显示会话标题 + 关闭按钮
- 每个标签独立的 WebSocket 连接或共享连接
- 标签右键菜单：重命名、复制、关闭其他

**实现:**
- 改造 `useWebSocket` 支持多会话
- 每个标签对应一个 `ChatView` 实例
- 共享 WebSocket 连接，通过 sessionId 路由消息

### 模块 8: 设置面板 (Settings Page)

**目标:** 全局设置页面，配置模型、权限、主题等。

**UI:**
- 模型选择：sonnet/opus/haiku + 自定义
- 推理力度：low/medium/high/xhigh/max
- 最大轮次：滑块 1-100
- 最大费用：输入框 0-100
- 权限模式：default/acceptEdits/auto/bypassPermissions/plan
- 主题：light/dark/system
- 语言：中文/English
- 工作目录：显示 + 修改
- Claude 路径：显示 + 修改

**后端:**
- `GET /api/settings` — 获取当前设置
- `PUT /api/settings` — 更新设置
- 设置存储在 `data/settings.json`

### 模块 9: 活动时间线 (Activity Timeline)

**目标:** 底部可展开面板，显示所有操作的可视化时间线。

**UI:**
- 时间线视图，每个事件一个节点
- 事件类型：消息、工具调用、思考、错误
- 点击节点跳转到对应消息
- 过滤器：按事件类型过滤
- 时间戳标注

### 模块 10: 成本仪表盘 (Cost Dashboard)

**目标:** 汇总所有会话的成本统计。

**UI:**
- 总费用、总会话数、总轮次
- 按日/周/月的费用趋势图
- 按模型的费用分布
- 单会话费用排行
- Token 使用量统计

**后端 API:**
- `GET /api/stats/overview` — 汇总统计
- `GET /api/stats/history?period=day|week|month` — 历史趋势

### 模块 11: 键盘快捷键 (Keyboard Shortcuts)

**目标:** Power user 快捷键支持。

**快捷键:**
- `Ctrl+P` — 文件搜索
- `Ctrl+Shift+P` — 命令面板
- `Ctrl+N` — 新建会话
- `Ctrl+W` — 关闭当前标签
- `Ctrl+Tab` — 切换标签
- `Ctrl+/` — 切换侧边栏
- `Ctrl+B` — 切换文件浏览器
- `Ctrl+J` — 切换终端视图
- `Ctrl+Enter` — 发送消息
- `Escape` — 中断生成 / 关闭弹窗

### 模块 12: 通知系统 (Notifications)

**目标:** 任务完成或需要关注时通知用户。

**UI:**
- 右上角通知弹窗
- 通知中心（铃铛图标 + 下拉列表）
- 浏览器通知（需授权）
- 声音提示（可选）

**触发条件:**
- 任务完成
- 任务失败
- 费用超过阈值
- 错误发生

---

## 协议扩展

### 新增 ClientMessage

```typescript
| { type: 'task_create'; content: string; sessionId?: string }
| { type: 'task_cancel'; taskId: string }
| { type: 'task_switch'; taskId: string }
| { type: 'file_request'; path: string }
| { type: 'settings_update'; settings: Partial<AppSettings> }
```

### 新增 ServerMessage

```typescript
| { type: 'task_update'; taskId: string; status: TaskStatus; progress?: number }
| { type: 'task_list'; tasks: TaskInfo[] }
| { type: 'file_content'; path: string; content: string; language?: string }
| { type: 'git_status'; status: GitStatus }
| { type: 'notification'; level: 'info'|'warn'|'error'; message: string }
```

---

## 新增文件清单

### 服务端 (server/src/)
- `files.ts` — 文件浏览 API
- `git.ts` — Git 操作 API
- `environment.ts` — 环境信息 API
- `settings.ts` — 设置管理
- `task_queue.ts` — 任务队列管理
- `stats.ts` — 统计 API

### 客户端组件 (client/src/components/)
- `FileBrowser.tsx` — 文件树
- `FilePreview.tsx` — 文件内容预览
- `FileSearch.tsx` — 文件搜索弹窗
- `DiffView.tsx` — 代码 diff 视图
- `GitPanel.tsx` — Git 面板
- `EnvironmentPanel.tsx` — 环境面板
- `TaskQueue.tsx` — 任务队列
- `Settings.tsx` — 设置页面
- `ActivityTimeline.tsx` — 活动时间线
- `CostDashboard.tsx` — 成本仪表盘
- `NotificationBell.tsx` — 通知铃铛
- `KeyboardShortcuts.tsx` — 快捷键管理
- `TabBar.tsx` — 多标签栏
- `CommandPalette.tsx` — 命令面板 (Ctrl+Shift+P)
- `Sidebar.tsx` — 可折叠侧边栏容器
- `tools/BashOutput.tsx` — Bash 输出渲染
- `tools/FileListRenderer.tsx` — 文件列表渲染
- `tools/SearchResults.tsx` — 搜索结果渲染
- `tools/WebResult.tsx` — 网页结果渲染

### 客户端 Hooks
- `useKeyboardShortcuts.ts` — 快捷键 Hook
- `useFileBrowser.ts` — 文件浏览 Hook
- `useGit.ts` — Git 操作 Hook
- `useNotifications.ts` — 通知 Hook

---

## 实现优先级

### P0 — 核心体验提升 (必须)
1. 增强工具可视化 (模块 6) — 最大 ROI，当前工具卡片太简陋
2. Diff 视图 (模块 2) — 代码变更的核心体验
3. 文件浏览器 (模块 1) — Codex 标志性功能
4. 多标签聊天 (模块 7) — 多任务基础

### P1 — 功能完善 (重要)
5. Git 面板 (模块 3) — 开发工作流核心
6. 环境面板 (模块 5) — 上下文信息
7. 设置面板 (模块 8) — 用户配置
8. 键盘快捷键 (模块 11) — 效率提升

### P2 — 高级功能 (锦上添花)
9. 任务队列 (模块 4) — 需要较大后端改造
10. 活动时间线 (模块 9) — 可视化增强
11. 成本仪表盘 (模块 10) — 数据分析
12. 通知系统 (模块 12) — 用户体验

---

## 技术依赖

### 新增 npm 包

**客户端:**
- `diff` — 文本差异计算
- `@uiw/react-codemirror` — 代码编辑器（可选，用于文件预览）
- `recharts` — 图表（成本仪表盘）
- `lucide-react` — 图标库（统一图标风格）

**服务端:**
- `simple-git` — Git 操作封装
- `glob` — 文件模式匹配
- `ansi-to-html` — ANSI 颜色码转换

---

## 界面线框

### 主布局 (三栏)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [☰] CCW   [Tab 1] [Tab 2] [+]   [Project: ccw] [main ▾] [⚙️] [🔔] │
├────────┬───────────────────────────────────────┬─────────────────────┤
│ 📁 文件│                                       │ 🌿 Git              │
│        │                                       │ main                │
│ src/   │  用户: 帮我修复 auth.ts 的 bug         │ 3 files changed     │
│  ├─ .. │                                       │                     │
│  ├─ .. │  🤖 我来查看 auth.ts 文件             │ 📊 环境             │
│  └─ .. │                                       │ Node 22.x           │
│        │  ┌─ Read: auth.ts ──────────────┐     │ 12 dependencies     │
│ server/│  │  1 │ import jwt from...      │     │                     │
│  └─ .. │  │  2 │ const SECRET = ...      │     │ 📋 任务             │
│        │  └──────────────────────────────┘     │ ✅ Fix auth bug     │
│ 🔍搜索 │                                       │ 🔄 Update deps      │
│        │  找到问题了，SECRET 没有从 env 读取     │                     │
│        │                                       │                     │
│        │  ┌─ Edit: auth.ts ──────────────┐     │                     │
│        │  │  41 - const SECRET = 'hard..'│     │                     │
│        │  │  41 + const SECRET = process..│     │                     │
│        │  └──────────────────────────────┘     │                     │
│        │                                       │                     │
│        │  ┌─ 输入消息... ────────────────┐     │                     │
│        │  │                        [发送] │     │                     │
│        │  └──────────────────────────────┘     │                     │
├────────┴───────────────────────────────────────┴─────────────────────┤
│ [Terminal] [Timeline]  $0.0234  1,234 tokens  3.2s  [Cost: $1.23]  │
└──────────────────────────────────────────────────────────────────────┘
```

### Diff 视图细节

```
┌─ Edit: server/src/auth.ts ──────────────────────────────────── [▸] ┐
│  40 │   const SECRET = 'hardcoded-secret';                         │
│  41 │ - const token = jwt.sign({ username }, SECRET, ...);        │
│  41 │ + const token = jwt.sign({ username }, JWT_SECRET, ...);    │
│  42 │                                                             │
└────────────────────────────────────────────────────────────────────┘
```

### 文件浏览器细节

```
┌─ 📁 文件 ─────────────────────────────────┐
│ 🔍 搜索文件...                              │
│                                            │
│ ▼ ccw/                                     │
│   ▼ src/                                   │
│     📄 index.ts           2.1 KB  5min ago │
│     📄 auth.ts            3.4 KB  2hr ago  │
│     📄 session.ts         1.8 KB  1hr ago  │
│     📄 ws-handler.ts      8.2 KB  30min ago│
│     📄 types.ts           0.5 KB  2hr ago  │
│   ▼ config/                                │
│     📄 users.json         0.2 KB  1d ago   │
│   📄 package.json         1.1 KB  3d ago   │
│   📄 tsconfig.json        0.3 KB  3d ago   │
└────────────────────────────────────────────┘
```

---

## 性能考虑

- 文件树懒加载：只加载展开的目录
- Diff 计算在客户端进行，减少服务端负载
- 虚拟滚动：长文件列表和大量消息
- WebSocket 消息批量发送，减少帧数
- 图片和大文件不在浏览器中渲染

## 安全考虑

- 文件浏览限制在工作目录内（路径遍历防护）
- Git 写操作需要二次确认
- 环境变量脱敏显示（隐藏 SECRET/KEY/PASSWORD）
- 文件内容 API 限制大小（最大 1MB）
- 速率限制对文件 API 同样生效
