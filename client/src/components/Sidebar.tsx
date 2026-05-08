import { useState } from 'react';
import FileBrowser from './FileBrowser';
import FilePreview from './FilePreview';

interface Props {
  visible: boolean;
  onToggle: () => void;
}

type Tab = 'files' | 'git';

export default function Sidebar({ visible, onToggle }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  if (!visible) return null;

  return (
    <>
      <div className="w-60 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'files'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            文件
          </button>
          <button
            onClick={() => setActiveTab('git')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'git'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Git
          </button>
          <button
            onClick={onToggle}
            className="px-2 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="收起侧边栏 (Ctrl+B)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {activeTab === 'files' && (
            <FileBrowser visible={true} onFileSelect={setPreviewPath} />
          )}
          {activeTab === 'git' && (
            <div className="p-3 text-xs text-gray-400">Git 面板 — 待实现</div>
          )}
        </div>
      </div>
      <FilePreview path={previewPath} onClose={() => setPreviewPath(null)} />
    </>
  );
}
