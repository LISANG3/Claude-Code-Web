import { useState, useEffect } from 'react';
import { getToken } from '../lib/api';
import FileContent from './tools/FileContent';
import type { FileContent as FileContentType } from '@ccw/shared';

interface Props {
  path: string | null;
  onClose: () => void;
}

export default function FilePreview({ path, onClose }: Props) {
  const [file, setFile] = useState<FileContentType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!path) return;
    setLoading(true);
    setError('');
    const token = getToken();
    fetch(`/api/files/content?path=${encodeURIComponent(path)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setFile)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [path]);

  if (!path) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col m-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">{path}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">加载中...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : file ? (
            <FileContent filePath={file.path} content={file.content} language={file.language} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
