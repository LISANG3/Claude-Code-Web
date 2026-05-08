interface Props {
  filePath?: string;
  content: string;
  language?: string;
}

export default function FileContent({ filePath, content, language }: Props) {
  const lines = content.split('\n');

  return (
    <div className="font-mono text-xs rounded overflow-hidden">
      {filePath && (
        <div className="px-3 py-1.5 bg-gray-700 text-gray-300 border-b border-gray-600 flex items-center justify-between">
          <span>{filePath}</span>
          {language && <span className="text-gray-500">{language}</span>}
        </div>
      )}
      <div className="overflow-x-auto max-h-[400px] bg-gray-900">
        {lines.map((line, i) => (
          <div key={i} className="flex hover:bg-gray-800/50">
            <span className="w-10 text-right pr-3 text-gray-600 select-none shrink-0 border-r border-gray-800">
              {i + 1}
            </span>
            <span className="px-3 text-gray-300 whitespace-pre">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
