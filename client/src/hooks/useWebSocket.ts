import { useEffect, useRef, useCallback, useState } from 'react';
import type { ClientMessage, ServerMessage } from '@ccw/shared';
import { getToken } from '../lib/api';

interface UseWebSocketOptions {
  sessionId?: string;
  onMessage: (msg: ServerMessage) => void;
}

export function useWebSocket({ sessionId, onMessage }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        onMessageRef.current(msg);
      } catch { /* ignore */ }
    };

    return () => { ws.close(); };
  }, []);

  useEffect(() => {
    if (sessionId && wsRef.current?.readyState === WebSocket.OPEN) {
      send({ type: 'resume', sessionId });
    }
  }, [sessionId]);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const sendChat = useCallback((content: string) => {
    send({ type: 'chat', content });
  }, [send]);

  const interrupt = useCallback(() => {
    send({ type: 'interrupt' });
  }, [send]);

  return { connected, sendChat, interrupt };
}
