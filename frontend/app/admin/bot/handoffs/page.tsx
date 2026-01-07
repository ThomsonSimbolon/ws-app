'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import { get, post } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import Card from '@/components/ui/Card';

// Reusing Handoff interface from local or defining it
interface Handoff {
  senderJid: string;
  phoneNumber: string;
  handoffAt: string;
  reason: string;
  lastActivity: string;
}

interface DeviceHandoffs {
  deviceId: string;
  handoffs: Handoff[];
}

export default function AdminHandoffsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [activeHandoffs, setActiveHandoffs] = useState<DeviceHandoffs[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all active handoffs by iterating devices (since no global endpoint)
  // Optimisation: Fetch devices, then fetch handoffs for them.
  useEffect(() => {
    const fetchAllHandoffs = async () => {
      try {
        setLoading(true);
        // 1. Get Devices
        const devicesRes = await get<{ devices: any[] }>('/admin/devices');
        if (!devicesRes.success || !devicesRes.data) throw new Error('Failed to fetch devices');
        
        const devices = Array.isArray(devicesRes.data) ? devicesRes.data : (devicesRes.data as any).rows || [];

        // 2. Fetch handoffs for each device
        const handoffPromises = devices.map(async (device: any) => {
           const res = await get<{ handoffs: Handoff[] }>(`/bot/devices/${device.id || device.deviceId}/handoffs`);
           if (res.success && res.data && res.data.handoffs && res.data.handoffs.length > 0) {
              return { deviceId: device.id || device.deviceId, handoffs: res.data.handoffs };
           }
           return null;
        });

        const results = await Promise.all(handoffPromises);
        const validResults = results.filter((r): r is DeviceHandoffs => r !== null);
        setActiveHandoffs(validResults);

      } catch (error) {
        console.error('Error fetching handoffs:', error);
        addToast('Failed to load active handoffs', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAllHandoffs();
  }, [addToast]);

  const handleResume = async (deviceId: string, senderJid: string) => {
    if(!confirm("Resume bot for this conversation?")) return;

    try {
      const res = await post(`/bot/devices/${deviceId}/handoffs/${senderJid}/resume`, {});
      if (res.success) {
        addToast('Bot resumed successfully', 'success');
        // Remove from list locally
        setActiveHandoffs(prev => prev.map(dev => {
           if (dev.deviceId === deviceId) {
             return { ...dev, handoffs: dev.handoffs.filter(h => h.senderJid !== senderJid) };
           }
           return dev;
        }).filter(dev => dev.handoffs.length > 0));
      } else {
         addToast(res.message || 'Failed to resume bot', 'error');
      }
    } catch (error) {
       addToast('Failed to resume bot', 'error');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back
          </Button>
          <div>
             <h1 className="text-2xl font-bold text-text-primary">Active Handoffs</h1>
             <p className="text-text-muted">Conversations currently waiting for human response.</p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-muted">Scanning devices for active handoffs...</div>
        ) : activeHandoffs.length === 0 ? (
          <div className="p-12 text-center border rounded-lg bg-surface">
             <div className="text-4xl mb-4">✅</div>
             <h3 className="text-lg font-bold">No Active Handoffs</h3>
             <p className="text-text-muted">All conversations are being handled by bots.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeHandoffs.map((deviceGroup) => (
              <div key={deviceGroup.deviceId} className="space-y-3">
                 <h3 className="font-bold text-text-secondary border-b border-border pb-2 flex justify-between">
                   <span>Device: {deviceGroup.deviceId}</span>
                   <Link href={`/admin/bot/rules/${deviceGroup.deviceId}`} className="text-primary text-sm hover:underline">
                     Manage Bot
                   </Link>
                 </h3>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                   {deviceGroup.handoffs.map((handoff) => (
                     <Card key={handoff.senderJid} padding="md" className="border-l-4 border-l-warning">
                        <div className="flex justify-between items-start gap-3">
                           <div>
                              <div className="font-bold text-lg">{handoff.phoneNumber}</div>
                              <div className="text-xs text-text-muted mb-2">{handoff.senderJid}</div>
                              
                              <div className="space-y-1 text-sm">
                                <div className="flex gap-2">
                                  <span className="text-text-muted w-20">Reason:</span>
                                  <span className="font-medium bg-elevated px-1.5 rounded">{handoff.reason}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-text-muted w-20">Time:</span>
                                  <span>{new Date(handoff.handoffAt).toLocaleTimeString()}</span>
                                </div>
                              </div>
                           </div>
                           <div className="flex flex-col gap-2">
                              <Button size="sm" variant="primary" onClick={() => handleResume(deviceGroup.deviceId, handoff.senderJid)}>
                                Resume Bot
                              </Button>
                              <a 
                                href={`https://wa.me/${handoff.senderJid.split('@')[0]}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-center text-primary hover:underline py-1"
                              >
                                Open Chat ↗
                              </a>
                           </div>
                        </div>
                     </Card>
                   ))}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
