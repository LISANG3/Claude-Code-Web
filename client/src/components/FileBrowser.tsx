import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../lib/api';
import type { FileEntry } from '@ccw/shared';

interface Props {
  visible: boolean;
  onFileSelect?: (path: string) => void;
}

function FileIcon({ entry }: { entry: FileEntry }) {
  if (entry.type === 'directory') {
    return <span className="text-yellow-500 text-xs">📁</span>;
  }
  const ext = entry.extension || '';
  const colors: Record<string, string> = {
    '.ts': 'text-blue-500', '.tsx': 'text-cyan-500',
    '.js': 'text-yellow-500', '.jsx': 'text-cyan-400',
    '.json': 'text-gray-500', '.md': 'text-gray-400',
    '.css': 'text-pink-500', '.html': 'text-orange-500',
    '.py': 'text-green-500', '.rs': 'text-orange-600',
  };
  return <span className={`text-xs ${colors[ext] || 'text-gray-400'}`}>📄</span>;
}

export default function FileBrowser({ visible, onFileSelect }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('.');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
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

  function toggleDir(path: string) {
    const next = new Set(expandedDirs);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
      loadDir(path);
    }
    setExpandedDirs(next);
  }

  function formatSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  function formatTime(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return '刚刚';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}分钟前`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}小时前`;
    return `${Math.floor(diff / 86400_000)}天前`;
  }

  if (!visible) return null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 text-sm">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">文件</span>
        {currentPath !== '.' && (
          <button
            onClick={() => {
              const parent = currentPath.split('/').slice(0, -1).join('/') || '.';
              loadDir(parent);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ..
          </button>
        )}
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
                  toggleDir(entry.path);
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
              <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {formatSize(entry.size)}
              </span>
              <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity w-12 text-right">
                {formatTime(entry.modified)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
