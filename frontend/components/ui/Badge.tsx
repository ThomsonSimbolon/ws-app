import React from 'react';

/**
 * Badge Component
 * 
 * Pure presentational component for status badges.
 * 
 * Design Principles:
 * - Stateless and reusable
 * - No business logic
 * - No Redux access
 * - Centralized variant mapping
 * - All colors via Tailwind + CSS variables
 */

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant: BadgeVariant;
  className?: string;
}

export default function Badge({
  children,
  variant,
  className = '',
}: BadgeProps) {
  // Base styles (pill shape)
  const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium';
  
  // Centralized variant mapping (using CSS variables)
  const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
  };
  
  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
