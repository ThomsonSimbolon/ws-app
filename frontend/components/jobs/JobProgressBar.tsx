'use client';

import React from 'react';

interface JobProgressBarProps {
  /** Total number of items to process */
  total: number;
  /** Number of successfully completed items */
  completed: number;
  /** Number of failed items */
  failed: number;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Show counts text */
  showCounts?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Animate the progress bar */
  animated?: boolean;
}

/**
 * Job Progress Bar Component
 * 
 * Displays job progress with colored segments:
 * - Green for successful completions
 * - Red for failures
 * - Gray for remaining/pending
 * 
 * @example
 * <JobProgressBar 
 *   total={100} 
 *   completed={45} 
 *   failed={5} 
 *   showPercentage 
 *   showCounts 
 * />
 */
export default function JobProgressBar({
  total,
  completed,
  failed,
  showPercentage = true,
  showCounts = true,
  size = 'md',
  animated = true,
}: JobProgressBarProps) {
  // Calculate percentages
  const successPercentage = total > 0 ? (completed / total) * 100 : 0;
  const failedPercentage = total > 0 ? (failed / total) * 100 : 0;
  const totalProcessed = completed + failed;
  const overallPercentage = total > 0 ? (totalProcessed / total) * 100 : 0;

  // Size classes
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const textClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <div className="space-y-1.5">
      {/* Counts and Percentage Header */}
      {(showCounts || showPercentage) && (
        <div className="flex items-center justify-between">
          {showCounts && (
            <div className={`flex items-center gap-2 ${textClasses[size]} text-text-secondary`}>
              <span className="text-text-primary font-medium">
                {totalProcessed} / {total}
              </span>
              {failed > 0 && (
                <span className="text-danger">
                  ({failed} failed)
                </span>
              )}
            </div>
          )}
          {showPercentage && (
            <span className={`${textClasses[size]} text-text-muted`}>
              {overallPercentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className={`w-full bg-secondary rounded-full ${sizeClasses[size]} overflow-hidden`}>
        <div className="h-full flex">
          {/* Success Segment (Green) */}
          {successPercentage > 0 && (
            <div
              className={`bg-success ${sizeClasses[size]} ${
                animated ? 'transition-all duration-300 ease-out' : ''
              }`}
              style={{ width: `${successPercentage}%` }}
            />
          )}
          {/* Failed Segment (Red) */}
          {failedPercentage > 0 && (
            <div
              className={`bg-danger ${sizeClasses[size]} ${
                animated ? 'transition-all duration-300 ease-out' : ''
              }`}
              style={{ width: `${failedPercentage}%` }}
            />
          )}
        </div>
      </div>

      {/* Detailed Legend (for larger sizes) */}
      {size === 'lg' && (failed > 0 || completed > 0) && (
        <div className="flex items-center gap-4 text-xs">
          {completed > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-text-secondary">{completed} sent</span>
            </div>
          )}
          {failed > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-danger" />
              <span className="text-text-secondary">{failed} failed</span>
            </div>
          )}
          {total - totalProcessed > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span className="text-text-secondary">{total - totalProcessed} pending</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
