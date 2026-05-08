import { diffLines, type Change } from 'diff';

interface Props {
  filePath?: string;
  oldContent: string;
  newContent: string;
}

export default function DiffView({ filePath, oldContent, newContent }: Props) {
  const changes: Change[] = diffLines(oldContent, newContent);

  return (
    <div className="font-mono text-xs rounded overflow-hidden">
      {filePath && (
        <div className="px-3 py-1.5 bg-gray-700 text-gray-300 border-b border-gray-600">
          {filePath}
        </div>
      )}
      <div className="overflow-x-auto max-h-[300px]">
        {changes.map((change, i) => {
          const lines = change.value.split('\n').filter((_, j, arr) =>
            j < arr.length - 1 || arr[arr.length - 1] !== ''
          );

          return lines.map((line, j) => {
            let bg = 'bg-white dark:bg-gray-800';
            let prefix = ' ';
            let textColor = 'text-gray-700 dark:text-gray-300';

            if (change.added) {
              bg = 'bg-green-50 dark:bg-green-900/20';
              prefix = '+';
              textColor = 'text-green-800 dark:text-green-300';
            } else if (change.removed) {
              bg = 'bg-red-50 dark:bg-red-900/20';
              prefix = '-';
              textColor = 'text-red-800 dark:text-red-300';
            }

            return (
              <div key={`${i}-${j}`} className={`flex ${bg}`}>
                <span className="w-8 text-right pr-2 text-gray-400 select-none shrink-0 border-r border-gray-200 dark:border-gray-700">
                  {prefix}
                </span>
                <span className={`px-2 ${textColor} whitespace-pre`}>{line}</span>
              </div>
            );
          });
        })}
      </div>
    </div>
  );
}
