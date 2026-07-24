import { useEffect, useRef } from 'react';

export function useWebSocketNotification(onNotificationReceived) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      // Backend FastAPI typically runs on port 8000 or same origin in production proxy
      const port = window.location.port === '5173' || window.location.port === '3000' ? ':8000' : (window.location.port ? `:${window.location.port}` : '');
      const wsUrl = `${protocol}//${host}${port}/api/ws/notifications?token=${encodeURIComponent(token)}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[WebSocket Notification] Connected');
          // Setup keep-alive ping every 30s
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

        ws.onclose = () => {
          console.log('[WebSocket Notification] Disconnected');
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          if (isMounted) {
            // Attempt reconnect in 5 seconds
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
