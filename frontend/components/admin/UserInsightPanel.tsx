'use client';

import React, { useState, useEffect } from 'react';
import { getUserInsights, UserInsights } from '@/lib/adminService';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface UserInsightPanelProps {
  userId: number;
  onClose?: () => void;
}

/**
 * User Insight Panel Component
 * 
 * Displays detailed analytics and insights for a specific user including:
 * - Engagement score
 * - Device statistics
 * - Message analytics with success rate
 * - Contacts and groups count
 */
export default function UserInsightPanel({ userId, onClose }: UserInsightPanelProps) {
  const [data, setData] = useState<UserInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      try {
        const insights = await getUserInsights(userId);
        setData(insights);
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to load user insights');
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, [userId]);

  if (loading) {
    return (
      <Card padding="md" className="animate-pulse">
        <div className="h-8 bg-elevated rounded mb-4 w-1/3"></div>
        <div className="space-y-4">
          <div className="h-20 bg-elevated rounded"></div>
          <div className="h-32 bg-elevated rounded"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="md">
        <div className="text-center py-8">
          <p className="text-danger mb-4">{error}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const { user, insights } = data;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-danger';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success/10';
    if (score >= 50) return 'bg-warning/10';
    return 'bg-danger/10';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            {user.fullName || user.username}
          </h2>
          <p className="text-sm text-text-muted">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={user.role === 'admin' ? 'info' : 'warning'}>
              {user.role.toUpperCase()}
            </Badge>
            <Badge variant={user.isActive ? 'success' : 'danger'}>
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        )}
      </div>

      {/* Engagement Score */}
      <Card padding="md" className={`${getScoreBg(insights.engagementScore)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-muted">Engagement Score</p>
            <p className={`text-3xl font-bold ${getScoreColor(insights.engagementScore)}`}>
              {insights.engagementScore}/100
            </p>
          </div>
          <div className="text-right text-sm text-text-muted">
            <p>Last Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</p>
            <p>Member since: {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Devices"
          value={insights.devices.total}
          subValue={`${insights.devices.connected} connected`}
          icon="📱"
        />
        <StatCard
          label="Messages"
          value={insights.messages.total}
          subValue={`${insights.messages.last7Days} this week`}
          icon="💬"
        />
        <StatCard
          label="Contacts"
          value={insights.contacts.total}
          icon="👥"
        />
        <StatCard
          label="Groups"
          value={insights.groups.total}
          icon="👨‍👩‍👧‍👦"
        />
      </div>

      {/* Message Analytics */}
      <Card padding="md">
        <h3 className="text-sm font-medium text-text-secondary mb-4">Message Analytics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-semibold text-text-primary">{insights.messages.outgoing}</p>
            <p className="text-xs text-text-muted">Sent</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-text-primary">{insights.messages.incoming}</p>
            <p className="text-xs text-text-muted">Received</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-danger">{insights.messages.failed}</p>
            <p className="text-xs text-text-muted">Failed</p>
          </div>
          <div>
            <p className={`text-2xl font-semibold ${insights.messages.successRate >= 90 ? 'text-success' : insights.messages.successRate >= 70 ? 'text-warning' : 'text-danger'}`}>
              {insights.messages.successRate}%
            </p>
            <p className="text-xs text-text-muted">Success Rate</p>
          </div>
        </div>
        
        {/* Message Trend */}
        <div className="mt-6 pt-4 border-t border-divider">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Last 7 days:</span>
            <span className="text-text-primary font-medium">{insights.messages.last7Days} messages</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-text-muted">Last 30 days:</span>
            <span className="text-text-primary font-medium">{insights.messages.last30Days} messages</span>
          </div>
        </div>
      </Card>

      {/* Recent Devices */}
      {insights.devices.recent.length > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Recent Devices</h3>
          <div className="space-y-2">
            {insights.devices.recent.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-2 bg-elevated rounded-lg">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {device.deviceName || device.deviceId}
                  </p>
                  <p className="text-xs text-text-muted font-mono">{device.deviceId}</p>
                </div>
                <Badge variant={device.status === 'connected' ? 'success' : 'warning'}>
                  {device.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Messages */}
      {insights.messages.recent.length > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Recent Messages</h3>
          <div className="space-y-2">
            {insights.messages.recent.slice(0, 5).map((msg) => (
              <div key={msg.id} className="flex items-center justify-between p-2 bg-elevated rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{msg.direction === 'outgoing' ? '📤' : '📥'}</span>
                  <div>
                    <p className="text-sm text-text-primary">
                      {msg.toNumber || 'Unknown'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(msg.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={msg.messageType === 'text' ? 'info' : 'warning'} className="text-xs">
                    {msg.messageType}
                  </Badge>
                  <Badge 
                    variant={msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read' ? 'success' : msg.status === 'failed' ? 'danger' : 'warning'}
                    className="ml-1 text-xs"
                  >
                    {msg.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  subValue?: string;
  icon: string;
}

function StatCard({ label, value, subValue, icon }: StatCardProps) {
  return (
    <Card padding="md" className="text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-text-primary mt-2">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
      {subValue && <p className="text-xs text-text-secondary mt-1">{subValue}</p>}
    </Card>
  );
}
