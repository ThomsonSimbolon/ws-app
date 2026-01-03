import React from 'react';
import Card from '@/components/ui/Card';

/**
 * Device Status Chart Component
 * 
 * Displays device status distribution as a simple bar chart.
 * Uses CSS for styling, no external chart library required.
 */

interface StatusData {
  status: string;
  count: number;
}

interface DeviceStatusChartProps {
  data: StatusData[];
  className?: string;
}

const statusColors: Record<string, string> = {
  connected: 'bg-success',
  disconnected: 'bg-text-muted',
  connecting: 'bg-warning',
  qr_required: 'bg-info',
};

const statusLabels: Record<string, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  connecting: 'Connecting',
  qr_required: 'QR Required',
};

export default function DeviceStatusChart({ data, className = '' }: DeviceStatusChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Device Status</h3>
        <p className="text-text-muted text-sm">No device data available</p>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + (item.count || 0), 0);
  const maxCount = Math.max(...data.map((item) => item.count || 0), 1);

  return (
    <Card className={className}>
      <h3 className="text-lg font-semibold text-text-primary mb-4">Device Status Distribution</h3>
      
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = total > 0 ? ((item.count || 0) / total) * 100 : 0;
          const barWidth = total > 0 ? ((item.count || 0) / maxCount) * 100 : 0;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusColors[item.status] || 'bg-text-muted'}`} />
                  <span className="text-text-primary font-medium">
                    {statusLabels[item.status] || item.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary">{item.count || 0}</span>
                  <span className="text-text-muted text-xs">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="w-full bg-elevated rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${statusColors[item.status] || 'bg-text-muted'} transition-all duration-500`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-divider">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">Total Devices</span>
          <span className="text-text-primary font-semibold">{total}</span>
        </div>
      </div>
    </Card>
  );
}

