import React from 'react';
import Link from 'next/link';
import { Device } from '@/lib/adminService';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface DeviceTableProps {
  devices: Device[];
  isLoading?: boolean;
  onDisconnect: (deviceId: string) => void;
  onDelete: (deviceId: string) => void;
  onViewHealth?: (deviceId: string) => void;
}

export default function DeviceTable({ 
  devices, 
  isLoading = false, 
  onDisconnect, 
  onDelete,
  onViewHealth 
}: DeviceTableProps) {
  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'qr_required':
        return 'warning';
      case 'disconnected':
        return 'danger';
      default:
        return 'info';
    }
  };

  const canDisconnect = (status: string) => {
    return ['connected', 'connecting'].includes(status);
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

  if (!devices || devices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">No devices found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-divider">
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Device Name</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Phone Number</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">User</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Active</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Last Seen</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Created At</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr
              key={device.id}
              className="border-b border-divider hover:bg-elevated transition-colors"
            >
              <td className="py-3 px-4">
                <div>
                  <p className="text-text-primary font-medium">{device.deviceName}</p>
                  <p className="text-xs text-text-muted">{device.deviceId}</p>
                </div>
              </td>
              <td className="py-3 px-4 text-text-secondary text-sm">
                {device.phoneNumber || '-'}
              </td>
              <td className="py-3 px-4">
                {device.user ? (
                  <Link
                    href={`/admin/users/${device.user.id}`}
                    className="text-primary hover:text-primary-hover font-medium transition-colors"
                  >
                    {device.user.fullName || device.user.username}
                  </Link>
                ) : (
                  <span className="text-text-muted">-</span>
                )}
              </td>
              <td className="py-3 px-4">
                <Badge variant={getStatusBadgeVariant(device.status)}>
                  {device.status.replace('_', ' ')}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <Badge variant={device.isActive ? 'success' : 'danger'}>
                  {device.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="py-3 px-4 text-text-secondary text-sm">
                {formatRelativeTime(device.lastSeen)}
              </td>
              <td className="py-3 px-4 text-text-secondary text-sm">
                {new Date(device.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  {onViewHealth && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewHealth(device.deviceId)}
                    >
                      Health
                    </Button>
                  )}
                  {device.user && (
                    <Link href={`/admin/users/${device.user.id}`}>
                      <Button variant="ghost" size="sm">
                        View User
                      </Button>
                    </Link>
                  )}
                  {canDisconnect(device.status) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onDisconnect(device.deviceId)}
                    >
                      Disconnect
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(device.deviceId)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

