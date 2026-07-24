import { useEffect, useRef } from 'react';

const getWsUrl = (token) => {
  if (import.meta.env.VITE_WS_URL) {
    const baseUrl = import.meta.env.VITE_WS_URL.replace(/\/$/, '');
    return `${baseUrl}/api/ws/notifications?token=${encodeURIComponent(token)}`;
  }

  // Derive from VITE_API_BASE_URL if provided as absolute URL
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    const wsProto = apiBase.startsWith('https://') ? 'wss:' : 'ws:';
    const origin = apiBase.replace(/^https?:\/\//, '').replace(/\/api\/?$/, '');
    return `${wsProto}//${origin}/api/ws/notifications?token=${encodeURIComponent(token)}`;
  }

  // Default: derive from window.location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = (window.location.port === '5173' || window.location.port === '3000')
    ? ':8000'
    : (window.location.port ? `:${window.location.port}` : '');

  return `${protocol}//${host}${port}/api/ws/notifications?token=${encodeURIComponent(token)}`;
};

export function useWebSocketNotification(onNotificationReceived) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const wsUrl = getWsUrl(token);

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[WebSocket Notification] Connected to:', wsUrl.split('?')[0]);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          if (event.data === 'pong') return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'new_notification' && data.notification) {
              onNotificationReceived(data.notification);
            }
          } catch (err) {
            console.error('[WebSocket Notification] Failed to parse message:', err);
          }
        };

        ws.onerror = (err) => {
          console.warn('[WebSocket Notification] Error:', err);
        };

        ws.onclose = (event) => {
          console.log('[WebSocket Notification] Disconnected, code:', event.code);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          if (isMounted) {
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, 5000);
          }
        };
      } catch (err) {
        console.error('[WebSocket Notification] Connection error:', err);
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [onNotificationReceived]);
}
