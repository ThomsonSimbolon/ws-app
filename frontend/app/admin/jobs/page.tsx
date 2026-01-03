'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Card from '@/components/ui/Card';
import JobTable from '@/components/admin/JobTable';
import JobFilters from '@/components/admin/JobFilters';
import JobDetailModal from '@/components/admin/JobDetailModal';
import { getJobs, getJobDetails, cancelJob, GetJobsParams, Job } from '@/lib/adminService';
import { ApiError } from '@/lib/api';

export default function JobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);

  // Filters
  const [status, setStatus] = useState<'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | ''>('');
  const [type, setType] = useState<'send-text' | 'send-media' | ''>('');

  // Modal state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

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

  // Auto-refresh polling (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if there are processing or queued jobs
      const hasActiveJobs = jobs.some(
        (job) => job.status === 'processing' || job.status === 'queued'
      );
      if (hasActiveJobs) {
        fetchJobs();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [jobs, fetchJobs]);

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
      setIsCancelling(jobId);
      setError(null);
      await cancelJob(jobId);
      // Refresh jobs list
      await fetchJobs();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to cancel job');
    } finally {
      setIsCancelling(null);
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
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Job Queue Management</h1>
          <p className="text-text-secondary">Monitor and manage bulk messaging jobs</p>
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
              {jobs.some((j) => j.status === 'processing' || j.status === 'queued') && (
                <span className="ml-2 text-primary">(Auto-refreshing...)</span>
              )}
            </p>
          </div>
          <JobTable
            jobs={jobs}
            isLoading={isLoading}
            onViewDetail={handleViewDetail}
            onCancel={handleCancel}
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

