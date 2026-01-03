import React from 'react';
import Card from './Card';

/**
 * SkeletonCard Component
 * 
 * Loading placeholder for StatsCard component.
 * Displays animated shimmer effect while data is being fetched.
 * 
 * Features:
 * - Shimmer animation
 * - Matches StatsCard dimensions
 * - Dark/light mode compatible
 */

export default function SkeletonCard() {
  return (
    <Card>
      <div className="space-y-3">
        {/* Label skeleton */}
        <div className="skeleton h-4 w-24" />
        
        {/* Value skeleton */}
        <div className="skeleton h-9 w-32" />
        
        {/* Change indicator skeleton */}
        <div className="skeleton h-4 w-16" />
      </div>
    </Card>
  );
}
