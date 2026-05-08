import { useRef, useEffect, useState } from 'react';

interface Props {
  events: string[];
  visible: boolean;
  onClose: () => void;
}

export default function TerminalView({ events, visible, onClose }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (autoScroll) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, autoScroll]);

  if (!visible) return null;

  const filtered = filter
    ? events.filter(e => e.includes(filter))
    : events;

  return (
    <div className="border-t border-gray-300 dark:border-gray-600 bg-gray-900 text-gray-100 flex flex-col" style={{ height: '35vh' }}>
      {/* Header */}
      <div className="px-3 py-1.5 bg-gray-800 border-b border-gray-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-green-400">$</span>
          <span className="text-xs text-gray-400">Terminal · {filtered.length} events</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filter..."
            className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-gray-500 w-32"
          />
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-1.5 py-0.5 rounded ${autoScroll ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}
          >
            {autoScroll ? 'auto' : 'manual'}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed">
        {filtered.map((event, filteredIdx) => {
          const originalIdx = events.indexOf(event);
          let parsed: any;
          try { parsed = JSON.parse(event); } catch { parsed = null; }

          const type = parsed?.type || 'unknown';
          const subtype = parsed?.subtype || '';
          const color = getEventColor(type, subtype);

          return (
            <div key={`${originalIdx}-${filteredIdx}`} className="flex gap-2 py-0.5 hover:bg-gray-800/50">
              <span className="text-gray-600 select-none shrink-0 w-12 text-right">{originalIdx}</span>
              <span className={`shrink-0 ${color}`}>{type}{subtype ? `/${subtype}` : ''}</span>
              <span className="text-gray-400 truncate">
                {formatEventSummary(parsed)}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function getEventColor(type: string, subtype: string): string {
  if (type === 'stream_event') return 'text-cyan-400';
  if (type === 'assistant') return 'text-blue-400';
  if (type === 'result') return 'text-green-400';
  if (type === 'system') return 'text-yellow-400';
  if (type === 'user') return 'text-gray-400';
  if (type === 'error') return 'text-red-400';
  return 'text-gray-300';
}

function formatEventSummary(event: any): string {
  if (!event) return '';
  if (event.type === 'stream_event') {
    const e = event.event;
    if (e?.type === 'content_block_delta') {
      const d = e.delta;
      if (d?.type === 'text_delta') return `text: "${d.text?.slice(0, 60)}${d.text?.length > 60 ? '...' : ''}"`;
      if (d?.type === 'thinking_delta') return `thinking: "${d.thinking?.slice(0, 60)}..."`;
      if (d?.type === 'input_json_delta') return `json: ${d.partial_json?.slice(0, 60)}...`;
    }
    if (e?.type === 'content_block_start') {
      return `block: ${e.content_block?.type || 'unknown'}`;
    }
    if (e?.type === 'message_start') return 'message start';
    if (e?.type === 'message_stop') return 'message stop';
    return e?.type || 'unknown';
  }
  if (event.type === 'assistant') {
    const blocks = event.message?.content || [];
    return blocks.map((b: any) => b.type).join(', ');
  }
  if (event.type === 'result') {
    return `${event.subtype || 'ok'} · $${(event.total_cost_usd || 0).toFixed(4)} · ${event.duration_ms || 0}ms`;
  }
  if (event.type === 'system') {
    return event.subtype || '';
  }
  return '';
}
