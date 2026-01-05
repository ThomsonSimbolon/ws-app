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
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'qr_required': return 'info';
      case 'disconnected':
      default: return 'danger';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'qr_required': return 'Scan Required';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
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
    <Card padding="md" className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary">
      <div className="space-y-4">
        {/* Header with Visual Health Indicator */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
             {/* Status Dot */}
             <div className="mt-1.5 relative">
               <div className={`w-3 h-3 rounded-full ${
                 device.status === 'connected' ? 'bg-success' : 
                 device.status === 'connecting' ? 'bg-warning animate-pulse' : 
                 device.status === 'qr_required' ? 'bg-info' : 'bg-danger'
               }`} />
               {device.status === 'connected' && (
                 <div className="absolute top-0 left-0 w-3 h-3 rounded-full bg-success animate-ping opacity-75" />
               )}
             </div>
             <div>
              <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors">
                {device.deviceName}
              </h3>
              {device.phoneNumber && (
                <p className="text-sm text-text-muted">{device.phoneNumber}</p>
              )}
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(device.status)}>
            {getStatusLabel(device.status)}
          </Badge>
        </div>

        {/* Device Info */}
        <div className="grid grid-cols-2 gap-2 text-sm bg-elevated/30 p-3 rounded-lg">
           <div className="space-y-1">
             <span className="text-xs text-text-muted block">Status</span>
             <span className="text-text-primary font-medium capitalize">{device.isActive ? 'Active' : 'Inactive'}</span>
           </div>
           <div className="space-y-1">
             <span className="text-xs text-text-muted block">Last Activity</span>
             <span className="text-text-primary font-medium">{formatLastSeen(device.lastSeen)}</span>
           </div>
        </div>

        {/* Timeline Preview (Simple Text) */}
        {device.status === 'disconnected' && (
           <div className="text-xs text-danger flex items-center gap-1.5 bg-danger-soft/20 p-2 rounded">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
             <span>Device is offline. Check connection.</span>
           </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-divider">
          <Link href={`/devices/${device.deviceId}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              View Timeline
            </Button>
          </Link>
          {device.status === 'connected' ? (
            <Link href={`/send-message?deviceId=${device.deviceId}`} className="flex-1">
              <Button variant="primary" size="sm" className="w-full">
                New Message
              </Button>
            </Link>
          ) : (
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => setShowQRModal(true)}
            >
              {device.status === 'qr_required' ? 'Scan QR' : 'Reconnect'}
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

