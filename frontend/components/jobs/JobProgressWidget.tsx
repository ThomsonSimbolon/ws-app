'use client';

import React, { useEffect, useState } from 'react';
import { Job, getJobStatus } from '@/lib/userService';

interface JobProgressWidgetProps {
  jobId: string;
  onComplete?: (job: Job) => void;
  onFailed?: (error: string) => void;
}

export default function JobProgressWidget({ jobId, onComplete, onFailed }: JobProgressWidgetProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    let pollInterval: NodeJS.Timeout;

    const fetchStatus = async () => {
      if (!jobId) return;

      try {
        const response = await getJobStatus(jobId);
        if (!isActive) return;
        
        const jobData = response.job;
        setJob(jobData);

        if (jobData.status === 'completed') {
           if (onComplete) onComplete(jobData);
           clearInterval(pollInterval);
        } else if (jobData.status === 'failed' || jobData.status === 'cancelled') {
           if (onFailed) onFailed(jobData.error || 'Job failed');
           clearInterval(pollInterval);
        }
      } catch (err: any) {
        if (!isActive) return;
        console.error('Failed to poll job status', err);
        setError('Lost connection to job');
      }
    };

    fetchStatus();
    pollInterval = setInterval(fetchStatus, 2000); // Poll every 2 seconds

    return () => {
      isActive = false;
      clearInterval(pollInterval);
    };
  }, [jobId]);

  if (error) {
    return (
      <div className="p-4 bg-danger-soft border border-danger rounded-lg text-sm text-danger flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </div>
    );
  }

  if (!job) {
    return (
       <div className="p-4 bg-card border border-border rounded-lg animate-pulse">
         <div className="h-4 bg-elevated rounded w-1/3 mb-2"></div>
         <div className="h-2 bg-elevated rounded w-full"></div>
       </div>
    );
  }

  const percent = job.progress.total > 0 
    ? Math.round((job.progress.completed / job.progress.total) * 100) 
    : 0;

  const isProcessing = job.status === 'processing' || job.status === 'queued';

  return (
    <div className="p-4 bg-card border border-border rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <div>
           <span className={`text-xs font-semibold uppercase tracking-wider ${
             job.status === 'completed' ? 'text-success' :
             job.status === 'failed' ? 'text-danger' :
             'text-primary'
           }`}>
             {job.status}
           </span>
           <h4 className="text-sm font-medium text-text-primary capitalize">
             {job.type.replace('-', ' ')}
           </h4>
        </div>
        <div className="text-right">
           <span className="text-sm font-mono text-text-muted">
             {percent}%
           </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-elevated rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 rounded-full ${
             job.status === 'completed' ? 'bg-success' :
             job.status === 'failed' ? 'bg-danger' :
             'bg-primary'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between mt-2 text-xs text-text-muted">
        <span>
          {job.progress.completed} / {job.progress.total} processed
        </span>
        {job.progress.failed > 0 && (
          <span className="text-danger">
            {job.progress.failed} failed
          </span>
        )}
      </div>
    </div>
  );
}
