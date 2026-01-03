'use client';

import React from 'react';
import { Message } from '@/lib/adminService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface MessageDetailModalProps {
  isOpen: boolean;
  message: Message | null;
  onClose: () => void;
}

export default function MessageDetailModal({
  isOpen,
  message,
  onClose,
}: MessageDetailModalProps) {
  if (!isOpen || !message) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative z-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto" padding="lg">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-text-primary">Message Details</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          {/* Message Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-muted">Message ID</label>
              <p className="text-text-primary mt-1">{message.messageId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Type</label>
              <p className="text-text-primary mt-1 capitalize">{message.messageType}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Direction</label>
              <div className="mt-1">
                <Badge variant={message.direction === 'incoming' ? 'info' : 'success'}>
                  {message.direction}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Status</label>
              <div className="mt-1">
                <Badge variant={getStatusBadgeVariant(message.status)}>
                  {message.status}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">From Number</label>
              <p className="text-text-primary mt-1">{message.fromNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">To Number</label>
              <p className="text-text-primary mt-1">{message.toNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Timestamp</label>
              <p className="text-text-primary mt-1">{formatDate(message.timestamp)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Created At</label>
              <p className="text-text-primary mt-1">{formatDate(message.createdAt)}</p>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="text-sm font-medium text-text-muted">Content</label>
            <div className="mt-2 p-4 bg-elevated rounded-lg">
              <p className="text-text-primary whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>

          {/* User Info */}
          {message.user && (
            <div>
              <label className="text-sm font-medium text-text-muted">User</label>
              <div className="mt-2 p-4 bg-elevated rounded-lg">
                <p className="text-text-primary">
                  {message.user.fullName || message.user.username} ({message.user.email})
                </p>
              </div>
            </div>
          )}

          {/* Session Info */}
          {message.session && (
            <div>
              <label className="text-sm font-medium text-text-muted">Device</label>
              <div className="mt-2 p-4 bg-elevated rounded-lg">
                <p className="text-text-primary">{message.session.deviceName}</p>
                <p className="text-sm text-text-muted mt-1">
                  {message.session.deviceId} {message.session.phoneNumber && `• ${message.session.phoneNumber}`}
                </p>
              </div>
            </div>
          )}

          {/* Metadata */}
          {message.metadata && (
            <div>
              <label className="text-sm font-medium text-text-muted">Metadata</label>
              <div className="mt-2 p-4 bg-elevated rounded-lg">
                <pre className="text-xs text-text-primary overflow-x-auto">
                  {JSON.stringify(message.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-divider">
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

