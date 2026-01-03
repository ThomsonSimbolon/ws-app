import React from 'react';
import Card from '@/components/ui/Card';

/**
 * StatsCard Component
 * 
 * Displays a single metric/statistic with optional change indicator.
 * 
 * Data Flow:
 * - Receives data via props (from dashboardSlice in parent)
 * - Does NOT access Redux directly
 * - Purely presentational
 */

interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  icon?: React.ReactNode;
}

export default function StatsCard({
  label,
  value,
  change,
  trend,
  icon,
}: StatsCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Label */}
          <p className="text-text-muted text-sm mb-1">{label}</p>
          
          {/* Value */}
          <p className="text-3xl font-bold text-text-primary mb-2">{value}</p>
          
          {/* Change Indicator */}
          {change && (
            <div className="flex items-center gap-1">
              {trend && (
                <span
                  className={`text-sm ${
                    trend === 'up' ? 'text-success' : 'text-danger'
                  }`}
                >
                  {trend === 'up' ? '↑' : '↓'}
                </span>
              )}
              <span
                className={`text-sm ${
                  trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-text-muted'
                }`}
              >
                {change}
              </span>
            </div>
          )}
        </div>
        
        {/* Optional Icon */}
        {icon && (
          <div className="text-primary opacity-50">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
