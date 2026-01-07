'use client';

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Card from '@/components/ui/Card';

interface DataPoint {
  [key: string]: string | number;
}

interface LineChartProps {
  data: DataPoint[];
  xKey: string;
  lines: {
    dataKey: string;
    color: string;
    name?: string;
  }[];
  title?: string;
  height?: number;
  loading?: boolean;
}

export default function LineChart({
  data,
  xKey,
  lines,
  title,
  height = 300,
  loading = false,
}: LineChartProps) {
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

  return (
    <Card>
      {title && <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
          <XAxis
            dataKey={xKey}
            stroke="var(--color-text-muted)"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="var(--color-text-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
            }}
          />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              name={line.name || line.dataKey}
              strokeWidth={2}
              dot={{ fill: line.color, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </Card>
  );
}
