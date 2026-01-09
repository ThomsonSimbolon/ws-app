'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import UserLayout from '@/components/layout/UserLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DeviceTimeline from '@/components/dashboard/DeviceTimeline';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { Device, getDeviceDetails } from '@/lib/userService';

export default function DeviceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const deviceId = params?.deviceId as string;
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDevice = async () => {
      if (!deviceId) return;
      try {
        const data = await getDeviceDetails(decodeURIComponent(deviceId));
        setDevice(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load device details');
      } finally {
        setLoading(false);
      }
    };

    fetchDevice();
  }, [deviceId]);

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </UserLayout>
    );
  }

  if (error || !device) {
    return (
      <UserLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back to Devices
          </Button>
          <div className="bg-danger-soft border border-danger p-4 rounded-lg text-danger">
            {error || 'Device not found'}
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="w-full space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back
          </Button>
          <h1 className="text-2xl font-bold text-text-primary">Device Details</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Status Column */}
          <div className="md:col-span-2 space-y-6">
             <Card padding="lg">
               <h2 className="text-lg font-semibold mb-4 text-text-primary">Device Timeline</h2>
               <DeviceTimeline device={device} />
             </Card>

             {/* Connection Info */}
             <Card padding="lg">
               <h2 className="text-lg font-semibold mb-4 text-text-primary">Connection Info</h2>
               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="p-3 bg-elevated rounded-lg">
                     <span className="text-xs text-text-muted block">Phone Number</span>
                     <span className="font-mono text-text-primary">{device.phoneNumber || 'Not connected'}</span>
                   </div>
                   <div className="p-3 bg-elevated rounded-lg">
                     <span className="text-xs text-text-muted block">Device ID</span>
                     <span className="font-mono text-text-primary text-sm truncate" title={device.deviceId}>{device.deviceId}</span>
                   </div>
                   <div className="p-3 bg-elevated rounded-lg">
                     <span className="text-xs text-text-muted block">Platform</span>
                     <span className="text-text-primary capitalize">
                        {(() => {
                          const info = typeof device.deviceInfo === 'string' 
                            ? JSON.parse(device.deviceInfo) 
                            : device.deviceInfo;
                          return (info as any)?.platform || 'Unknown';
                        })()}
                     </span>
                   </div>
                   <div className="p-3 bg-elevated rounded-lg">
                     <span className="text-xs text-text-muted block">Browser</span>
                     <span className="text-text-primary capitalize">
                        {(() => {
                          const info = typeof device.deviceInfo === 'string' 
                            ? JSON.parse(device.deviceInfo) 
                            : device.deviceInfo;
                          return (info as any)?.browser || 'Unknown';
                        })()}
                     </span>
                   </div>
                 </div>
               </div>
             </Card>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
             <Card padding="md">
               <h3 className="text-sm font-semibold text-text-secondary uppercase mb-4">Quick Actions</h3>
               <div className="space-y-3">
                 {device.status === 'connected' ? (
                   <Button 
                     variant="primary" 
                     className="w-full"
                     onClick={() => router.push(`/send-message?deviceId=${device.deviceId}`)}
                   >
                     Send Message
                   </Button>
                 ) : (
                    <div className="text-sm text-text-muted text-center p-2 bg-elevated rounded">
                      Connect device to perform actions
                    </div>
                 )}
                 <Button 
                   variant="outline" 
                   className="w-full"
                   onClick={() => router.push('/dashboard')}
                 >
                   Go to Dashboard
                 </Button>
                 <Button 
                   variant="outline" 
                   className="w-full border-primary text-primary hover:bg-primary-soft"
                   onClick={() => router.push(`/devices/${encodeURIComponent(device.deviceId)}/bot`)}
                 >
                   🤖 Bot Configuration
                 </Button>
               </div>
             </Card>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
