import { useState, useEffect, useRef } from 'react';

interface SSEOptions {
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  onOpen?: (event: Event) => void;
}

export function useSSE(url: string, options: SSEOptions = {}) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      // Prevent multiple connections
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
         setStatus('disconnected');
         return; // No token, cannot connect
      }
      
      const fullUrl = `${url}?token=${token}`;
      
      const eventSource = new EventSource(fullUrl);
      eventSourceRef.current = eventSource;
      setStatus('connecting');

      eventSource.onopen = (event) => {
        if (!isMounted) {
            eventSource.close();
            return;
        }
        setStatus('connected');
        retryCountRef.current = 0; // Reset retry count on success
        if (options.onOpen) options.onOpen(event);
      };

      eventSource.onmessage = (event) => {
        if (isMounted && options.onMessage) options.onMessage(event);
      };

      eventSource.onerror = (event) => {
        if (!isMounted) return;

        setStatus('disconnected');
        if (options.onError) options.onError(event);
        eventSource.close();
        eventSourceRef.current = null;
        
        // Auto-reconnect logic
        const maxRetries = 5;
        if (retryCountRef.current < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000); // 1s, 2s, 4s... max 30s
            retryCountRef.current++;
            
            console.log(`SSE Disconnected. Reconnecting in ${delay}ms... (Attempt ${retryCountRef.current}/${maxRetries})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
                if (isMounted) connect();
            }, delay);
        } else {
            console.error("SSE Connection failed after max retries.");
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setStatus('disconnected');
    };
  }, [url]); // Intentionally verify 'url' dependency. Using 'options' in dep array would cause loops.

  return { status };
}
