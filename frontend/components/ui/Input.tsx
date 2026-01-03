import React from 'react';

/**
 * Input Component
 * 
 * Pure presentational component for form inputs with variants and error states.
 * 
 * Design Principles:
 * - Stateless and reusable
 * - No business logic
 * - No Redux access
 * - All state passed via props
 * - All colors via Tailwind + CSS variables
 */

type InputType = 'text' | 'email' | 'password' | 'number' | 'tel';
type InputSize = 'sm' | 'md' | 'lg';

interface InputProps {
  type?: InputType;
  name?: string;
  value?: string;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  size?: InputSize;
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  autoComplete?: string;
}

export default function Input({
  type = 'text',
  name,
  value,
  placeholder,
  label,
  error,
  disabled = false,
  required = false,
  size = 'md',
  className = '',
  onChange,
  onBlur,
  autoComplete,
}: InputProps) {
  // Base styles (using CSS variables)
  const baseStyles = 'w-full bg-card border rounded-lg transition-all duration-200 outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app disabled:opacity-50 disabled:cursor-not-allowed';
  
  // Size styles
  const sizeStyles: Record<InputSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-5 py-3 text-lg',
  };
  
  // Border and text color based on error state
  const borderColor = error 
    ? 'border-danger focus:border-danger focus:ring-danger' 
    : 'border-border focus:border-primary';
  
  const textColor = 'text-text-primary placeholder:text-text-muted';
  
  const inputClasses = `${baseStyles} ${sizeStyles[size]} ${borderColor} ${textColor} ${className}`;
  
  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={name}
          className="block text-sm font-medium text-text-primary mb-2"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        className={inputClasses}
      />
      {error && (
        <p className="mt-1.5 text-sm text-danger flex items-center gap-1">
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

