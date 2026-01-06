'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getUserStatistics, UserStatisticsResponse } from '@/lib/userService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type Period = 'today' | 'week' | 'month';

export default function UsageInsights() {
  const [stats, setStats] = useState<UserStatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getUserStatistics(period);
      setStats(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch statistics';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-success';
    if (rate >= 70) return 'text-warning';
    return 'text-danger';
  };

  const getMaxDailyCount = () => {
    if (!stats?.dailyBreakdown.length) return 1;
    return Math.max(...stats.dailyBreakdown.map(d => d.count), 1);
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Device Usage Insights
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Your personal messaging statistics
            </p>
          </div>
          
          {/* Period Selector */}
          <div className="flex gap-1 bg-elevated rounded-lg p-1">
            {(['today', 'week', 'month'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`
                  px-3 py-1.5 text-sm rounded-md transition-all
                  ${period === p 
                    ? 'bg-primary text-white' 
                    : 'text-text-secondary hover:text-text-primary'}
                `}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-danger-soft text-danger rounded-lg text-sm flex items-center justify-between">
            {error}
            <Button variant="ghost" size="sm" onClick={fetchStats}>Retry</Button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12 text-text-secondary">
            Loading statistics...
          </div>
        ) : stats && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Messages */}
              <div className="bg-elevated rounded-xl p-4 border border-border">
                <div className="text-sm text-text-secondary mb-1">Messages Sent</div>
                <div className="text-3xl font-bold text-text-primary">
                  {stats.summary.totalMessages.toLocaleString()}
                </div>
              </div>

              {/* Success Rate */}
              <div className="bg-elevated rounded-xl p-4 border border-border">
                <div className="text-sm text-text-secondary mb-1">Success Rate</div>
                <div className={`text-3xl font-bold ${getSuccessRateColor(stats.summary.successRate)}`}>
                  {stats.summary.successRate}%
                </div>
              </div>

              {/* Failed */}
              <div className="bg-elevated rounded-xl p-4 border border-border">
                <div className="text-sm text-text-secondary mb-1">Failed</div>
                <div className="text-3xl font-bold text-danger">
                  {stats.summary.failed}
                </div>
              </div>

              {/* Active Devices */}
              <div className="bg-elevated rounded-xl p-4 border border-border">
                <div className="text-sm text-text-secondary mb-1">Active Devices</div>
                <div className="text-3xl font-bold text-primary">
                  {stats.summary.activeDevices}
                </div>
              </div>
            </div>

            {/* Daily Chart */}
            <div className="bg-elevated rounded-xl p-4 border border-border">
              <h3 className="font-medium text-text-primary mb-4">Daily Activity</h3>
              <div className="flex items-end gap-2 h-32">
                {stats.dailyBreakdown.map((day, idx) => {
                  const maxCount = getMaxDailyCount();
                  const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                  const dayName = new Date(day.date).toLocaleDateString('id-ID', { weekday: 'short' });
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col items-center justify-end h-24">
                        <span className="text-xs text-text-secondary mb-1">{day.count}</span>
                        <div 
                          className="w-full bg-gradient-to-t from-primary/80 to-primary rounded-t transition-all"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-secondary">{dayName}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-Device Stats */}
            {stats.deviceStats.length > 0 && (
              <div className="bg-elevated rounded-xl p-4 border border-border">
                <h3 className="font-medium text-text-primary mb-4">Messages by Device</h3>
                <div className="space-y-2">
                  {stats.deviceStats.map((device, idx) => {
                    const totalDeviceMessages = stats.deviceStats.reduce((sum, d) => sum + d.messageCount, 0);
                    const percentage = totalDeviceMessages > 0 
                      ? Math.round((device.messageCount / totalDeviceMessages) * 100) 
                      : 0;

                    return (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-text-primary">
                              {device.deviceName || device.deviceId?.slice(0, 12) || 'Unknown'}
                            </span>
                            <span className="text-sm text-text-secondary">
                              {device.messageCount} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-2 bg-background rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="text-xs text-text-secondary text-center">
              Data from {new Date(stats.dateRange.start).toLocaleDateString('id-ID')} to {new Date(stats.dateRange.end).toLocaleDateString('id-ID')}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
