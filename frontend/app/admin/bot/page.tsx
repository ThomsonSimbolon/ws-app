'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import DeviceSelector from '@/components/bot/DeviceSelector';
import Button from '@/components/ui/Button';
import { get } from '@/lib/api';

interface BotStats {
  autoReplies24h: number;
  activeHandoffs: number;
  avgResponseTime: number;
}

interface AggregatedMetrics {
  totalAutoReplies: number;
  totalActiveHandoffs: number;
  avgResponseTime: number;
  devicesWithBotEnabled: number;
  totalDevices: number;
}

export default function AdminBotOverviewPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAggregatedMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch all devices
        const devicesRes = await get<{ devices: any[] }>('/admin/devices');
        if (!devicesRes.success || !devicesRes.data) {
          throw new Error('Failed to fetch devices');
        }

        const devices = Array.isArray(devicesRes.data) 
          ? devicesRes.data 
          : (devicesRes.data as any).rows || [];

        if (devices.length === 0) {
          setMetrics({
            totalAutoReplies: 0,
            totalActiveHandoffs: 0,
            avgResponseTime: 0,
            devicesWithBotEnabled: 0,
            totalDevices: 0,
          });
          return;
        }

        // 2. Fetch stats and handoffs for each device in parallel
        const statsPromises = devices.map(async (device: any) => {
          const deviceId = device.id || device.deviceId;
          try {
            const [statsRes, handoffsRes] = await Promise.all([
              get<BotStats>(`/bot/devices/${deviceId}/stats`),
              get<{ handoffs: any[] }>(`/bot/devices/${deviceId}/handoffs`),
            ]);

            return {
              deviceId,
              autoReplies24h: statsRes.success && statsRes.data ? (statsRes.data.autoReplies24h || 0) : 0,
              avgResponseTime: statsRes.success && statsRes.data ? (statsRes.data.avgResponseTime || 0) : 0,
              activeHandoffs: handoffsRes.success && handoffsRes.data?.handoffs ? handoffsRes.data.handoffs.length : 0,
              botEnabled: device.botEnabled || false,
            };
          } catch {
            // Device may not have bot configured, return zeros
            return {
              deviceId,
              autoReplies24h: 0,
              avgResponseTime: 0,
              activeHandoffs: 0,
              botEnabled: false,
            };
          }
        });

        const results = await Promise.all(statsPromises);

        // 3. Aggregate metrics
        const totalAutoReplies = results.reduce((sum, r) => sum + r.autoReplies24h, 0);
        const totalActiveHandoffs = results.reduce((sum, r) => sum + r.activeHandoffs, 0);
        const validResponseTimes = results.filter(r => r.avgResponseTime > 0);
        const avgResponseTime = validResponseTimes.length > 0
          ? validResponseTimes.reduce((sum, r) => sum + r.avgResponseTime, 0) / validResponseTimes.length
          : 0;
        const devicesWithBotEnabled = results.filter(r => r.botEnabled).length;

        setMetrics({
          totalAutoReplies,
          totalActiveHandoffs,
          avgResponseTime,
          devicesWithBotEnabled,
          totalDevices: devices.length,
        });
      } catch (err: any) {
        console.error('Failed to fetch bot metrics:', err);
        setError(err.message || 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchAggregatedMetrics();
  }, []);

  // Helper to format response time
  const formatResponseTime = (ms: number): string => {
    if (ms === 0) return '0s';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Skeleton component for loading state
  const MetricSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1"></div>
    </div>
  );

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

        {/* Error State */}
        {error && (
          <div className="bg-danger-soft text-danger p-4 rounded-lg border border-danger/30">
            <p className="font-medium">Failed to load metrics</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Prioritized Read-Only Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           {/* Metric Card 1 - Bot System Status */}
           <div className="bg-surface p-4 rounded-lg border border-border">
             <div className="text-text-muted text-xs uppercase font-bold mb-1">Bot System Status</div>
             {loading ? (
               <MetricSkeleton />
             ) : (
               <>
                 <div className="text-2xl font-bold text-success">Active</div>
                 <div className="text-xs text-text-secondary mt-1">
                   {metrics ? `${metrics.devicesWithBotEnabled}/${metrics.totalDevices} devices enabled` : 'System Operational'}
                 </div>
               </>
             )}
           </div>
           
           {/* Metric Card 2 - 24h Auto-Replies */}
           <div className="bg-surface p-4 rounded-lg border border-border">
             <div className="text-text-muted text-xs uppercase font-bold mb-1">24h Auto-Replies</div>
             {loading ? (
               <MetricSkeleton />
             ) : (
               <>
                 <div className="text-2xl font-bold text-primary">
                   {metrics?.totalAutoReplies.toLocaleString() || '0'}
                 </div>
                 <div className="text-xs text-text-secondary mt-1">Across all devices</div>
               </>
             )}
           </div>

           {/* Metric Card 3 - Active Handoffs */}
           <div className="bg-surface p-4 rounded-lg border border-border">
              <div className="text-text-muted text-xs uppercase font-bold mb-1">Active Handoffs</div>
              {loading ? (
                <MetricSkeleton />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${metrics && metrics.totalActiveHandoffs > 0 ? 'text-warning' : 'text-text-primary'}`}>
                    {metrics?.totalActiveHandoffs || 0}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">Waiting for human</div>
                </>
              )}
           </div>

           {/* Metric Card 4 - Avg Response Time */}
           <div className="bg-surface p-4 rounded-lg border border-border">
              <div className="text-text-muted text-xs uppercase font-bold mb-1">Avg Response Time</div>
              {loading ? (
                <MetricSkeleton />
              ) : (
                <>
                  <div className="text-2xl font-bold text-text-primary">
                    {metrics ? formatResponseTime(metrics.avgResponseTime) : '0s'}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">Bot processing speed</div>
                </>
              )}
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
