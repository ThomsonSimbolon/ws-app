'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  ScheduledMessage, 
  getAllScheduledMessages, 
  cancelScheduledMessage,
  ScheduledMessagesFilter 
} from '@/lib/userService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

// Status filter options
const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

// Human-readable error messages
const ERROR_MESSAGES: Record<string, string> = {
  'Device disconnected': 'Device was disconnected. Reconnect and reschedule.',
  'Device session not found': 'Device session expired. Please reconnect.',
  'Phone number invalid': 'Invalid phone number format.',
  'Expired during server downtime': 'Message expired while server was offline.',
  'Network error': 'Network issue. Please reschedule.',
};

function getReadableError(error?: string): string {
  if (!error) return '';
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return error;
}

interface ScheduledMessageManagerProps {
  onReschedule?: (message: ScheduledMessage) => void;
}

export default function ScheduledMessageManager({ 
  onReschedule 
}: ScheduledMessageManagerProps) {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  
  // Pagination
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Countdown timer for pending messages
  const [, setTick] = useState(0);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setOffset(0); // Reset pagination on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ScheduledMessagesFilter = {
        limit,
        offset,
      };
      if (statusFilter) {
        filters.status = statusFilter as ScheduledMessagesFilter['status'];
      }
      if (debouncedSearch) {
        filters.search = debouncedSearch;
      }

      const result = await getAllScheduledMessages(filters);
      setMessages(result.messages);
      setTotal(result.total);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch scheduled messages';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, offset, limit]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Update countdown every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle Cancel
  const handleCancel = async (messageId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled message?')) return;
    
    setCancellingId(messageId);
    try {
      await cancelScheduledMessage(messageId);
      fetchMessages();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel message';
      alert(errorMessage);
    } finally {
      setCancellingId(null);
    }
  };

  // Handle Reschedule
  const handleReschedule = (message: ScheduledMessage) => {
    if (onReschedule) {
      onReschedule(message);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-warning-soft text-warning border-warning',
      sent: 'bg-success-soft text-success border-success',
      failed: 'bg-danger-soft text-danger border-danger',
      cancelled: 'bg-elevated text-text-secondary border-border',
    };
    const style = styles[status] || styles.cancelled;
    
    const icons: Record<string, React.ReactNode> = {
      pending: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      sent: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      failed: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      cancelled: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${style}`}>
        {icons[status]} {status}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCountdown = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diff = target - now;

    if (diff <= 0) return 'Due now';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Stats summary
  const stats = {
    pending: messages.filter(m => m.status === 'pending').length,
    sent: messages.filter(m => m.status === 'sent').length,
    failed: messages.filter(m => m.status === 'failed').length,
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Scheduled Messages
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Manage all your scheduled messages across devices
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchMessages} disabled={loading}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-warning-soft/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <div className="text-xs text-text-secondary">Pending</div>
          </div>
          <div className="bg-success-soft/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-success">{stats.sent}</div>
            <div className="text-xs text-text-secondary">Sent</div>
          </div>
          <div className="bg-danger-soft/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-danger">{stats.failed}</div>
            <div className="text-xs text-text-secondary">Failed</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by phone or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-9 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-danger-soft text-danger rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && messages.length === 0 && !error && (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <svg className="w-12 h-12 mx-auto text-text-muted opacity-50 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-text-secondary">
              {statusFilter || debouncedSearch 
                ? 'No scheduled messages match your filters' 
                : 'No scheduled messages found'}
            </p>
          </div>
        )}

        {/* Messages Table */}
        {messages.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-elevated text-text-secondary">
                <tr>
                  <th className="p-3 rounded-tl-lg">Schedule Time</th>
                  <th className="p-3">Device</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">Message</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-elevated/50 transition-colors">
                    {/* Schedule Time */}
                    <td className="p-3 align-top whitespace-nowrap">
                      <div>{formatDate(msg.scheduleTime)}</div>
                      {msg.status === 'pending' && (
                        <div className="text-xs text-primary mt-1 font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          in {getCountdown(msg.scheduleTime)}
                        </div>
                      )}
                    </td>

                    {/* Device */}
                    <td className="p-3 align-top whitespace-nowrap">
                      <span className="text-xs bg-elevated px-2 py-1 rounded">
                        {msg.deviceName || msg.deviceId?.slice(0, 12) || 'Unknown'}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="p-3 align-top whitespace-nowrap font-mono text-xs">
                      {msg.phoneNumber}
                    </td>

                    {/* Message */}
                    <td className="p-3 align-top max-w-xs">
                      <div className="truncate" title={msg.message}>
                        {msg.message.length > 50 ? msg.message.slice(0, 50) + '...' : msg.message}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3 align-top">
                      <div className="flex flex-col gap-1 items-start">
                        {getStatusBadge(msg.status)}
                        {msg.error && (
                          <span 
                            className="text-xs text-danger max-w-[150px] truncate cursor-help" 
                            title={msg.error}
                          >
                            {getReadableError(msg.error)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3 align-top">
                      <div className="flex gap-1">
                        {msg.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-danger hover:bg-danger-soft h-8 px-2"
                            onClick={() => handleCancel(msg.id)}
                            disabled={cancellingId === msg.id}
                          >
                            {cancellingId === msg.id ? '...' : 'Cancel'}
                          </Button>
                        )}
                        {msg.status === 'failed' && onReschedule && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary hover:bg-primary-soft h-8 px-2"
                            onClick={() => handleReschedule(msg)}
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Reschedule
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-text-secondary">
                      Loading scheduled messages...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-sm text-text-secondary">
              Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
              >
                ← Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
