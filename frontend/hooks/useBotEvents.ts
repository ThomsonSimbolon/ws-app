import { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useToast } from '@/context/ToastContext';
import { fetchStats, fetchHandoffs, fetchRules } from '@/store/slices/botSlice';

export const useBotEvents = () => {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    const connect = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        // No token, likely logged out.
        const statusEvent = new CustomEvent('bot-sse-status', { detail: 'disconnected' });
        window.dispatchEvent(statusEvent);
        return;
      }

      // Cleanup existing
      if (eventSource) {
        eventSource.close();
      }

      // Normalize API URL to avoid double /api/api
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005';
      // Remove trailing slash if present
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      // Determine correct endpoint url
      // If baseUrl ends with /api, use /events, otherwise /api/events
      const eventEndpoint = cleanBaseUrl.endsWith('/api') ? '/events' : '/api/events';
      
      const sseUrl = `${cleanBaseUrl}${eventEndpoint}?token=${token}`;

      console.log(`[BotSSE] Connecting... (Attempt ${retryCount + 1}) to ${sseUrl}`);
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        console.log('[BotSSE] Connected');
        retryCount = 0; // Reset retries on success
        const statusEvent = new CustomEvent('bot-sse-status', { detail: 'connected' });
        window.dispatchEvent(statusEvent);
      };

      eventSource.addEventListener('bot_handoff_started', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          addToast(`👋 Handoff started for ${data.phoneNumber || 'User'}`, 'info');
          if (data.deviceId) {
            dispatch(fetchHandoffs(data.deviceId)); 
            dispatch(fetchStats(data.deviceId));
          }
        } catch (e) { console.error('SSE Parse Error', e); }
      });

      eventSource.addEventListener('bot_resumed', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          addToast(`🤖 Bot resumed for ${data.phoneNumber || 'User'}`, 'success');
          if (data.deviceId) {
             dispatch(fetchHandoffs(data.deviceId)); 
             dispatch(fetchStats(data.deviceId));
          }
        } catch (e) { console.error('SSE Parse Error', e); }
      });

      eventSource.addEventListener('rate_limited', (event: MessageEvent) => {
         try {
           const data = JSON.parse(event.data);
           addToast(`⚠️ Rate limited on device ${data.deviceId}`, 'warning');
         } catch (e) { console.error('SSE Parse Error', e); }
      });

      eventSource.onerror = (error) => {
        console.warn('[BotSSE] Connection Error', error);
        eventSource?.close();
        
        const statusEvent = new CustomEvent('bot-sse-status', { detail: 'disconnected' });
        window.dispatchEvent(statusEvent);

        // Retry logic
        if (retryCount < MAX_RETRIES) {
          const backoffTime = Math.min(1000 * (2 ** retryCount), 30000); // 1s, 2s, 4s... max 30s
          retryCount++;
          console.log(`[BotSSE] Retrying in ${backoffTime}ms...`);
          retryTimeout = setTimeout(connect, backoffTime);
        } else {
          console.error('[BotSSE] Max retries reached. Giving up.');
        }
      };
    };

    connect();

    // Listen for a custom 'retry-sse' event from the UI banner
    const handleManualRetry = () => {
      retryCount = 0;
      connect();
    };
    window.addEventListener('retry-bot-sse', handleManualRetry);

    return () => {
      if (eventSource) eventSource.close();
      if (retryTimeout) clearTimeout(retryTimeout);
      window.removeEventListener('retry-bot-sse', handleManualRetry);
    };
  }, [dispatch, addToast]);
};
