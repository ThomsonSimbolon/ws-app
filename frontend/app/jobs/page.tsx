'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox } from 'lucide-react';
import UserLayout from '@/components/layout/UserLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import JobErrorDetail from '@/components/jobs/JobErrorDetail';
import { get, post, ApiError } from '@/lib/api';

interface Job {
  id: string;
  type: 'send-text' | 'send-media';
  deviceId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

interface JobsResponse {
  success: boolean;
  data: {
    jobs: Job[];
    total: number;
  };
}

export default function UserJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Fetch user's jobs
  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '50');

      const response = await get<JobsResponse['data']>(`/whatsapp-multi-device/jobs?${params.toString()}`);
      if (response.success && response.data) {
        setJobs(response.data.jobs);
        setTotal(response.data.total);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch jobs');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Poll for updates when there are active jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some(
      (job) => job.status === 'processing' || job.status === 'queued' || job.status === 'paused'
    );

    if (!hasActiveJobs) return;

    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [jobs, fetchJobs]);

  const handleCancel = async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this job?')) return;

    try {
      setCancellingJobId(jobId);
      setError(null);
      await post(`/whatsapp-multi-device/jobs/${jobId}/cancel`, {});
      await fetchJobs();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to cancel job');
    } finally {
      setCancellingJobId(null);
    }
  };

  const getStatusBadge = (status: Job['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'processing':
        return <Badge variant="warning">Processing</Badge>;
      case 'queued':
        return <Badge variant="info">Queued</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="info">Cancelled</Badge>;
      case 'paused':
        return <Badge variant="warning">Paused</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: Job['type']) => {
    switch (type) {
      case 'send-text':
        return 'Text Blast';
      case 'send-media':
        return 'Media Blast';
      default:
        return type;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProgressPercentage = (job: Job) => {
    if (!job.progress.total) return 0;
    return Math.round((job.progress.completed / job.progress.total) * 100);
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">My Jobs</h1>
            <p className="text-text-muted">Monitor your bulk messaging jobs</p>
          </div>
          <Button variant="primary" onClick={() => router.push('/chat-blast')}>
            + New Chat Blast
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['', 'queued', 'processing', 'completed', 'failed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-elevated text-text-secondary hover:bg-border'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Jobs List */}
        <Card padding="none">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-text-muted">Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Inbox className="w-12 h-12 text-primary" />
                </div>
              </div>
              <p className="text-text-muted">No jobs found</p>
              <Button 
                variant="primary" 
                className="mt-4"
                onClick={() => router.push('/chat-blast')}
              >
                Create your first Chat Blast
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 hover:bg-elevated transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-text-primary">
                          {getTypeLabel(job.type)}
                        </span>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-sm text-text-muted truncate">
                        Device: {job.deviceId}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        Created: {formatDate(job.createdAt)}
                        {job.completedAt && ` • Finished: ${formatDate(job.completedAt)}`}
                      </p>
                    </div>

                    {/* Progress */}
                    <div className="w-32 text-right">
                      <div className="text-sm font-medium text-text-primary">
                        {job.progress.completed}/{job.progress.total}
                      </div>
                      <div className="w-full bg-border rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            job.status === 'failed'
                              ? 'bg-danger'
                              : job.status === 'completed'
                              ? 'bg-success'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${getProgressPercentage(job)}%` }}
                        ></div>
                      </div>
                      {/* Completed/Failed Count */}
                      {(job.progress.completed > 0 || job.progress.failed > 0) && (
                        <div className="flex flex-col gap-0.5 mt-1 text-xs">
                          {job.progress.completed > 0 && (
                            <span className="text-success">
                              {job.progress.completed} completed
                            </span>
                          )}
                          {job.progress.failed > 0 && (
                            <span className="text-danger">
                              {job.progress.failed} failed
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {(job.status === 'queued' || job.status === 'processing' || job.status === 'paused') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(job.id)}
                          disabled={cancellingJobId === job.id}
                        >
                          {cancellingJobId === job.id ? 'Cancelling...' : 'Cancel'}
                        </Button>
                      )}
                      {(job.status === 'completed' || job.status === 'failed') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJobId(job.id)}
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Error message */}
                  {job.error && (
                    <div className="mt-2 p-2 bg-danger-soft rounded text-sm text-danger">
                      {job.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Total */}
        {!isLoading && jobs.length > 0 && (
          <p className="text-sm text-text-muted text-center">
            Showing {jobs.length} of {total} jobs
          </p>
        )}
      </div>

      {/* Job Error Detail Modal */}
      <JobErrorDetail
        jobId={selectedJobId || ''}
        isOpen={!!selectedJobId}
        onClose={() => setSelectedJobId(null)}
      />
    </UserLayout>
  );
}
