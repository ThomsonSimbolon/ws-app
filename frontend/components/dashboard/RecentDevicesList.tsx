import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Device } from '@/lib/adminService';

interface RecentDevicesListProps {
  devices: Device[];
  isLoading?: boolean;
  className?: string;
}

const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  connected: 'success',
  disconnected: 'danger',
  connecting: 'warning',
  qr_required: 'info',
};

export default function RecentDevicesList({ devices, isLoading = false, className = '' }: RecentDevicesListProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Devices</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-elevated rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!devices || devices.length === 0) {
    return (
      <Card className={className}>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Devices</h3>
        <p className="text-text-muted text-sm">No devices found</p>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Recent Devices</h3>
        <a
          href="/admin/devices"
          className="text-sm text-primary hover:text-primary-hover transition-colors"
        >
          View All
        </a>
      </div>
      
      <div className="space-y-3">
        {devices.slice(0, 10).map((device) => (
          <div
            key={device.id}
            className="flex items-center justify-between p-3 bg-elevated rounded-lg hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Device Icon */}
              <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              
              {/* Device Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {device.deviceName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {device.phoneNumber && (
                    <p className="text-xs text-text-muted">{device.phoneNumber}</p>
                  )}
                  {device.user && (
                    <p className="text-xs text-text-muted">
                      • {device.user.fullName || device.user.username}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Status Badge */}
            <Badge variant={statusColors[device.status] || 'danger'}>
              {device.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

