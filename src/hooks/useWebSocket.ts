import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '../services/api';

const WS_URL = (() => {
  const api = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
  // Convertir http → ws, https → wss
  return api.replace(/^http/, 'ws');
})();

export type WsMessage = {
  id: string;
  channel_id: string;
  tenant_id: string;
  user_id: number;
  user_nombre: string;
  user_rol: string;
  content: string;
  created_at: string;
};

type Status = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useWebSocket(channelId: string | null) {
  const [status, setStatus] = useState<Status>('disconnected');
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const retryDelay = useRef(1000);
  const shouldReconnect = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!channelId) return;
    const token = getAccessToken();
    if (!token) return;

    setStatus('connecting');
    const ws = new WebSocket(`${WS_URL}/api/v1/chat/ws/${channelId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      retryDelay.current = 1000;
    };

    ws.onmessage = (ev) => {
      try {
        const msg: WsMessage = JSON.parse(ev.data);
        setMessages(prev => [...prev, msg]);
      } catch {
        // ignorar mensajes malformados
      }
    };

    ws.onerror = () => setStatus('error');

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;
      if (shouldReconnect.current && channelId) {
        timeoutRef.current = setTimeout(() => {
          retryDelay.current = Math.min(retryDelay.current * 2, 30_000);
          connect();
        }, retryDelay.current);
      }
    };
  }, [channelId]);

  useEffect(() => {
    shouldReconnect.current = true;
    setMessages([]); // limpiar mensajes al cambiar canal
    connect();

    return () => {
      shouldReconnect.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ content }));
    }
  }, []);

  return { status, messages, sendMessage, setMessages };
}
