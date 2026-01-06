'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import JobTable from '@/components/admin/JobTable';
import JobFilters from '@/components/admin/JobFilters';
import JobDetailModal from '@/components/admin/JobDetailModal';
import { getJobs, getJobDetails, cancelJob, pauseJob, resumeJob, retryJob, GetJobsParams, Job } from '@/lib/adminService';
import { ApiError } from '@/lib/api';
import { useJobSSE, JobProgressData } from '@/hooks/useJobSSE';

export default function JobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);

  // Filters
  const [status, setStatus] = useState<'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused' | ''>('');
  const [type, setType] = useState<'send-text' | 'send-media' | ''>('');

  // Modal state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // SSE-based real-time job updates
  const handleJobProgress = useCallback((progressData: JobProgressData) => {
    setJobs(prevJobs => {
      return prevJobs.map(job => {
        if (job.id === progressData.jobId) {
          return {
            ...job,
            status: progressData.status,
            progress: progressData.progress,
            startedAt: progressData.startedAt,
            completedAt: progressData.completedAt,
            error: progressData.error || undefined,
          };
        }
        return job;
      });
    });
  }, []);

  const { connectionStatus } = useJobSSE({
    onJobProgress: handleJobProgress,
    enabled: true,
  });

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: GetJobsParams = {
        status: status || undefined,
        type: type || undefined,
        limit: 50,
      };

      const response = await getJobs(params);
      setJobs(response.jobs);
      setTotal(response.total);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch jobs');
    } finally {
      setIsLoading(false);
    }
  }, [status, type]);

  // Initial load
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Fallback polling only if SSE is disconnected
  useEffect(() => {
    // Only poll if SSE is disconnected and there are active jobs
    if (connectionStatus === 'connected') return;

    const interval = setInterval(() => {
      const hasActiveJobs = jobs.some(
        (job) => job.status === 'processing' || job.status === 'queued' || job.status === 'paused'
      );
      if (hasActiveJobs) {
        fetchJobs();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [jobs, fetchJobs, connectionStatus]);

  const handleViewDetail = async (job: Job) => {
    try {
      const response = await getJobDetails(job.id);
      setSelectedJob(response.job);
      setIsModalOpen(true);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch job details');
    }
  };

  const handleCancel = async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this job?')) {
      return;
    }

    try {
      setActionLoading(jobId);
      setError(null);
      await cancelJob(jobId);
      // SSE will update the status, but also refresh list to ensure consistency
      await fetchJobs();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to cancel job');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (jobId: string) => {
    try {
      setActionLoading(jobId);
      setError(null);
      await pauseJob(jobId);
      // SSE will update the status
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to pause job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (jobId: string) => {
    try {
      setActionLoading(jobId);
      setError(null);
      await resumeJob(jobId);
      // SSE will update the status
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to resume job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      setActionLoading(jobId);
      setError(null);
      const result = await retryJob(jobId);
      // Refresh jobs to show the new retry job
      await fetchJobs();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to retry job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetFilters = () => {
    setStatus('');
    setType('');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Job Queue Management</h1>
            <p className="text-text-secondary">Monitor and manage bulk messaging jobs</p>
          </div>
          {/* SSE Connection Status */}
          <Badge 
            variant={connectionStatus === 'connected' ? 'success' : connectionStatus === 'connecting' ? 'warning' : 'info'}
          >
            {connectionStatus === 'connected' ? '● Live' : connectionStatus === 'connecting' ? '○ Connecting...' : '○ Polling'}
          </Badge>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Filters */}
        <JobFilters
          status={status}
          type={type}
          onStatusChange={setStatus}
          onTypeChange={setType}
          onReset={handleResetFilters}
        />

        {/* Jobs Table */}
        <Card padding="md">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Total: {total} jobs
              {connectionStatus === 'connected' && (
                <span className="ml-2 text-success">(Real-time updates active)</span>
              )}
              {connectionStatus !== 'connected' && jobs.some((j) => j.status === 'processing' || j.status === 'queued') && (
                <span className="ml-2 text-primary">(Auto-refreshing...)</span>
              )}
            </p>
          </div>
          <JobTable
            jobs={jobs}
            isLoading={isLoading}
            onViewDetail={handleViewDetail}
            onCancel={handleCancel}
            onPause={handlePause}
            onResume={handleResume}
            onRetry={handleRetry}
          />
        </Card>

        {/* Job Detail Modal */}
        <JobDetailModal
          isOpen={isModalOpen}
          job={selectedJob}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedJob(null);
          }}
        />
      </div>
    </AdminLayout>
  );
}

