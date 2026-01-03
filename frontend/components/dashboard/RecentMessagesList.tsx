import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Message } from '@/lib/adminService';

interface RecentMessagesListProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
}

const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  sent: 'info',
  delivered: 'success',
  read: 'success',
  failed: 'danger',
  pending: 'warning',
};

const directionIcons = {
  incoming: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  outgoing: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ),
};

export default function RecentMessagesList({ messages, isLoading = false, className = '' }: RecentMessagesListProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Messages</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-elevated rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <Card className={className}>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Messages</h3>
        <p className="text-text-muted text-sm">No messages found</p>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Recent Messages</h3>
        <a
          href="/admin/messages"
          className="text-sm text-primary hover:text-primary-hover transition-colors"
        >
          View All
        </a>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {messages.slice(0, 20).map((message) => (
          <div
            key={message.id}
            className="flex items-start gap-3 p-3 bg-elevated rounded-lg hover:bg-secondary transition-colors"
          >
            {/* Direction Icon */}
            <div
              className={`flex-shrink-0 mt-1 ${
                message.direction === 'incoming' ? 'text-info' : 'text-primary'
              }`}
            >
              {directionIcons[message.direction]}
            </div>
            
            {/* Message Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">
                    {message.direction === 'incoming' ? message.fromNumber : message.toNumber}
                  </p>
                  {message.user && (
                    <span className="text-xs text-text-muted">
                      • {message.user.fullName || message.user.username}
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-muted">{formatDate(message.timestamp)}</span>
              </div>
              
              <p className="text-sm text-text-secondary line-clamp-2 mb-2">
                {message.content || `[${message.messageType}]`}
              </p>
              
              <div className="flex items-center gap-2">
                <Badge variant={statusColors[message.status] || 'warning'}>
                  {message.status}
                </Badge>
                {message.session && (
                  <span className="text-xs text-text-muted">
                    {message.session.deviceName}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

