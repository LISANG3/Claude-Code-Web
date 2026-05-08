import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import type { ServerMessage, ToolInfo, AssistantMessage } from '@ccw/shared';
import MessageBubble from './MessageBubble';
import ToolCallCard from './ToolCallCard';
import StatsPanel from './StatsPanel';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallState[];
  assistantMessage?: AssistantMessage;
}

interface ToolCallState {
  tool: ToolInfo;
  result?: string;
  expanded: boolean;
}

export default function ChatView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentTools, setCurrentTools] = useState<ToolCallState[]>([]);
  const [stats, setStats] = useState<{ cost: number; tokens: number; duration: number } | null>(null);
  const [model, setModel] = useState('');
  const [showStats, setShowStats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, currentText, scrollToBottom]);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'session_info':
        setModel(msg.model);
        break;
      case 'text_delta':
        setCurrentText(prev => prev + msg.text);
        break;
      case 'tool_start':
        setCurrentTools(prev => [...prev, { tool: msg.tool, expanded: false }]);
        break;
      case 'tool_delta':
        setCurrentTools(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              tool: { ...updated[updated.length - 1].tool, input: { _partial: msg.input } },
            };
          }
          return updated;
        });
        break;
      case 'tool_result':
        setCurrentTools(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = { ...updated[updated.length - 1], result: msg.result };
          }
          return updated;
        });
        break;
      case 'message_done':
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: currentText || msg.message.content.filter(b => b.type === 'text').map(b => b.text || '').join(''),
          toolCalls: currentTools.length > 0 ? currentTools : undefined,
          assistantMessage: msg.message,
        }]);
        setCurrentText('');
        setCurrentTools([]);
        setIsGenerating(false);
        break;
      case 'stats':
        setStats({ cost: msg.cost, tokens: msg.tokens, duration: msg.duration });
        break;
      case 'error':
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${msg.message}` }]);
        setIsGenerating(false);
        break;
      case 'ready':
        break;
    }
  }, [currentText, currentTools]);

  const { connected, sendChat, interrupt } = useWebSocket({
    sessionId,
    onMessage: handleServerMessage,
  });

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setIsGenerating(true);
    setCurrentText('');
    setCurrentTools([]);
    sendChat(trimmed);
    if (inputRef.current) inputRef.current.style.height = 'auto';
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  function toggleTool(index: number) {
    setCurrentTools(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], expanded: !updated[index].expanded };
      return updated;
    });
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {model && <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs text-gray-600 dark:text-gray-400">{model}</span>}
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <button
          onClick={() => setShowStats(!showStats)}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {stats ? `$${stats.cost.toFixed(4)}` : '统计'}
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i}>
            <MessageBubble role={msg.role} content={msg.content} />
            {msg.toolCalls?.map((tc, j) => (
              <ToolCallCard
                key={j}
                tool={tc.tool}
                result={tc.result}
                expanded={tc.expanded}
                onToggle={() => {
                  setMessages(prev => {
                    const updated = [...prev];
                    const m = { ...updated[i] };
                    const tools = [...(m.toolCalls || [])];
                    tools[j] = { ...tools[j], expanded: !tools[j].expanded };
                    m.toolCalls = tools;
                    updated[i] = m;
                    return updated;
                  });
                }}
              />
            ))}
          </div>
        ))}

        {isGenerating && (
          <div>
            {currentTools.map((tc, j) => (
              <ToolCallCard key={j} tool={tc.tool} result={tc.result} expanded={tc.expanded} onToggle={() => toggleTool(j)} />
            ))}
            {currentText && <MessageBubble role="assistant" content={currentText} streaming />}
            {!currentText && currentTools.length === 0 && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <div className="animate-pulse">思考中...</div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Stats */}
      {showStats && stats && <StatsPanel stats={stats} onClose={() => setShowStats(false)} />}

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800 shrink-0">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Shift+Enter 换行)"
            rows={1}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-[200px]"
            disabled={!connected}
          />
          {isGenerating ? (
            <button onClick={interrupt} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">
              停止
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!connected || !input.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
            >
              发送
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
