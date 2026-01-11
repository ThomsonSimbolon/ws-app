'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { get, ApiError } from '@/lib/api';

interface BotStatsCardProps {
  deviceId: string;
}

interface BotStats {
  botEnabled: boolean;
  activeRules: number;
  conversations: {
    idle: number;
    active: number;
    handoff: number;
  };
  autoReplies24h?: number;
  activeHandoffs?: number;
  avgResponseTime?: number;
}

type TimeRange = 'today' | '7days';

export default function BotStatsCard({ deviceId }: BotStatsCardProps) {
  const [stats, setStats] = useState<BotStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('today');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await get<BotStats>(`/bot/devices/${encodeURIComponent(deviceId)}/stats`);
        
        if (response.success && response.data) {
          setStats(response.data);
        }
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    if (deviceId) {
      fetchStats();
    }
  }, [deviceId, timeRange]);

  // Skeleton loader
  if (isLoading) {
    return (
      <Card padding="md" className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="h-5 w-32 bg-border rounded animate-pulse"></div>
          <div className="h-8 w-40 bg-border rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-elevated rounded-lg">
              <div className="h-4 w-20 bg-border rounded animate-pulse mb-2"></div>
              <div className="h-8 w-12 bg-border rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card padding="md" className="mb-6">
        <div className="flex items-center gap-2 text-danger">
          <span>⚠️</span>
          <span className="text-sm">{error}</span>
        </div>
      </Card>
    );
  }

  if (!stats) return null;

  // Calculate metrics
  const incomingMessages = (stats.conversations?.idle || 0) + (stats.conversations?.active || 0) + (stats.conversations?.handoff || 0);
  const autoReplies = stats.autoReplies24h || stats.conversations?.active || 0;
  const handoffCount = stats.activeHandoffs || stats.conversations?.handoff || 0;
  const responseRate = incomingMessages > 0 
    ? Math.round((autoReplies / incomingMessages) * 100) 
    : 0;

  const metrics = [
    {
      label: 'Incoming Messages',
      value: incomingMessages,
      icon: '📩',
      color: 'text-info',
    },
    {
      label: 'Auto Replies',
      value: autoReplies,
      icon: '🤖',
      color: 'text-success',
    },
    {
      label: 'Handoffs',
      value: handoffCount,
      icon: '🙋',
      color: 'text-warning',
    },
    {
      label: 'Response Rate',
      value: `${responseRate}%`,
      icon: '📊',
      color: 'text-primary',
    },
  ];

  return (
    <Card padding="md" className="mb-6">
      {/* Header with Time Range Toggle */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Bot Statistics</h3>
        <div className="flex bg-elevated rounded-lg p-1">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              timeRange === 'today'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              timeRange === '7days'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Last 7 Days
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="p-4 bg-elevated rounded-lg border border-border hover:border-primary transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{metric.icon}</span>
              <span className="text-xs text-text-muted uppercase tracking-wide">
                {metric.label}
              </span>
            </div>
            <div className={`text-2xl font-bold ${metric.color}`}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* Bot Status Indicator */}
      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className={`w-2 h-2 rounded-full ${stats.botEnabled ? 'bg-success' : 'bg-text-muted'}`}></span>
        <span className="text-text-muted">
          Bot is {stats.botEnabled ? 'enabled' : 'disabled'} • {stats.activeRules} active rules
        </span>
      </div>
    </Card>
  );
}
