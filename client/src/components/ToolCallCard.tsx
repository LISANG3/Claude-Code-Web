import type { ToolInfo } from '@ccw/shared';

interface Props {
  tool: ToolInfo;
  result?: string;
  expanded: boolean;
  onToggle: () => void;
}

const TOOL_LABELS: Record<string, string> = {
  Bash: '$',
  Read: '📄',
  Edit: '✏️',
  Write: '📝',
  Glob: '🔍',
  Grep: '🔍',
  Agent: '🤖',
};

export default function ToolCallCard({ tool, result, expanded, onToggle }: Props) {
  const label = TOOL_LABELS[tool.name] || '🔧';

  return (
    <div className="ml-4 mb-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/50">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className="text-xs">{label}</span>
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{tool.name}</span>
        <span className="text-xs text-gray-500 dark:text-gray-500 truncate flex-1">{tool.summary}</span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {tool.input && Object.keys(tool.input).length > 0 && (
            <div className="px-3 py-2">
              <div className="text-xs text-gray-500 mb-1">输入</div>
              <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto max-h-[200px]">
                {JSON.stringify(tool.input, null, 2)}
              </pre>
            </div>
          )}
          {result ? (
            <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 mb-1">输出</div>
              <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto max-h-[300px]">
                {result}
              </pre>
            </div>
          ) : (
            <div className="px-3 py-2 text-xs text-gray-400 animate-pulse">执行中...</div>
          )}
        </div>
      )}
    </div>
  );
}
