import React, { useEffect, useState } from 'react';
import { ScheduledMessage, getScheduledMessages, cancelScheduledMessage } from '@/lib/userService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface ScheduledMessageHistoryProps {
  deviceId: string;
  refreshTrigger?: number; // Prop to trigger refresh from parent
}

export default function ScheduledMessageHistory({ 
  deviceId, 
  refreshTrigger = 0 
}: ScheduledMessageHistoryProps) {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!deviceId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await getScheduledMessages(deviceId);
      setMessages(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [deviceId, refreshTrigger]);

  // Handle Cancel
  const handleCancel = async (messageId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled message?')) return;
    
    setCancellingId(messageId);
    try {
      await cancelScheduledMessage(deviceId, messageId);
      // Refresh list
      fetchHistory();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel message');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-warning-soft text-warning border-warning',
      sent: 'bg-success-soft text-success border-success',
      failed: 'bg-danger-soft text-danger border-danger',
      cancelled: 'bg-elevated text-text-secondary border-border',
    };
    const style = styles[status as keyof typeof styles] || styles.cancelled;
    
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${style} capitalize`}>
        {status}
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

  if (!deviceId) {
    return (
      <div className="text-center py-8 text-text-secondary">
        Please select a device to view history
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-text-primary">Schedule History</h3>
        <Button variant="ghost" size="sm" onClick={fetchHistory} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error ? (
        <div className="p-4 bg-danger-soft text-danger rounded-lg text-sm">
          {error}
        </div>
      ) : messages.length === 0 && !loading ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <p className="text-text-secondary">No scheduled messages found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-elevated text-text-secondary">
              <tr>
                <th className="p-3 rounded-tl-lg">Time</th>
                <th className="p-3">Target</th>
                <th className="p-3">Message</th>
                <th className="p-3">Status</th>
                <th className="p-3 rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {messages.map((msg) => (
                <tr key={msg.id} className="hover:bg-elevated/50 transition-colors">
                  <td className="p-3 align-top whitespace-nowrap">
                    <div>{formatDate(msg.scheduleTime)}</div>
                    {msg.status === 'pending' && (
                      <div className="text-xs text-primary mt-1 font-medium">
                        in {getCountdown(msg.scheduleTime)}
                      </div>
                    )}
                  </td>
                  <td className="p-3 align-top whitespace-nowrap">
                    {msg.phoneNumber}
                  </td>
                  <td className="p-3 align-top max-w-xs truncate" title={msg.message}>
                    {msg.message}
                  </td>
                  <td className="p-3 align-top">
                    <div className="flex flex-col gap-1 items-start">
                      {getStatusBadge(msg.status)}
                      {msg.error && (
                        <span className="text-xs text-danger max-w-[150px] truncate" title={msg.error}>
                          {msg.error}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 align-top">
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
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-text-secondary">
                    Loading history...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
