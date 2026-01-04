import React from 'react';
import Card from '@/components/ui/Card';

interface ExecutionProgressProps {
  current: number;
  total: number;
  success: number;
  failed: number;
  isComplete: boolean;
}

export default function ExecutionProgress({
  current,
  total,
  success,
  failed,
  isComplete,
}: ExecutionProgressProps) {
  const percentage = Math.round((current / total) * 100) || 0;

  return (
    <Card padding="lg" className="text-center space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-text-primary">
          {isComplete ? 'Scheduling Complete' : 'Scheduling Messages...'}
        </h3>
        <p className="text-text-secondary">
          Processing {current} of {total} recipients
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-elevated rounded-full h-4 overflow-hidden">
        <div 
          className="bg-primary h-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="p-4 bg-success-soft rounded-lg border border-success/20">
          <p className="text-2xl font-bold text-success">{success}</p>
          <p className="text-sm text-success font-medium">Successful</p>
        </div>
        <div className="p-4 bg-danger-soft rounded-lg border border-danger/20">
          <p className="text-2xl font-bold text-danger">{failed}</p>
          <p className="text-sm text-danger font-medium">Failed</p>
        </div>
      </div>
    </Card>
  );
}
