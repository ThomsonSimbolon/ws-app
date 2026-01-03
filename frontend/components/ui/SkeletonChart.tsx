import React from 'react';
import Card from './Card';

/**
 * SkeletonChart Component
 * 
 * Loading placeholder for ChartPlaceholder component.
 * Displays mock chart bars with pulse animation.
 * 
 * Features:
 * - Mock chart bar shapes
 * - Pulse animation
 * - Gradient background
 * - Title skeleton
 */

interface SkeletonChartProps {
  title?: string;
  height?: string;
}

export default function SkeletonChart({
  title = 'Loading...',
  height = '300px',
}: SkeletonChartProps) {
  return (
    <Card>
      {/* Title skeleton */}
      <div className="skeleton h-6 w-32 mb-4" />
      
      <div
        className="relative rounded-lg overflow-hidden bg-elevated"
        style={{ height }}
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-soft to-transparent opacity-20" />
        
        {/* Mock chart bars with pulse */}
        <div className="absolute inset-0 flex items-end justify-around p-8 gap-2">
          {[60, 80, 45, 90, 70, 85, 65].map((barHeight, i) => (
            <div
              key={i}
              className="flex-1 bg-border rounded-t pulse"
              style={{ height: `${barHeight}%` }}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
