'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { get, ApiError } from '@/lib/api';

interface JobResult {
  to: string;
  status: 'success' | 'error';
  messageId?: string;
  timestamp?: string;
  error?: string;
}

interface JobProgress {
  total: number;
  currentIndex: number;
  successCount: number;
  errorCount: number;
}

interface JobDetail {
  id: string;
  type: string;
  deviceId: string;
  status: string;
  createdAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  progress: JobProgress;
  results: JobResult[];
  options: { delaySec: number };
}

interface JobErrorDetailProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface GroupedError {
  reason: string;
  count: number;
  recipients: string[];
}

export default function JobErrorDetail({ jobId, isOpen, onClose }: JobErrorDetailProps) {
  const [jobDetail, setJobDetail] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !jobId) return;

    const fetchJobDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await get<JobDetail>(`/whatsapp/jobs/${encodeURIComponent(jobId)}`);
        if (response.success && response.data) {
          setJobDetail(response.data);
        }
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to load job details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetail();
  }, [isOpen, jobId]);

  // Group errors by reason for summary
  const groupedErrors = useMemo<GroupedError[]>(() => {
    if (!jobDetail?.results) return [];

    const errorMap = new Map<string, { count: number; recipients: string[] }>();

    jobDetail.results
      .filter((r) => r.status === 'error')
      .forEach((r) => {
        const reason = humanizeError(r.error || 'Unknown error');
        const existing = errorMap.get(reason);
        if (existing) {
          existing.count++;
          existing.recipients.push(r.to);
        } else {
          errorMap.set(reason, { count: 1, recipients: [r.to] });
        }
      });

    return Array.from(errorMap.entries())
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        recipients: data.recipients,
      }))
      .sort((a, b) => b.count - a.count);
  }, [jobDetail?.results]);

  const failedResults = useMemo(() => {
    return jobDetail?.results?.filter((r) => r.status === 'error') || [];
  }, [jobDetail?.results]);

  const successResults = useMemo(() => {
    return jobDetail?.results?.filter((r) => r.status === 'success') || [];
  }, [jobDetail?.results]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-2xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface-ground">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Job Details</h2>
            {jobDetail && (
              <p className="text-xs text-text-muted font-mono">{jobDetail.id}</p>
            )}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-text-muted">Loading job details...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-danger-soft border border-danger rounded-lg">
              <p className="text-sm text-danger">{error}</p>
            </div>
          ) : jobDetail ? (
            <>
              {/* Summary Section */}
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
                  Summary
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <Card padding="md" className="text-center">
                    <div className="text-2xl font-bold text-text-primary">
                      {jobDetail.progress.total}
                    </div>
                    <div className="text-xs text-text-muted">Total Recipients</div>
                  </Card>
                  <Card padding="md" className="text-center">
                    <div className="text-2xl font-bold text-success">
                      {jobDetail.progress.successCount}
                    </div>
                    <div className="text-xs text-text-muted">Successful</div>
                  </Card>
                  <Card padding="md" className="text-center">
                    <div className="text-2xl font-bold text-danger">
                      {jobDetail.progress.errorCount}
                    </div>
                    <div className="text-xs text-text-muted">Failed</div>
                  </Card>
                </div>
              </div>

              {/* Grouped Error Reasons */}
              {groupedErrors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
                    Error Reasons
                  </h3>
                  <div className="space-y-2">
                    {groupedErrors.map((group, i) => (
                      <div
                        key={i}
                        className="p-3 bg-danger-soft border border-danger/30 rounded-lg flex justify-between items-center"
                      >
                        <span className="text-sm text-text-primary">{group.reason}</span>
                        <Badge variant="danger">{group.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Recipients Detail */}
              {failedResults.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
                    Failed Recipients ({failedResults.length})
                  </h3>
                  <Card padding="none" className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-elevated sticky top-0">
                        <tr>
                          <th className="text-left p-2 text-text-muted font-medium">Recipient</th>
                          <th className="text-left p-2 text-text-muted font-medium">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {failedResults.map((result, i) => (
                          <tr key={i} className="hover:bg-elevated">
                            <td className="p-2 font-mono text-text-primary">{result.to}</td>
                            <td className="p-2 text-danger">{humanizeError(result.error)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                </div>
              )}

              {/* Success Notice (if no errors) */}
              {failedResults.length === 0 && jobDetail.status === 'completed' && (
                <div className="p-4 bg-success-soft border border-success rounded-lg text-center">
                  <span className="text-lg">✅</span>
                  <p className="text-sm text-success font-medium mt-1">
                    All {successResults.length} messages sent successfully!
                  </p>
                </div>
              )}

              {/* No Data Notice */}
              {!jobDetail.results?.length && jobDetail.status !== 'completed' && (
                <div className="p-4 bg-elevated border border-border rounded-lg text-center">
                  <p className="text-sm text-text-muted">
                    {jobDetail.status === 'processing'
                      ? 'Job is still in progress. Results will appear when completed.'
                      : 'No result data available for this job.'}
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-ground">
          <Button variant="ghost" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Convert technical error messages to human-readable format
 */
function humanizeError(error?: string): string {
  if (!error) return 'Unknown error';

  const errorLower = error.toLowerCase();

  // Common WhatsApp errors
  if (errorLower.includes('not registered') || errorLower.includes('not found on whatsapp')) {
    return 'Number not registered on WhatsApp';
  }
  if (errorLower.includes('invalid') && errorLower.includes('phone')) {
    return 'Invalid phone number format';
  }
  if (errorLower.includes('rate limit') || errorLower.includes('too many')) {
    return 'Rate limited - too many messages sent';
  }
  if (errorLower.includes('not connected') || errorLower.includes('session')) {
    return 'Device disconnected during sending';
  }
  if (errorLower.includes('timeout')) {
    return 'Request timed out';
  }
  if (errorLower.includes('blocked')) {
    return 'Recipient may have blocked this number';
  }

  // Return cleaned error (remove stack traces, limit length)
  const cleaned = error
    .replace(/at\s+\S+\s+\([^)]+\)/g, '') // Remove stack traces
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length > 80 ? cleaned.substring(0, 77) + '...' : cleaned;
}
