interface Props {
  input: Record<string, unknown>;
  result?: string;
}

export default function BashOutput({ input, result }: Props) {
  const command = input.command as string || '';

  return (
    <div className="font-mono text-xs">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-gray-200 rounded-t">
        <span className="text-green-400">$</span>
        <span className="text-white">{command}</span>
      </div>
      {result ? (
        <pre className="px-3 py-2 bg-gray-900 text-gray-300 rounded-b overflow-x-auto max-h-[300px] whitespace-pre-wrap break-all">
          {result}
        </pre>
      ) : (
        <div className="px-3 py-2 bg-gray-900 text-gray-500 rounded-b animate-pulse">
          执行中...
        </div>
      )}
    </div>
  );
}
