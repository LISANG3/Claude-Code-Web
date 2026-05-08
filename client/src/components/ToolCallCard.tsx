import type { ToolInfo } from '@ccw/shared';
import BashOutput from './tools/BashOutput';
import DiffView from './tools/DiffView';
import FileContent from './tools/FileContent';
import FileList from './tools/FileList';

interface Props {
  tool: ToolInfo;
  result?: string;
  expanded: boolean;
  onToggle: () => void;
}

const TOOL_LABELS: Record<string, { icon: string; color: string }> = {
  Bash: { icon: '$', color: 'text-green-600 dark:text-green-400' },
  Read: { icon: '📄', color: 'text-blue-600 dark:text-blue-400' },
  Edit: { icon: '✏️', color: 'text-yellow-600 dark:text-yellow-400' },
  Write: { icon: '📝', color: 'text-purple-600 dark:text-purple-400' },
  Glob: { icon: '🔍', color: 'text-cyan-600 dark:text-cyan-400' },
  Grep: { icon: '🔍', color: 'text-cyan-600 dark:text-cyan-400' },
  Agent: { icon: '🤖', color: 'text-pink-600 dark:text-pink-400' },
  WebFetch: { icon: '🌐', color: 'text-indigo-600 dark:text-indigo-400' },
  WebSearch: { icon: '🔎', color: 'text-indigo-600 dark:text-indigo-400' },
};

function renderToolContent(tool: ToolInfo, result?: string) {
  const { name, input } = tool;

  switch (name) {
    case 'Bash':
      return <BashOutput input={input} result={result} />;

    case 'Edit': {
      const filePath = input.file_path as string;
      const oldStr = input.old_string as string || '';
      const newStr = input.new_string as string || '';
      if (oldStr && newStr) {
        return <DiffView filePath={filePath} oldContent={oldStr} newContent={newStr} />;
      }
      break;
    }

    case 'Write': {
      const filePath = input.file_path as string;
      const content = input.content as string || '';
      if (content) {
        return <FileContent filePath={filePath} content={content} />;
      }
      break;
    }

    case 'Read': {
      if (result) {
        const filePath = input.file_path as string;
        return <FileContent filePath={filePath} content={result} />;
      }
      break;
    }

    case 'Glob':
    case 'Grep': {
      if (result) {
        return <FileList result={result} toolName={name} />;
      }
      break;
    }
  }

  // Fallback: raw JSON
  return (
    <div>
      {Object.keys(input).length > 0 && (
        <div className="px-3 py-2">
          <div className="text-xs text-gray-500 mb-1">输入</div>
          <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto max-h-[200px]">
            {JSON.stringify(input, null, 2)}
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
  );
}

export default function ToolCallCard({ tool, result, expanded, onToggle }: Props) {
  const meta = TOOL_LABELS[tool.name] || { icon: '🔧', color: 'text-gray-600' };

  return (
    <div className="ml-4 mb-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/50">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className={`text-xs font-bold ${meta.color}`}>{meta.icon}</span>
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
          {renderToolContent(tool, result)}
        </div>
      )}
    </div>
  );
}
