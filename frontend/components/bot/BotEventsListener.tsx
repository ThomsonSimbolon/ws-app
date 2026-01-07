'use client';

import React from 'react';
import { useBotEvents } from '@/hooks/useBotEvents';

export default function BotEventsListener() {
  useBotEvents();
  const [status, setStatus] = React.useState<'connected' | 'disconnected'>('connected'); // Optimistic default

  React.useEffect(() => {
    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent;
      setStatus(customEvent.detail);
    };

    window.addEventListener('bot-sse-status', handleStatus);
    return () => window.removeEventListener('bot-sse-status', handleStatus);
  }, []);

  if (status === 'disconnected') {
    return (
      <div className="bg-warning text-warning-contrast text-xs text-center py-1 px-4 relative z-50 flex justify-center items-center gap-2">
        <span>⚠️ Real-time updates disconnected. Automatic checks will continue in background.</span>
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('retry-bot-sse'))}
          className="underline font-bold hover:text-white"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return null;
}
