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
  onPause?: (jobId: string) => void;
  onResume?: (jobId: string) => void;
  onRetry?: (jobId: string) => void;
}

export default function JobTable({ 
  jobs, 
  isLoading = false, 
  onViewDetail, 
  onCancel,
  onPause,
  onResume,
  onRetry 
}: JobTableProps) {
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
      case 'paused':
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
    if (!jobId) return 'N/A'; // Handle undefined/null jobId
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
          {jobs.filter(job => job && job.id).map((job) => {
            // Safe progress extraction with fallback for undefined
            const progress = job.progress || { total: 0, completed: 0, failed: 0 };
            const progressPercentage = progress.total > 0
              ? (progress.completed / progress.total) * 100
              : 0;
            
            // Safe job properties with fallback
            const jobId = job.id || 'unknown';
            const jobStatus = job.status || 'unknown';
            const jobType = job.type || 'unknown';

            return (
              <tr
                key={jobId}
                className="border-b border-divider hover:bg-elevated transition-colors"
              >
                <td className="py-3 px-4">
                  <span className="text-text-primary text-sm font-mono">
                    {truncateJobId(String(jobId))}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="info">
                    {getTypeLabel(jobType)}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <Badge variant={getStatusBadgeVariant(jobStatus)}>
                    {jobStatus}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  {job.device ? (
                    <div>
                      <p className="text-text-primary text-sm">{job.device.deviceName || 'Unknown'}</p>
                      {job.device.user && (
                        <p className="text-xs text-text-muted">
                          {job.device.user.fullName || job.device.user.username || 'Unknown User'}
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
                        {progress.completed} / {progress.total}
                      </span>
                      <span>{progressPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    {progress.failed > 0 && (
                      <p className="text-xs text-danger">
                        {progress.failed} failed
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
                    
                    {/* Control Buttons */}
                    {(jobStatus === 'queued' || jobStatus === 'processing') && (
                      <>
                        {onPause && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => onPause(job.id)}
                          >
                            Pause
                          </Button>
                        )}
                        {onCancel && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onCancel(job.id)}
                            className="text-danger hover:text-danger hover:bg-danger-soft"
                          >
                            Cancel
                          </Button>
                        )}
                      </>
                    )}

                    {jobStatus === 'paused' && (
                      <>
                        {onResume && (
                          <Button 
                            variant="success" 
                            size="sm" 
                            onClick={() => onResume(job.id)}
                          >
                            Resume
                          </Button>
                        )}
                        {onCancel && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onCancel(job.id)}
                            className="text-danger hover:text-danger hover:bg-danger-soft"
                          >
                            Cancel
                          </Button>
                        )}
                      </>
                    )}

                    {(jobStatus === 'failed' || jobStatus === 'cancelled' || jobStatus === 'completed') && progress.failed > 0 && (
                      <>
                        {onRetry && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onRetry(job.id)}
                          >
                            Retry Failed
                          </Button>
                        )}
                      </>
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

