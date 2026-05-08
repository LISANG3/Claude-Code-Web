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

  useEffect(() => { loadSessions(); }, []);

  async function loadSessions() {
    try {
      setSessions(await getSessions());
    } catch { /* handled by api.ts */ }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    try {
      const session = await createSession(newTitle.trim());
      navigate(`/chat/${session.id}`);
    } catch (err: any) { alert(err.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此会话？')) return;
    try {
      await deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err: any) { alert(err.message); }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Claude Code Web</h1>
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          退出
        </button>
      </header>

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
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{session.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {session.model} · {session.numTurns} 轮 · ${session.totalCostUsd.toFixed(4)} · {new Date(session.updatedAt).toLocaleString('zh-CN')}
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
