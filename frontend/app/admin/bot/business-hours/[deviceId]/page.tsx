'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { fetchBotConfig } from '@/store/slices/botSlice';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import BotConfigCard from '@/components/bot/BotConfigCard';

export default function AdminDeviceBusinessHoursPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const deviceId = decodeURIComponent(params?.deviceId as string);

  const { config, loading } = useAppSelector((state) => state.bot);

  useEffect(() => {
    if (deviceId) {
      dispatch(fetchBotConfig(deviceId));
    }
  }, [dispatch, deviceId]);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 border-b border-border pb-4">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back
          </Button>
          <div className="flex-1">
             <h1 className="text-2xl font-bold text-text-primary">Business Hours & Bot Config</h1>
             <p className="text-text-muted text-sm">Device: {deviceId}</p>
          </div>
        </div>

        {loading.config ? (
          <div className="p-8 text-center bg-surface animate-pulse rounded-lg h-64">
             Loading configuration...
          </div>
        ) : (
          <BotConfigCard config={config} deviceId={deviceId} />
        )}
      </div>
    </AdminLayout>
  );
}
