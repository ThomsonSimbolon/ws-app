'use client';

import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import Card from '@/components/ui/Card';

interface DataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined;
}

interface PieChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
  loading?: boolean;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
}

const DEFAULT_COLORS = [
  '#22c55e', // green (success)
  '#ef4444', // red (danger)
  '#f59e0b', // amber (warning)
  '#3b82f6', // blue (info)
  '#8b5cf6', // violet
  '#06b6d4', // cyan
];

export default function PieChart({
  data,
  title,
  height = 300,
  loading = false,
  colors = DEFAULT_COLORS,
  innerRadius = 60,
  outerRadius = 100,
}: PieChartProps) {
  if (loading) {
    return (
      <Card>
        {title && <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>}
        <div className="animate-pulse" style={{ height }}>
          <div className="h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        {title && <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>}
        <div className="flex items-center justify-center text-text-muted" style={{ height }}>
          No data available
        </div>
      </Card>
    );
  }

  // Calculate total for center label
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <Card>
      {title && <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || colors[index % colors.length]}
                stroke="var(--color-surface)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
            }}
            formatter={(value) => [value, 'Count']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span style={{ color: 'var(--color-text-secondary)' }}>{value}</span>
            )}
          />
          {/* Center Label */}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fill: 'var(--color-text-primary)', fontSize: '24px', fontWeight: 'bold' }}
          >
            {total}
          </text>
        </RechartsPieChart>
      </ResponsiveContainer>
    </Card>
  );
}
