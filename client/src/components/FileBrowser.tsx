import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../lib/api';
import type { FileEntry } from '@ccw/shared';

interface Props {
  visible: boolean;
  onFileSelect?: (path: string) => void;
}

function FileIcon({ entry }: { entry: FileEntry }) {
  if (entry.type === 'directory') {
    return (
      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    );
  }
  const ext = entry.extension || '';
  const colors: Record<string, string> = {
    '.ts': 'text-blue-500', '.tsx': 'text-cyan-500',
    '.js': 'text-yellow-500', '.jsx': 'text-cyan-400',
    '.json': 'text-gray-500', '.md': 'text-gray-400',
    '.css': 'text-pink-500', '.html': 'text-orange-500',
    '.py': 'text-green-500', '.rs': 'text-orange-600',
  };
  return (
    <svg className={`w-4 h-4 ${colors[ext] || 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}小时前`;
  return `${Math.floor(diff / 86400_000)}天前`;
}

export default function FileBrowser({ visible, onFileSelect }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('.');
  const [history, setHistory] = useState<string[]>(['.']);
  const [loading, setLoading] = useState(false);

  const loadDir = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setCurrentPath(path);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (visible) loadDir('.');
  }, [visible, loadDir]);

  function navigateTo(path: string) {
    const idx = history.indexOf(path);
    if (idx >= 0) {
      setHistory(history.slice(0, idx + 1));
    } else {
      setHistory([...history, path]);
    }
    loadDir(path);
  }

  function navigateUp() {
    const parts = currentPath.split('/');
    if (parts.length <= 1) return;
    const parent = parts.slice(0, -1).join('/') || '.';
    navigateTo(parent);
  }

  if (!visible) return null;

  const pathParts = currentPath === '.' ? [] : currentPath.split('/');

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 text-sm">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">文件</span>
          {currentPath !== '.' && (
            <button onClick={navigateUp} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              ↑ 上级
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 overflow-x-auto">
          <button onClick={() => navigateTo('.')} className="hover:text-gray-700 dark:hover:text-gray-300 shrink-0">
            ~
          </button>
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <span>/</span>
              <button
                onClick={() => navigateTo(pathParts.slice(0, i + 1).join('/'))}
                className="hover:text-gray-700 dark:hover:text-gray-300"
              >
                {part}
              </button>
            </span>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 text-xs text-gray-400 animate-pulse">加载中...</div>
        ) : entries.length === 0 ? (
          <div className="p-3 text-xs text-gray-400">空目录</div>
        ) : (
          entries.map(entry => (
            <button
              key={entry.path}
              onClick={() => {
                if (entry.type === 'directory') {
                  navigateTo(entry.path);
                } else {
                  onFileSelect?.(entry.path);
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
            >
              <FileIcon entry={entry} />
              <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">
                {entry.name}
              </span>
              <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {entry.type === 'file' ? formatSize(entry.size) : ''}
              </span>
              <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity w-12 text-right whitespace-nowrap">
                {formatTime(entry.modified)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
