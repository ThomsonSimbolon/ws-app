import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

/**
 * TransactionList Component
 * 
 * Displays a list of transactions with responsive layout.
 * 
 * Data Flow:
 * - Receives transactions via props (from dashboardSlice in parent)
 * - Does NOT access Redux directly
 * - Purely presentational
 * 
 * Responsive Behavior:
 * - Desktop & Tablet: Table layout
 * - Mobile: Stacked card layout
 * 
 * Phase 6 Enhancement:
 * - Added enhanced empty state with icon
 */

type TransactionStatus = 'completed' | 'pending' | 'failed';

interface Transaction {
  id: string;
  user: string;
  amount: string;
  date: string;
  status: TransactionStatus;
}

interface TransactionListProps {
  transactions: Transaction[];
  maxHeight?: string;
}

const statusVariantMap: Record<TransactionStatus, 'success' | 'warning' | 'danger'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
};

export default function TransactionList({ transactions, maxHeight = '400px' }: TransactionListProps) {
  // Enhanced empty state
  if (transactions.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          {/* Empty state icon */}
          <svg
            className="w-16 h-16 text-text-muted opacity-50 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          
          {/* Title */}
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No Transactions Yet
          </h3>
          
          {/* Message */}
          <p className="text-text-secondary max-w-sm">
            Transactions will appear here once they are created
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none">
      {/* Desktop & Tablet: Table Layout */}
      <div className="hidden md:block overflow-auto" style={{ maxHeight }}>
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
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className="border-b border-divider last:border-0 hover:bg-elevated transition-colors"
              >
                <td className="px-6 py-4 text-text-primary">{transaction.user}</td>
                <td className="px-6 py-4 text-text-primary font-medium">{transaction.amount}</td>
                <td className="px-6 py-4 text-text-muted text-sm">{transaction.date}</td>
                <td className="px-6 py-4">
                  <Badge variant={statusVariantMap[transaction.status]}>
                    {transaction.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Stacked Card Layout */}
      <div className="md:hidden overflow-auto" style={{ maxHeight }}>
        {transactions.map((transaction, index) => (
          <div
            key={transaction.id}
            className={`p-4 ${index !== transactions.length - 1 ? 'border-b border-divider' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <p className="text-text-primary font-medium">{transaction.user}</p>
              <Badge variant={statusVariantMap[transaction.status]}>
                {transaction.status}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-primary font-semibold">{transaction.amount}</span>
              <span className="text-text-muted text-sm">{transaction.date}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
