'use client';

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import Card from '@/components/ui/Card';

interface DataPoint {
  name: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
  loading?: boolean;
  colors?: string[];
  /** 
   * 'vertical' = bars go vertically (categories on X axis, values on Y axis)
   * 'horizontal' = bars go horizontally (categories on Y axis, values on X axis)
   */
  orientation?: 'vertical' | 'horizontal';
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
];

export default function BarChart({
  data,
  title,
  height = 300,
  loading = false,
  colors = DEFAULT_COLORS,
  orientation = 'vertical',
}: BarChartProps) {
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

  // For horizontal bars: layout="vertical" in Recharts (Y = category, X = value)
  // For vertical bars: layout="horizontal" in Recharts (X = category, Y = value)
  const rechartsLayout = orientation === 'horizontal' ? 'vertical' : 'horizontal';

  return (
    <Card>
      {title && <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout={rechartsLayout}
          margin={{ 
            top: 20, 
            right: 30, 
            left: orientation === 'horizontal' ? 80 : 20, 
            bottom: 20 
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
          
          {orientation === 'vertical' ? (
            // Vertical bars: X = categories, Y = values
            <>
              <XAxis
                dataKey="name"
                stroke="var(--color-text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                stroke="var(--color-text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || colors[index % colors.length]}
                  />
                ))}
                <LabelList dataKey="value" position="top" fill="var(--color-text-secondary)" fontSize={11} />
              </Bar>
            </>
          ) : (
            // Horizontal bars: Y = categories, X = values
            <>
              <XAxis
                type="number"
                stroke="var(--color-text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="var(--color-text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={40}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || colors[index % colors.length]}
                  />
                ))}
                <LabelList dataKey="value" position="right" fill="var(--color-text-secondary)" fontSize={11} />
              </Bar>
            </>
          )}
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
            }}
            formatter={(value) => [Number(value).toLocaleString(), 'Count']}
            cursor={{ fill: 'transparent' }}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </Card>
  );
}
