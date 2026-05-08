// @ccw/shared - WebSocket protocol types

export interface ToolInfo {
  name: string;
  input: Record<string, unknown>;
  summary: string;
}

export interface AssistantContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
  thinking?: string;
}

export interface AssistantMessage {
  content: AssistantContentBlock[];
  stop_reason: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Client -> Server
export type ClientMessage =
  | { type: 'chat'; content: string }
  | { type: 'interrupt' }
  | { type: 'resume'; sessionId: string }
  | { type: 'slash_command'; command: string; args?: string };

// Server -> Client
export type ServerMessage =
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'thinking_done' }
  | { type: 'tool_start'; tool: ToolInfo }
  | { type: 'tool_delta'; input: string }
  | { type: 'tool_result'; result: string }
  | { type: 'message_done'; message: AssistantMessage }
  | { type: 'session_info'; sessionId: string; model: string }
  | { type: 'stats'; cost: number; tokens: number; duration: number }
  | { type: 'error'; message: string }
  | { type: 'ready' }
  | { type: 'raw_event'; event: string } // terminal view: raw NDJSON
  | { type: 'slash_response'; command: string; content: string };

// REST API
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

// === File Browser ===
export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  extension?: string;
}

export interface FileContent {
  path: string;
  content: string;
  language?: string;
  size: number;
}

export interface FileSearchResult {
  path: string;
  name: string;
  score: number;
}

// === Git ===
export interface GitStatus {
  branch: string;
  files: { path: string; status: 'modified' | 'added' | 'deleted' | 'renamed' }[];
  ahead: number;
  behind: number;
}

export interface GitCommit {
  hash: string;
  message: string;
  date: string;
  author: string;
}
