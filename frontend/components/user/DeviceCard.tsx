'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Device } from '@/lib/userService';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import QRCodeModal from './QRCodeModal';

interface DeviceCardProps {
  device: Device;
  onDeviceUpdate?: () => void;
}

export default function DeviceCard({ device, onDeviceUpdate }: DeviceCardProps) {
  const [showQRModal, setShowQRModal] = useState(false);
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'qr_required':
        return 'info';
      case 'disconnected':
      default:
        return 'danger';
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card padding="md" className="hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{device.deviceName}</h3>
            {device.phoneNumber && (
              <p className="text-sm text-text-muted mt-1">{device.phoneNumber}</p>
            )}
          </div>
          <Badge variant={getStatusBadgeVariant(device.status)}>
            {device.status}
          </Badge>
        </div>

        {/* Device Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Device ID:</span>
            <span className="text-text-primary font-mono text-xs">{device.deviceId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Last Seen:</span>
            <span className="text-text-primary">{formatLastSeen(device.lastSeen)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Status:</span>
            <span className="text-text-primary capitalize">{device.isActive ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-divider">
          <Link href={`/devices/${device.deviceId}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
          {device.status === 'connected' ? (
            <Link href={`/send-message?deviceId=${device.deviceId}`} className="flex-1">
              <Button variant="primary" size="sm" className="w-full">
                Send Message
              </Button>
            </Link>
          ) : (
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => setShowQRModal(true)}
            >
              {device.status === 'qr_required' ? 'Show QR Code' : 'Connect'}
            </Button>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        deviceId={device.deviceId}
        deviceName={device.deviceName}
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        onConnected={() => {
          setShowQRModal(false);
          if (onDeviceUpdate) {
            onDeviceUpdate();
          }
        }}
      />
    </Card>
  );
}

