import { useState, useRef, useEffect } from 'react';

interface Props {
  visible: boolean;
  onSelect: (command: string) => void;
  onClose: () => void;
}

const COMMANDS = [
  { name: '/help', desc: '显示帮助信息' },
  { name: '/clear', desc: '清空当前对话' },
  { name: '/model', desc: '查看/切换模型' },
  { name: '/stats', desc: '显示会话统计' },
  { name: '/terminal', desc: '切换终端视图' },
  { name: '/compact', desc: '压缩对话历史' },
];

export default function SlashCommand({ visible, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible]);

  const filtered = COMMANDS.filter(cmd =>
    cmd.name.includes(query) || cmd.desc.includes(query)
  );

  if (!visible) return null;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selected]) {
        onSelect(filtered[selected].name);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
          onKeyDown={handleKeyDown}
          placeholder="搜索命令..."
          className="w-full text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.map((cmd, i) => (
          <button
            key={cmd.name}
            onClick={() => onSelect(cmd.name)}
            className={`w-full px-3 py-2 text-left flex items-center gap-3 text-sm transition-colors ${
              i === selected
                ? 'bg-blue-50 dark:bg-blue-900/30'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <span className="font-mono text-blue-600 dark:text-blue-400">{cmd.name}</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs">{cmd.desc}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-400">无匹配命令</div>
        )}
      </div>
    </div>
  );
}
