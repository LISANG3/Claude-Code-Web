import { useState } from 'react';

interface Props {
  thinking: string;
  streaming?: boolean;
}

export default function ThinkingBlock({ thinking, streaming }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!thinking && !streaming) return null;

  return (
    <div className="ml-4 mb-2 border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden bg-purple-50 dark:bg-purple-900/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
      >
        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
          思考过程
        </span>
        {streaming && (
          <span className="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
        )}
        <svg
          className={`w-3 h-3 text-purple-400 transition-transform ml-auto ${expanded ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-purple-200 dark:border-purple-800 px-3 py-2">
          <pre className="text-xs text-purple-800 dark:text-purple-200 whitespace-pre-wrap font-mono leading-relaxed max-h-[400px] overflow-y-auto">
            {thinking}
            {streaming && <span className="inline-block w-1.5 h-3 bg-purple-400 animate-pulse ml-0.5" />}
          </pre>
        </div>
      )}
    </div>
  );
}
