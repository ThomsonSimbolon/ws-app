import React from 'react';
import Card from '@/components/ui/Card';

interface UserStatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  trend?: 'up' | 'down';
}

export default function UserStatsCard({
  label,
  value,
  icon,
  change,
  trend,
}: UserStatsCardProps) {
  return (
    <Card padding="md" className="hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted mb-1">{label}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          {change && (
            <p
              className={`text-xs mt-1 ${
                trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-text-muted'
              }`}
            >
              {change}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-lg bg-primary-soft flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
    </Card>
  );
}

