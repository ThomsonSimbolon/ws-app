import React from 'react';
import Card from './Card';

/**
 * EmptyState Component
 * 
 * Generic empty state component for displaying when no data is available.
 * Reusable across different pages and components.
 * 
 * Features:
 * - Customizable icon, title, and message
 * - Optional action button
 * - Centered layout
 * - Dark/light mode compatible
 */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        {/* Icon */}
        {icon && (
          <div className="text-text-muted mb-4 opacity-50">
            {icon}
          </div>
        )}
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {title}
        </h3>
        
        {/* Message */}
        <p className="text-text-secondary max-w-sm mb-6">
          {message}
        </p>
        
        {/* Optional Action Button */}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </Card>
  );
}
