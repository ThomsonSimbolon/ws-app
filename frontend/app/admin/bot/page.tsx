'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import DeviceSelector from '@/components/bot/DeviceSelector';
import Button from '@/components/ui/Button';

export default function AdminBotOverviewPage() {
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
           <div>
              <h1 className="text-2xl font-bold text-text-primary">Bot Automation Center</h1>
              <p className="text-text-muted">Manage auto-replies, handoffs, and business hours across all devices.</p>
           </div>
           <div className="flex gap-2">
             <Button variant="outline" onClick={() => router.push('/admin/bot/handoffs')}>
               View Active Handoffs
             </Button>
           </div>
        </div>

        {/* Prioritized Read-Only Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           {/* Metric Card 1 */}
           <div className="bg-surface p-4 rounded-lg border border-border">
             <div className="text-text-muted text-xs uppercase font-bold mb-1">Bot System Status</div>
             <div className="text-2xl font-bold text-success">Active</div>
             <div className="text-xs text-text-secondary mt-1">System Operational</div>
           </div>
           
           {/* Metric Card 2 */}
           <div className="bg-surface p-4 rounded-lg border border-border">
             <div className="text-text-muted text-xs uppercase font-bold mb-1">24h Auto-Replies</div>
             <div className="text-2xl font-bold text-primary">1,240</div>
             <div className="text-xs text-text-secondary mt-1">Across all devices</div>
           </div>

           {/* Metric Card 3 */}
           <div className="bg-surface p-4 rounded-lg border border-border">
              <div className="text-text-muted text-xs uppercase font-bold mb-1">Active Handoffs</div>
              <div className="text-2xl font-bold text-warning">--</div>
              <div className="text-xs text-text-secondary mt-1">Waiting for human</div>
           </div>

           {/* Metric Card 4 */}
           <div className="bg-surface p-4 rounded-lg border border-border">
              <div className="text-text-muted text-xs uppercase font-bold mb-1">Avg Response Time</div>
              <div className="text-2xl font-bold text-text-primary">1.2s</div>
              <div className="text-xs text-text-secondary mt-1">Bot processing speed</div>
           </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
           <h2 className="text-lg font-bold text-text-primary mb-2">Device Management Shortcuts</h2>
           <p className="text-sm text-text-secondary mb-6">Quickly access configuration for specific devices.</p>
           
           <DeviceSelector 
             onSelect={(deviceId) => router.push(`/admin/bot/rules/${deviceId}`)}
           />
        </div>
      </div>
    </AdminLayout>
  );
}
