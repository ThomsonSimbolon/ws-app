import React from 'react';
import Card from '@/components/ui/Card';

/**
 * ChartPlaceholder Component
 * 
 * Visual placeholder for chart visualization.
 * NO chart library - purely CSS-based aesthetic.
 * 
 * Features:
 * - Gradient background
 * - Grid line aesthetic
 * - Dark & light mode compatible
 * - Responsive height
 */

interface ChartPlaceholderProps {
  title?: string;
  height?: string;
}

export default function ChartPlaceholder({
  title = 'Chart Visualization',
  height = '300px',
}: ChartPlaceholderProps) {
  return (
    <Card>
      {title && (
        <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
      )}
      
      <div
        className="relative rounded-lg overflow-hidden"
        style={{ height }}
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-soft to-transparent opacity-30" />
        
        {/* Grid Lines - Horizontal */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[...Array(5)].map((_, i) => (
            <div key={`h-${i}`} className="h-px bg-border opacity-50" />
          ))}
        </div>
        
        {/* Grid Lines - Vertical */}
        <div className="absolute inset-0 flex justify-between">
          {[...Array(7)].map((_, i) => (
            <div key={`v-${i}`} className="w-px bg-border opacity-50" />
          ))}
        </div>
        
        {/* Mock Chart Bars */}
        <div className="absolute inset-0 flex items-end justify-around p-8 gap-2">
          {[60, 80, 45, 90, 70, 85, 65].map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-primary opacity-40 rounded-t transition-all hover:opacity-60"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        
        {/* Placeholder Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-text-muted text-sm font-medium bg-card px-4 py-2 rounded-full border border-border">
            {title}
          </p>
        </div>
      </div>
    </Card>
  );
}
