import React from 'react';
import Link from 'next/link';
import { Job } from '@/lib/adminService';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface JobTableProps {
  jobs: Job[];
  isLoading?: boolean;
  onViewDetail?: (job: Job) => void;
  onCancel?: (jobId: string) => void;
}

export default function JobTable({ jobs, isLoading = false, onViewDetail, onCancel }: JobTableProps) {
  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleString();
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'send-text':
        return 'Send Text';
      case 'send-media':
        return 'Send Media';
      default:
        return type;
    }
  };

  const truncateJobId = (jobId: string) => {
    if (jobId.length > 20) {
      return jobId.substring(0, 20) + '...';
    }
    return jobId;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-elevated rounded-lg" />
        ))}
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">No jobs found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-divider">
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Job ID</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Type</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Device</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Progress</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Created At</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const progressPercentage = job.progress.total > 0
              ? (job.progress.completed / job.progress.total) * 100
              : 0;

            return (
              <tr
                key={job.id}
                className="border-b border-divider hover:bg-elevated transition-colors"
              >
                <td className="py-3 px-4">
                  <span className="text-text-primary text-sm font-mono">
                    {truncateJobId(job.id)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="info">
                    {getTypeLabel(job.type)}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <Badge variant={getStatusBadgeVariant(job.status)}>
                    {job.status}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  {job.device ? (
                    <div>
                      <p className="text-text-primary text-sm">{job.device.deviceName}</p>
                      {job.device.user && (
                        <p className="text-xs text-text-muted">
                          {job.device.user.fullName || job.device.user.username}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-text-muted text-sm">-</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-text-secondary">
                      <span>
                        {job.progress.completed} / {job.progress.total}
                      </span>
                      <span>{progressPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    {job.progress.failed > 0 && (
                      <p className="text-xs text-danger">
                        {job.progress.failed} failed
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-text-secondary text-sm">
                  {formatRelativeTime(job.createdAt)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    {onViewDetail && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetail(job)}
                      >
                        Details
                      </Button>
                    )}
                    {onCancel && (job.status === 'queued' || job.status === 'processing') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancel(job.id)}
                        className="text-danger hover:text-danger hover:bg-danger-soft"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

