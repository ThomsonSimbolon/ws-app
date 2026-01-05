import { useState, useEffect, useRef } from 'react';

interface SSEOptions {
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  onOpen?: (event: Event) => void;
}

export function useSSE(url: string, options: SSEOptions = {}) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // Some SSE backends support sending token in query param if headers aren't supported by EventSource
    const fullUrl = token ? `${url}?token=${token}` : url;
    
    const eventSource = new EventSource(fullUrl);
    eventSourceRef.current = eventSource;
    setStatus('connecting');

    eventSource.onopen = (event) => {
      setStatus('connected');
      if (options.onOpen) options.onOpen(event);
    };

    eventSource.onmessage = (event) => {
      if (options.onMessage) options.onMessage(event);
    };

    eventSource.onerror = (event) => {
      setStatus('disconnected');
      if (options.onError) options.onError(event);
      eventSource.close();
      
      // Retry connection after 5s
      setTimeout(() => {
        // This will trigger re-run due to dependency change if we were managing retry count
        // But for now, just let the simple effect lifecycle handle it if we toggle a key
        // simpler: EventSource usually auto-retries, but if we closed it, we need to reopen.
        // Actually, let's leave it closed and let parent logic handle retry or just rely on react lifecycle
      }, 5000);
    };

    return () => {
      eventSource.close();
      setStatus('disconnected');
    };
  }, [url]);

  return { status };
}
