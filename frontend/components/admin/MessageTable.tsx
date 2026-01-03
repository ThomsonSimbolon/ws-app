import React from 'react';
import Link from 'next/link';
import { Message } from '@/lib/adminService';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface MessageTableProps {
  messages: Message[];
  isLoading?: boolean;
  onViewDetail?: (message: Message) => void;
}

export default function MessageTable({ messages, isLoading = false, onViewDetail }: MessageTableProps) {
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleString();
  };

  const truncateContent = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'sent':
        return 'info';
      case 'delivered':
      case 'read':
        return 'success';
      case 'failed':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'audio':
        return '🎵';
      case 'document':
        return '📄';
      default:
        return '💬';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-elevated rounded-lg" />
        ))}
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">No messages found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-divider">
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Timestamp</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">From/To</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Direction</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Content</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">User</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Device</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((message) => (
            <tr
              key={message.id}
              className="border-b border-divider hover:bg-elevated transition-colors"
            >
              <td className="py-3 px-4 text-text-secondary text-sm">
                {formatRelativeTime(message.timestamp)}
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="text-text-primary text-sm font-medium">
                    {message.direction === 'incoming' ? message.fromNumber : message.toNumber}
                  </p>
                  <p className="text-xs text-text-muted">
                    {message.direction === 'incoming' ? 'From' : 'To'}
                  </p>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {message.direction === 'incoming' ? '⬇️' : '⬆️'}
                  </span>
                  <span className="text-text-secondary text-sm capitalize">
                    {message.direction}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span>{getMessageTypeIcon(message.messageType)}</span>
                  <span className="text-text-secondary text-sm">
                    {truncateContent(message.content)}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge variant={getStatusBadgeVariant(message.status)}>
                  {message.status}
                </Badge>
              </td>
              <td className="py-3 px-4">
                {message.user ? (
                  <Link
                    href={`/admin/users/${message.user.id}`}
                    className="text-primary hover:text-primary-hover font-medium transition-colors text-sm"
                  >
                    {message.user.fullName || message.user.username}
                  </Link>
                ) : (
                  <span className="text-text-muted">-</span>
                )}
              </td>
              <td className="py-3 px-4">
                {message.session ? (
                  <div>
                    <p className="text-text-primary text-sm">{message.session.deviceName}</p>
                    <p className="text-xs text-text-muted">{message.session.deviceId}</p>
                  </div>
                ) : (
                  <span className="text-text-muted">-</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  {message.user && (
                    <Link href={`/admin/users/${message.user.id}`}>
                      <Button variant="ghost" size="sm">
                        View User
                      </Button>
                    </Link>
                  )}
                  {onViewDetail && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetail(message)}
                    >
                      Details
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

