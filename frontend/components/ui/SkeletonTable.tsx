import React from 'react';
import Card from './Card';

/**
 * SkeletonTable Component
 * 
 * Loading placeholder for TransactionList component.
 * Displays table structure with shimmer rows.
 * 
 * Features:
 * - Table header visible
 * - 5 skeleton rows
 * - Responsive (table on desktop, cards on mobile)
 * - Shimmer animation
 */

export default function SkeletonTable() {
  const rows = Array.from({ length: 5 });

  return (
    <Card padding="none">
      {/* Desktop & Tablet: Table Layout */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead className="bg-elevated border-b border-divider">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary">
                User
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary">
                Amount
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary">
                Date
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((_, index) => (
              <tr
                key={index}
                className="border-b border-divider last:border-0"
              >
                <td className="px-6 py-4">
                  <div className="skeleton h-4 w-32" />
                </td>
                <td className="px-6 py-4">
                  <div className="skeleton h-4 w-20" />
                </td>
                <td className="px-6 py-4">
                  <div className="skeleton h-4 w-24" />
                </td>
                <td className="px-6 py-4">
                  <div className="skeleton h-6 w-20 rounded-full" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Stacked Card Layout */}
      <div className="md:hidden">
        {rows.map((_, index) => (
          <div
            key={index}
            className={`p-4 ${index !== rows.length - 1 ? 'border-b border-divider' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-6 w-20 rounded-full" />
            </div>
            <div className="flex justify-between items-center">
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
