import React from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface JobFiltersProps {
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused' | '';
  type: 'send-text' | 'send-media' | '';
  onStatusChange: (value: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused' | '') => void;
  onTypeChange: (value: 'send-text' | 'send-media' | '') => void;
  onReset: () => void;
}

export default function JobFilters({
  status,
  type,
  onStatusChange,
  onTypeChange,
  onReset,
}: JobFiltersProps) {
  const hasActiveFilters = status || type;

  return (
    <Card padding="md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as typeof status)}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
          >
            <option value="">All Status</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value as typeof type)}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
          >
            <option value="">All Types</option>
            <option value="send-text">Send Text</option>
            <option value="send-media">Send Media</option>
          </select>
        </div>
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset Filters
          </Button>
        </div>
      )}
    </Card>
  );
}

