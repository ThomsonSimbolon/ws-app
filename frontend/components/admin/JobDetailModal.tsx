'use client';

import React from 'react';
import { Job } from '@/lib/adminService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface JobDetailModalProps {
  isOpen: boolean;
  job: Job | null;
  onClose: () => void;
}

export default function JobDetailModal({
  isOpen,
  job,
  onClose,
}: JobDetailModalProps) {
  if (!isOpen || !job) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'queued':
        return 'info';
      case 'processing':
        return 'warning';
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'cancelled':
        return 'info';
      default:
        return 'info';
    }
  };

  const progressPercentage = job.progress.total > 0
    ? (job.progress.completed / job.progress.total) * 100
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative z-10 max-w-3xl w-full max-h-[90vh] overflow-y-auto" padding="lg">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-text-primary">Job Details</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          {/* Job Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-muted">Job ID</label>
              <p className="text-text-primary mt-1 font-mono text-sm">{job.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Type</label>
              <div className="mt-1">
                <Badge variant="info">{job.type}</Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Status</label>
              <div className="mt-1">
                <Badge variant={getStatusBadgeVariant(job.status)}>
                  {job.status}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Progress</label>
              <div className="mt-1">
                <p className="text-text-primary text-sm">
                  {job.progress.completed} / {job.progress.total} messages
                  {job.progress.failed > 0 && (
                    <span className="text-danger ml-2">({job.progress.failed} failed)</span>
                  )}
                </p>
                <div className="w-full bg-secondary rounded-full h-2 mt-1">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Created At</label>
              <p className="text-text-primary mt-1 text-sm">{formatDate(job.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Started At</label>
              <p className="text-text-primary mt-1 text-sm">{formatDate(job.startedAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Completed At</label>
              <p className="text-text-primary mt-1 text-sm">{formatDate(job.completedAt)}</p>
            </div>
          </div>

          {/* Device Info */}
          {job.device && (
            <div>
              <label className="text-sm font-medium text-text-muted">Device</label>
              <div className="mt-2 p-4 bg-elevated rounded-lg">
                <p className="text-text-primary">{job.device.deviceName}</p>
                <p className="text-sm text-text-muted mt-1">
                  {job.device.deviceId} {job.device.phoneNumber && `• ${job.device.phoneNumber}`}
                </p>
                {job.device.user && (
                  <p className="text-sm text-text-muted mt-1">
                    User: {job.device.user.fullName || job.device.user.username}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Messages Preview */}
          {job.data?.messages && job.data.messages.length > 0 && (
            <div>
              <label className="text-sm font-medium text-text-muted">
                Messages ({job.data.messages.length} total)
              </label>
              <div className="mt-2 p-4 bg-elevated rounded-lg max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {job.data.messages.slice(0, 10).map((msg: any, idx: number) => (
                    <div key={idx} className="text-sm text-text-primary">
                      <span className="font-medium">To: {msg.to}</span>
                      <span className="text-text-muted ml-2">
                        - {msg.message?.substring(0, 50)}
                        {msg.message?.length > 50 ? '...' : ''}
                      </span>
                    </div>
                  ))}
                  {job.data.messages.length > 10 && (
                    <p className="text-xs text-text-muted">
                      ... and {job.data.messages.length - 10} more messages
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {job.error && (
            <div>
              <label className="text-sm font-medium text-text-muted">Error</label>
              <div className="mt-2 p-4 bg-danger-soft border border-danger rounded-lg">
                <p className="text-sm text-danger">{job.error}</p>
              </div>
            </div>
          )}

          {/* Result */}
          {job.result && (
            <div>
              <label className="text-sm font-medium text-text-muted">Result</label>
              <div className="mt-2 p-4 bg-elevated rounded-lg">
                <pre className="text-xs text-text-primary overflow-x-auto">
                  {JSON.stringify(job.result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Full Data (for debugging) */}
          {process.env.NODE_ENV === 'development' && (
            <div>
              <label className="text-sm font-medium text-text-muted">Full Job Data</label>
              <div className="mt-2 p-4 bg-elevated rounded-lg">
                <pre className="text-xs text-text-primary overflow-x-auto">
                  {JSON.stringify(job, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-divider">
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

