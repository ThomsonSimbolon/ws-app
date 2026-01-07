'use client';

import React, { useState } from 'react';
import { BotLog, fetchLogs } from '@/store/slices/botSlice';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import Button from '@/components/ui/Button';

interface BotLogsTableProps {
  logs: BotLog[];
  deviceId: string;
  isLoading: boolean;
}

export default function BotLogsTable({ logs, deviceId, isLoading }: BotLogsTableProps) {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    dispatch(fetchLogs({ deviceId, page: nextPage }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  if (isLoading && logs.length === 0) {
    return <div className="p-8 text-center text-text-muted">Loading logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted border border-border rounded-lg bg-surface-ground">
        No logs available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-elevated text-text-secondary font-medium">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Sender</th>
              <th className="p-3">Action</th>
              <th className="p-3">Incoming</th>
              <th className="p-3">Response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-surface-ground">
                <td className="p-3 whitespace-nowrap text-text-muted">{formatDate(log.createdAt)}</td>
                <td className="p-3 font-mono text-xs">{log.senderJid.split('@')[0]}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded textxs font-medium uppercase ${
                    log.actionType === 'auto_reply' ? 'bg-blue-50 text-blue-700' :
                    log.actionType === 'handoff' ? 'bg-orange-50 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {log.actionType}
                  </span>
                </td>
                <td className="p-3 max-w-[200px] truncate text-text-secondary" title={log.incomingMessage || ''}>
                  {log.incomingMessage || '-'}
                </td>
                <td className="p-3 max-w-[200px] truncate text-text-secondary" title={log.responseMessage || ''}>
                  {log.responseMessage || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-center">
        <Button variant="ghost" onClick={loadMore} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load More Logs'}
        </Button>
      </div>
    </div>
  );
}
