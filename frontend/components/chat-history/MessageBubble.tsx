import React, { useState } from 'react';
import { ChatMessage, sendMessage } from '@/lib/userService';
import Button from '@/components/ui/Button';

interface MessageBubbleProps {
  message: ChatMessage;
  deviceId: string;
  onRetrySuccess?: () => void;
}

export default function MessageBubble({ message, deviceId, onRetrySuccess }: MessageBubbleProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  // Status Icons
  const getStatusIcon = (status?: string) => {
    if (!status) return null; // Pending or unknown
    
    switch (status) {
      case 'read':
        return (
          <span title="Read" className="text-info">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L7 17l-5-5" />
              <path d="M22 10l-7.5 7.5L13 16" />
            </svg>
          </span>
        );
      case 'delivered':
        return (
          <span title="Delivered" className="text-text-secondary">
             <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L7 17l-5-5" />
              <path d="M22 10l-7.5 7.5L13 16" />
            </svg>
          </span>
        );
      case 'sent':
        return (
          <span title="Sent" className="text-text-secondary">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
        );
      case 'failed':
        return (
          <span title="Failed" className="text-danger cursor-help">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </span>
        );
      default:
        return (
           <span title="Pending" className="text-text-muted">
             <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <circle cx="12" cy="12" r="10"></circle>
               <polyline points="12 6 12 12 16 14"></polyline>
             </svg>
           </span>
        );
    }
  };

  const handleRetry = async () => {
    if (!deviceId || isRetrying) return;
    
    setIsRetrying(true);
    try {
      // Assuming 'to' in message is the phone number/JID
      // Clean JID to phone number if needed, but sendMessage usually handles JID or Phone
      // NOTE: Simple retry for text messages only for now
      await sendMessage(deviceId, {
        phone: message.to,
        message: message.message
      });
      if (onRetrySuccess) onRetrySuccess();
    } catch (error) {
      console.error('Retry failed', error);
      // Ideally show toast here
    } finally {
      setIsRetrying(false);
    }
  };

  const isOutgoing = message.direction === 'outgoing';

  return (
    <div className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} mb-3`}>
      <div
        className={`max-w-[75%] rounded-lg p-3 relative group ${
          isOutgoing
            ? 'bg-primary/10 text-text-primary rounded-tr-none'
            : 'bg-elevated text-text-primary rounded-tl-none'
        } ${message.status === 'failed' ? 'border border-danger/50 bg-danger-soft/10' : ''}`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
        
        <div className={`flex items-center gap-1.5 mt-1 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-text-muted">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOutgoing && (
             <div className="flex items-center">
               {getStatusIcon(message.status)}
             </div>
          )}
        </div>

        {/* Retry Action for Failed Messages */}
        {isOutgoing && message.status === 'failed' && (
          <div className="mt-2 pt-2 border-t border-danger/10 flex justify-end">
             <Button 
               variant="ghost" 
               size="sm" 
               className="text-xs text-danger hover:bg-danger-soft h-6 px-2"
               onClick={handleRetry}
               disabled={isRetrying}
             >
               {isRetrying ? 'Retrying...' : 'Retry Send'}
             </Button>
          </div>
        )}
      </div>
      {message.status === 'failed' && (
        <span className="text-xs text-danger mt-1 px-1">Message delivery failed</span>
      )}
    </div>
  );
}
