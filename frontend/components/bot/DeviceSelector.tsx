'use client';

import React, { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface Device {
  id: string; // The session/device ID
  name?: string;
  phoneNumber?: string;
  status?: string;
  userId?: number;
  User?: {
    username: string;
    email: string;
  };
}

interface DeviceSelectorProps {
  onSelect: (deviceId: string) => void;
  selectedDeviceId?: string | null;
}

export default function DeviceSelector({ onSelect, selectedDeviceId }: DeviceSelectorProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        // Admin route to list ALL devices
        const response = await get<{ devices: Device[] }>('/admin/devices');
        if (response.success && response.data) {
          // The API might return array directly or { devices: [] }
          // Based on adminController.js listDevices usually returns rows or array
          // We assume standard structure or handle payload
          const deviceList = Array.isArray(response.data) ? response.data : (response.data as any).devices || (response.data as any).rows || [];
          setDevices(deviceList);
        } else {
          setError(response.message || 'Failed to fetch devices');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading devices');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  if (loading) {
    return <div className="text-center p-4 text-text-muted">Loading devices...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-danger">Error: {error}</div>;
  }

  if (devices.length === 0) {
    return <div className="text-center p-4 text-text-muted">No devices found in the system.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {devices.map((device) => (
        <Card 
          key={device.id} 
          padding="md" 
          className={`cursor-pointer transition-all hover:border-primary ${selectedDeviceId === device.id ? 'border-primary ring-1 ring-primary' : ''}`}
        //   onClick={() => onSelect(device.id)} // Moved to button to be explicit
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-bold text-text-primary">{device.name || 'Unnamed Device'}</h4>
              <p className="text-xs text-text-muted">{device.id}</p>
            </div>
            {device.status && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                device.status === 'authenticated' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
              }`}>
                {device.status}
              </span>
            )}
          </div>
          
          <div className="text-sm text-text-secondary mb-3">
             <div className="flex items-center gap-1">
               <span className="text-text-muted">User:</span>
               <span>{device.User?.username || device.userId}</span>
             </div>
             {device.phoneNumber && (
               <div className="flex items-center gap-1">
                 <span className="text-text-muted">Phone:</span>
                 <span>{device.phoneNumber}</span>
               </div>
             )}
          </div>

          <Button 
            className="w-full" 
            variant={selectedDeviceId === device.id ? "primary" : "outline"}
            onClick={() => onSelect(device.id)}
          >
            {selectedDeviceId === device.id ? 'Selected' : 'Manage Rules'}
          </Button>
        </Card>
      ))}
    </div>
  );
}
