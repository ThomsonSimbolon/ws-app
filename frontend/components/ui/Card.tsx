import React from 'react';

/**
 * Card Component
 * 
 * Pure presentational component for card containers.
 * 
 * Design Principles:
 * - Stateless and reusable
 * - No layout-specific logic
 * - No Redux access
 * - All state passed via props
 * - All colors via Tailwind + CSS variables
 * 
 * Phase 6 Enhancement:
 * - Added hover lift effect
 * - Smooth shadow transition
 */

interface CardProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Card({
  children,
  padding = 'md',
  className = '',
}: CardProps) {
  // Base styles (using CSS variables)
  const baseStyles = 'bg-card border border-border rounded-lg shadow-sm';
  
  // Padding variants
  const paddingStyles: Record<typeof padding, string> = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };
  
  // Micro-interactions: lift effect on hover + shadow enhancement
  const hoverStyles = 'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200';
  
  return (
    <div className={`${baseStyles} ${paddingStyles[padding]} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
}
