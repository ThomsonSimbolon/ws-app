'use client';

import React, { useState, useEffect } from 'react';
import { getJobs, cancelJob, pauseJob, resumeJob, retryJob, Job, JobDetailsResponse, getJobDetails, GetJobsParams } from '@/lib/adminService';
import JobTable from './JobTable';
import JobFilters from './JobFilters';
import JobDetailModal from './JobDetailModal';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function JobManager() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalJobs, setTotalJobs] = useState(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<Exclude<GetJobsParams['status'], undefined>>('');
  const [typeFilter, setTypeFilter] = useState<Exclude<GetJobsParams['type'], undefined>>('');

  // Detailed View
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Polling interval
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // 5 sec poll for status updates
    return () => clearInterval(interval);
  }, [statusFilter, typeFilter]);

  const fetchJobs = async () => {
    // Only set loading on initial load to avoid flickering
    if (jobs.length === 0) setLoading(true);
    
    try {
      // Imports needed for types inside function if not imported at top
      // Assuming GetJobsParams is imported or we use typeof 
      const response = await getJobs({
        status: statusFilter,
        type: typeFilter,
        limit: 50
      });
      setJobs(response.jobs);
      setTotalJobs(response.total);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (jobId: string) => {
    if (!confirm('Are you sure you want to pause this job?')) return;
    try {
      await pauseJob(jobId);
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to pause job');
    }
  };

  const handleResume = async (jobId: string) => {
    try {
      await resumeJob(jobId);
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to resume job');
    }
  };

  const handleRetry = async (jobId: string) => {
    if (!confirm('This will create a NEW job with the failed items. Continue?')) return;
    try {
      await retryJob(jobId);
      fetchJobs();
      alert('Retry job created successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to retry job');
    }
  };

  const handleCancel = async (jobId: string) => {
    if (!confirm('Are you sure you want to CANCEL this job? This cannot be undone.')) return;
    try {
      await cancelJob(jobId);
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel job');
    }
  };

  const handleViewDetail = async (job: Job) => {
    // Fetch fresh details for accurate partial progress/logs
    try {
      const details = await getJobDetails(job.id);
      setSelectedJob(details.job);
      setIsDetailModalOpen(true);
    } catch (error) {
       // Fallback to existing data if fetch fails
       setSelectedJob(job);
       setIsDetailModalOpen(true);
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-primary">Job Queue</h2>
        <Button variant="secondary" size="sm" onClick={fetchJobs}>
          Refresh
        </Button>
      </div>

      <JobFilters 
        status={statusFilter}
        onStatusChange={setStatusFilter}
        type={typeFilter}
        onTypeChange={setTypeFilter}
        onReset={handleResetFilters}
      />

      {error && (
        <div className="p-4 bg-danger-soft text-danger rounded-lg text-sm">
          {error}
        </div>
      )}

      <Card padding="none" className="overflow-hidden">
        <JobTable 
          jobs={jobs}
          isLoading={loading && jobs.length === 0}
          onViewDetail={handleViewDetail}
          onPause={handlePause}
          onResume={handleResume}
          onRetry={handleRetry}
          onCancel={handleCancel}
        />
      </Card>

      <JobDetailModal
        isOpen={isDetailModalOpen}
        job={selectedJob}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}
