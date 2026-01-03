import React from 'react';

/**
 * Button Component
 * 
 * Pure presentational component for buttons with variants and sizes.
 * 
 * Design Principles:
 * - Stateless and reusable
 * - No business logic
 * - No Redux access
 * - All state passed via props
 * - All colors via Tailwind + CSS variables
 */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
  // Base styles (shared across all variants)
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 inline-flex items-center justify-center';
  
  // Variant styles (using CSS variables via Tailwind)
  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-white hover:bg-primary-hover active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-secondary text-text-primary hover:bg-elevated active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
    outline: 'bg-transparent border-2 border-primary text-primary hover:bg-primary-soft active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'bg-transparent text-text-secondary hover:bg-elevated hover:text-text-primary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
    danger: 'bg-danger text-white hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
  };
  
  // Size styles
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </button>
  );
}
