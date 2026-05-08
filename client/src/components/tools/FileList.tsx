interface Props {
  result: string;
  toolName: string;
}

export default function FileList({ result, toolName }: Props) {
  const lines = result.split('\n').filter(l => l.trim());

  return (
    <div className="text-xs">
      <div className="px-3 py-1 bg-gray-700 text-gray-400 text-xs">
        {toolName === 'Glob' ? '文件匹配' : '搜索结果'} ({lines.length})
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {lines.map((line, i) => {
          const parts = line.split(':');
          const isGrep = toolName === 'Grep' && parts.length >= 3;

          return (
            <div key={i} className="flex items-start gap-2 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 select-none shrink-0 w-6 text-right">{i + 1}</span>
              {isGrep ? (
                <div className="flex-1 min-w-0">
                  <span className="text-blue-600 dark:text-blue-400">{parts[0]}</span>
                  <span className="text-gray-400">:{parts[1]}</span>
                  <span className="text-gray-700 dark:text-gray-300 ml-2">{parts.slice(2).join(':')}</span>
                </div>
              ) : (
                <span className="text-gray-700 dark:text-gray-300 truncate">{line}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
