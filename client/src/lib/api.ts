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
  if (token) headers['Authorization'] = `Bearer ${token}`;

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
