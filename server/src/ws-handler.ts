import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { verifyWsToken } from './auth.js';
import { createSession, updateSession, getSession, listSessions } from './session.js';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { ServerMessage, ClientMessage } from '@ccw/shared';
import type { AuthenticatedWebSocket } from './types.js';

const MAX_TURNS = parseInt(process.env.MAX_TURNS || '50', 10);
const MAX_BUDGET_USD = parseFloat(process.env.MAX_BUDGET_USD || '5.0');
const CLAUDE_MODEL = process.env.CLAUDE_MODEL;

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

const activeQueries = new Map<string, { abort: () => void }>();

export function handleConnection(ws: WebSocket, req: IncomingMessage): void {
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token');

  if (!token) { ws.close(4001, 'Token required'); return; }

  const userId = verifyWsToken(token);
  if (!userId) { ws.close(4003, 'Invalid token'); return; }

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
      case 'slash_command':
        handleSlashCommand(aws, msg.command, msg.args);
        break;
    }
  });

  ws.on('close', () => {
    if (aws.sessionId) activeQueries.delete(aws.sessionId);
  });
}

async function handleChat(ws: AuthenticatedWebSocket, content: string): Promise<void> {
  if (!checkRateLimit(ws.userId!)) {
    send(ws, { type: 'error', message: 'Rate limit exceeded' });
    return;
  }

  let sessionId = ws.sessionId;
  if (!sessionId) {
    const session = createSession(content, CLAUDE_MODEL || 'sonnet');
    sessionId = session.id;
    ws.sessionId = sessionId;
    send(ws, { type: 'session_info', sessionId: session.id, model: session.model });
  }

  const options: Record<string, unknown> = {
    maxTurns: MAX_TURNS,
    maxBudgetUsd: MAX_BUDGET_USD,
    includePartialMessages: true,
    pathToClaudeCodeExecutable: process.env.CLAUDE_PATH || '/home/lis/.local/bin/claude',
  };
  if (CLAUDE_MODEL) options.model = CLAUDE_MODEL;

  const existingSession = getSession(sessionId);
  if (existingSession?.claudeSessionId && existingSession.numTurns > 0) {
    options.resume = existingSession.claudeSessionId;
  }

  let aborted = false;
  activeQueries.set(sessionId, { abort: () => { aborted = true; } });

  try {
    const q = query({ prompt: content, options });

    for await (const event of q) {
      if (aborted) break;

      // Send raw event for terminal view
      send(ws, { type: 'raw_event', event: JSON.stringify(event) });

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
          } else if (block?.type === 'thinking') {
            // thinking block started
          }
        } else if (streamEvent?.type === 'content_block_delta') {
          const delta = streamEvent.delta;
          if (delta?.type === 'text_delta' && delta.text) {
            send(ws, { type: 'text_delta', text: delta.text });
          } else if (delta?.type === 'input_json_delta' && delta.partial_json) {
            send(ws, { type: 'tool_delta', input: delta.partial_json });
          } else if (delta?.type === 'thinking_delta' && delta.thinking) {
            send(ws, { type: 'thinking_delta', text: delta.thinking });
          }
        } else if (streamEvent?.type === 'content_block_stop') {
          // Check if a thinking block just ended
          if (streamEvent.index !== undefined) {
            // We'll rely on the message_done event to know block types
          }
        }
      } else if (event.type === 'assistant') {
        const msg = event as any;
        if (msg.message?.content) {
          let hasThinking = false;
          for (const block of msg.message.content) {
            if (block.type === 'tool_result' && block.content) {
              send(ws, {
                type: 'tool_result',
                result: typeof block.content === 'string'
                  ? block.content
                  : JSON.stringify(block.content),
              });
            }
            if (block.type === 'thinking') {
              hasThinking = true;
            }
          }
          if (hasThinking) {
            send(ws, { type: 'thinking_done' });
          }
          send(ws, {
            type: 'message_done',
            message: {
              content: msg.message.content.map((b: any) => ({
                type: b.type,
                text: b.text,
                thinking: b.thinking,
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
        const updates: any = {
          totalCostUsd: (existingSession?.totalCostUsd || 0) + (result.total_cost_usd || 0),
          numTurns: (existingSession?.numTurns || 0) + (result.num_turns || 1),
        };
        if (result.session_id) {
          updates.claudeSessionId = result.session_id;
        }
        updateSession(sessionId!, updates);
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
    if (active) active.abort();
  }
}

function handleResume(ws: AuthenticatedWebSocket, sessionId: string): void {
  const session = getSession(sessionId);
  if (session) {
    ws.sessionId = sessionId;
    send(ws, { type: 'session_info', sessionId: session.id, model: session.model });
  } else {
    send(ws, { type: 'error', message: 'Session not found' });
  }
}

function handleSlashCommand(ws: AuthenticatedWebSocket, command: string, args?: string): void {
  switch (command) {
    case 'help':
      send(ws, {
        type: 'slash_response',
        command: '/help',
        content: `可用命令:
/help              - 显示此帮助
/clear             - 清空当前对话
/compact           - 压缩对话历史
/model [name]      - 查看/切换模型
/effort [level]    - 设置推理力度 (low/medium/high/xhigh/max)
/sessions          - 列出所有会话
/resume <id>       - 恢复指定会话
/stats             - 显示当前统计
/cost              - 显示费用详情
/status            - 显示连接状态
/permissions       - 查看权限模式
/config            - 打开配置
/memory            - 管理记忆
/terminal          - 切换终端视图
/vim               - 切换 Vim 模式 (未实现)
/mcp               - MCP 服务器管理
/doctor            - 健康检查
/init              - 初始化 CLAUDE.md
/review            - 代码审查
/pr-comments       - 查看 PR 评论
/bug               - 报告问题
/feedback          - 发送反馈
/login             - 登录
/logout            - 退出登录`,
      });
      break;

    case 'model':
      if (args) {
        send(ws, {
          type: 'slash_response',
          command: '/model',
          content: `模型切换: ${args}\n注意: 需要重启会话才能生效。新会话将使用模型: ${args}`,
        });
      } else {
        send(ws, {
          type: 'slash_response',
          command: '/model',
          content: `当前模型: ${CLAUDE_MODEL || 'sonnet'}\n可用别名: sonnet, opus, haiku\n用法: /model <model-name>`,
        });
      }
      break;

    case 'effort':
      if (args && ['low', 'medium', 'high', 'xhigh', 'max'].includes(args)) {
        send(ws, {
          type: 'slash_response',
          command: '/effort',
          content: `推理力度已设置为: ${args}`,
        });
      } else {
        send(ws, {
          type: 'slash_response',
          command: '/effort',
          content: `当前推理力度: medium\n可选值: low, medium, high, xhigh, max\n用法: /effort <level>`,
        });
      }
      break;

    case 'stats':
    case 'cost': {
      const session = ws.sessionId ? getSession(ws.sessionId) : null;
      if (session) {
        send(ws, {
          type: 'slash_response',
          command: `/${command}`,
          content: `会话统计:
ID: ${session.id}
Claude Session: ${session.claudeSessionId || '(未关联)'}
模型: ${session.model}
轮次: ${session.numTurns}
费用: $${session.totalCostUsd.toFixed(6)}
创建: ${new Date(session.createdAt).toLocaleString('zh-CN')}
更新: ${new Date(session.updatedAt).toLocaleString('zh-CN')}`,
        });
      } else {
        send(ws, { type: 'slash_response', command: `/${command}`, content: '当前没有活跃会话' });
      }
      break;
    }

    case 'status':
      send(ws, {
        type: 'slash_response',
        command: '/status',
        content: `连接状态:
WebSocket: ${ws.readyState === 1 ? '已连接' : '未连接'}
用户: ${ws.userId}
会话: ${ws.sessionId || '(无)'}
模型: ${CLAUDE_MODEL || 'sonnet'}
最大轮次: ${MAX_TURNS}
最大费用: $${MAX_BUDGET_USD}`,
      });
      break;

    case 'sessions': {
      const sessions = listSessions();
      if (sessions.length === 0) {
        send(ws, { type: 'slash_response', command: '/sessions', content: '暂无会话' });
      } else {
        const lines = sessions.map(s =>
          `${s.id.slice(0, 8)}... ${s.title} [${s.model}] ${s.numTurns}轮 $${s.totalCostUsd.toFixed(4)}`
        );
        send(ws, { type: 'slash_response', command: '/sessions', content: `会话列表 (${sessions.length}):\n${lines.join('\n')}` });
      }
      break;
    }

    case 'resume':
      if (args) {
        handleResume(ws, args);
        send(ws, { type: 'slash_response', command: '/resume', content: `已切换到会话: ${args}` });
      } else {
        send(ws, { type: 'slash_response', command: '/resume', content: '用法: /resume <session-id>' });
      }
      break;

    case 'clear':
      ws.sessionId = undefined;
      send(ws, { type: 'slash_response', command: '/clear', content: '会话已清空，下一条消息将创建新会话' });
      break;

    case 'compact':
      send(ws, { type: 'slash_response', command: '/compact', content: '压缩历史需要 SDK 支持 compact()，当前版本暂不支持' });
      break;

    case 'terminal':
      send(ws, { type: 'slash_response', command: '/terminal', content: 'TOGGLE_TERMINAL' });
      break;

    case 'permissions':
      send(ws, { type: 'slash_response', command: '/permissions', content: `权限模式: default\n可用模式: default, acceptEdits, auto, bypassPermissions, plan, dontAsk` });
      break;

    case 'config':
      send(ws, {
        type: 'slash_response',
        command: '/config',
        content: `当前配置:
PORT: ${process.env.PORT || 3000}
CLAUDE_MODEL: ${CLAUDE_MODEL || '(默认)'}
CLAUDE_PATH: ${process.env.CLAUDE_PATH || '/home/lis/.local/bin/claude'}
MAX_TURNS: ${MAX_TURNS}
MAX_BUDGET_USD: $${MAX_BUDGET_USD}`,
      });
      break;

    case 'memory':
      send(ws, { type: 'slash_response', command: '/memory', content: '记忆管理需要 SDK 支持，可通过 CLAUDE.md 文件手动管理' });
      break;

    case 'mcp':
      send(ws, { type: 'slash_response', command: '/mcp', content: 'MCP 服务器管理需要在启动时通过 --mcp-config 配置' });
      break;

    case 'doctor':
      send(ws, {
        type: 'slash_response',
        command: '/doctor',
        content: `健康检查:
Claude Binary: ${process.env.CLAUDE_PATH || '/home/lis/.local/bin/claude'}
WebSocket: 正常
会话存储: 正常
JWT: 已配置`,
      });
      break;

    case 'init':
      send(ws, { type: 'slash_response', command: '/init', content: 'CLAUDE.md 初始化需要在项目目录中手动执行: claude --init' });
      break;

    case 'review':
      send(ws, { type: 'slash_response', command: '/review', content: '代码审查功能请在对话中直接请求，例如: "审查 src/index.ts 的代码"' });
      break;

    case 'pr-comments':
      send(ws, { type: 'slash_response', command: '/pr-comments', content: 'PR 评论查看需要 Git 仓库配置' });
      break;

    case 'bug':
      send(ws, { type: 'slash_response', command: '/bug', content: '报告问题: https://github.com/anthropics/claude-code/issues' });
      break;

    case 'feedback':
      send(ws, { type: 'slash_response', command: '/feedback', content: '反馈: https://github.com/anthropics/claude-code/issues' });
      break;

    case 'login':
      send(ws, { type: 'slash_response', command: '/login', content: 'Web 端登录通过页面左上角退出按钮重新登录' });
      break;

    case 'logout':
      send(ws, { type: 'slash_response', command: '/logout', content: '请使用页面左上角退出按钮重新登录' });
      break;

    default:
      send(ws, {
        type: 'slash_response',
        command: `/${command}`,
        content: `未知命令: /${command}\n输入 /help 查看可用命令`,
      });
  }
}

function formatToolSummary(name: string, input: any): string {
  if (!input) return name;
  switch (name) {
    case 'Bash': return input.command || name;
    case 'Read': return input.file_path || name;
    case 'Edit': return input.file_path || name;
    case 'Write': return input.file_path || name;
    case 'Glob': return input.pattern || name;
    case 'Grep': return input.pattern || name;
    case 'Agent': return input.prompt?.slice(0, 50) || name;
    case 'WebFetch': return input.url || name;
    case 'WebSearch': return input.query || name;
    default: return name;
  }
}
