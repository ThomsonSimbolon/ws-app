'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import DeviceSelector from '@/components/bot/DeviceSelector';

export default function AdminRulesIndexPage() {
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="border-b border-border pb-4">
           <h1 className="text-2xl font-bold text-text-primary">Select Device to Manage Auto Reply Rules</h1>
           <p className="text-text-muted">Choose a device from the list below to configure its specific automation rules.</p>
        </div>
        
        <div className="bg-surface rounded-lg border border-border p-6 min-h-[300px]">
           <div className="mb-6 flex items-center justify-center p-8 bg-surface-ground rounded border-2 border-dashed border-border">
              <div className="text-center">
                 <div className="text-4xl mb-2">📱</div>
                 <h3 className="font-bold text-text-muted">No Device Selected</h3>
                 <p className="text-sm text-text-secondary">Please select a device to view and edit its rules.</p>
              </div>
           </div>

           <h3 className="font-bold text-text-primary mb-4">Available Devices</h3>
           <DeviceSelector 
             onSelect={(deviceId) => router.push(`/admin/bot/rules/${deviceId}`)}
           />
        </div>
      </div>
    </AdminLayout>
  );
}
