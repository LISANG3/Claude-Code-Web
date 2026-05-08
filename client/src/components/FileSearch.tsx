import { useState, useEffect, useRef, useCallback } from 'react';
import { getToken } from '../lib/api';

interface Props {
  visible: boolean;
  onSelect: (path: string) => void;
  onClose: () => void;
}

interface SearchResult {
  path: string;
  name: string;
}

export default function FileSearch({ visible, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/files/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
        setSelected(0);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      e.preventDefault();
      onSelect(results[selected].path);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索文件... (输入文件名)"
            className="w-full text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-xs text-gray-400 animate-pulse">搜索中...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-400">
              {query ? '无匹配文件' : '输入文件名搜索'}
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.path}
                onClick={() => { onSelect(r.path); onClose(); }}
                className={`w-full px-4 py-2 text-left flex items-center gap-3 text-sm transition-colors ${
                  i === selected
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className="text-gray-400">📄</span>
                <div className="flex-1 min-w-0">
                  <span className="text-gray-900 dark:text-white">{r.name}</span>
                  <span className="text-gray-400 text-xs ml-2 truncate">{r.path}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
