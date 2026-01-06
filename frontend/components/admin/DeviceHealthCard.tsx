'use client';

import React from 'react';
import Badge from '@/components/ui/Badge';
import { DeviceHealth } from '@/lib/adminService';

interface DeviceHealthCardProps {
  health: DeviceHealth;
  compact?: boolean;
  onRefresh?: () => void;
}

/**
 * Device Health Card Component
 * 
 * Displays health metrics for a device including:
 * - Overall health score
 * - Connection status
 * - Message success rate
 * - Session stability indicators
 * - Alerts for problematic conditions
 */
export default function DeviceHealthCard({ 
  health, 
  compact = false,
  onRefresh 
}: DeviceHealthCardProps) {
  const { health: healthData } = health;
  
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'critical': return 'text-danger';
      default: return 'text-text-muted';
    }
  };

  const getHealthBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-success/10';
      case 'warning': return 'bg-warning/10';
      case 'critical': return 'bg-danger/10';
      default: return 'bg-secondary/10';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'qr_required': return '📱';
      case 'disconnected': return '🔴';
      default: return '⚪';
    }
  };

  const formatLastSeen = (minutes: number | null) => {
    if (minutes === null) return 'N/A';
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg ${getHealthBg(healthData.status)}`}>
        <div className={`text-2xl font-bold ${getScoreColor(healthData.overallScore)}`}>
          {healthData.overallScore}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {health.deviceName}
          </p>
          <p className="text-xs text-text-muted">
            {getStatusIcon(healthData.current.status)} {healthData.current.status}
          </p>
        </div>
        {healthData.alerts.length > 0 && (
          <Badge variant="warning" className="shrink-0">
            {healthData.alerts.length} alert{healthData.alerts.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="bg-base border border-divider rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            {health.deviceName}
          </h3>
          <p className="text-sm text-text-muted">
            {health.phoneNumber || 'Phone not available'}
          </p>
          {health.owner && (
            <p className="text-xs text-text-muted mt-1">
              Owner: {health.owner.fullName || health.owner.username}
            </p>
          )}
        </div>
        <div className={`text-right ${getHealthBg(healthData.status)} rounded-lg px-3 py-2`}>
          <div className={`text-2xl font-bold ${getScoreColor(healthData.overallScore)}`}>
            {healthData.overallScore}
          </div>
          <div className={`text-xs font-medium ${getHealthColor(healthData.status)}`}>
            {healthData.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="flex items-center gap-2 p-3 bg-elevated rounded-lg">
        <span className="text-xl">{getStatusIcon(healthData.current.status)}</span>
        <div className="flex-1">
          <span className="text-sm font-medium text-text-primary capitalize">
            {healthData.current.status}
          </span>
          {healthData.current.lastSeen && (
            <span className="text-xs text-text-muted ml-2">
              · Last seen: {formatLastSeen(healthData.metrics.lastSeenMinutes)}
            </span>
          )}
        </div>
        {!healthData.current.isActive && (
          <Badge variant="warning">Inactive</Badge>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricBox
          label="Uptime (7d)"
          value={`${healthData.metrics.uptime7d}%`}
          status={healthData.metrics.uptime7d >= 80 ? 'healthy' : healthData.metrics.uptime7d >= 50 ? 'warning' : 'critical'}
        />
        <MetricBox
          label="Message Rate"
          value={`${healthData.metrics.messageSuccessRate}%`}
          status={healthData.metrics.messageSuccessRate >= 90 ? 'healthy' : healthData.metrics.messageSuccessRate >= 70 ? 'warning' : 'critical'}
        />
        <MetricBox
          label="Restarts (24h)"
          value={healthData.metrics.sessionRestarts24h.toString()}
          status={healthData.metrics.sessionRestarts24h <= 2 ? 'healthy' : healthData.metrics.sessionRestarts24h <= 5 ? 'warning' : 'critical'}
        />
        <MetricBox
          label="Stuck Duration"
          value={healthData.metrics.stuckDuration ? `${healthData.metrics.stuckDuration}m` : 'N/A'}
          status={!healthData.metrics.stuckDuration ? 'healthy' : healthData.metrics.stuckDuration <= 5 ? 'warning' : 'critical'}
        />
      </div>

      {/* Alerts */}
      {healthData.alerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Alerts</p>
          {healthData.alerts.map((alert, idx) => (
            <div 
              key={idx}
              className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                alert.type === 'danger' ? 'bg-danger/10 text-danger' :
                alert.type === 'warning' ? 'bg-warning/10 text-warning' :
                'bg-primary/10 text-primary'
              }`}
            >
              <span>{alert.type === 'danger' ? '⚠️' : alert.type === 'warning' ? '⚡' : 'ℹ️'}</span>
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="w-full py-2 text-sm text-primary hover:text-primary-hover transition-colors"
        >
          ↻ Refresh Health Data
        </button>
      )}
    </div>
  );
}

interface MetricBoxProps {
  label: string;
  value: string;
  status: 'healthy' | 'warning' | 'critical';
}

function MetricBox({ label, value, status }: MetricBoxProps) {
  const getColor = () => {
    switch (status) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'critical': return 'text-danger';
    }
  };

  return (
    <div className="p-3 bg-elevated rounded-lg">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-lg font-semibold ${getColor()}`}>{value}</p>
    </div>
  );
}
