import React from 'react';
import { parsePhoneNumbers } from '@/lib/userService';

interface TargetNumbersInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TargetNumbersInput({ value, onChange }: TargetNumbersInputProps) {
  const { valid, invalid, duplicates } = parsePhoneNumbers(value);

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-text-primary">
          Target Numbers
        </label>
        <span className="text-xs text-text-secondary">
          {valid.length} valid numbers
        </span>
      </div>
      <p className="text-xs text-text-secondary mb-2">
        Enter phone numbers separated by newlines. Valid formats: 0812..., 62812..., +62812...
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all font-mono text-sm"
        placeholder="081234567890&#10;+6281234567890"
      />
      
      {/* Validation Feedback */}
      {(invalid.length > 0 || duplicates.length > 0) && (
        <div className="mt-2 space-y-1 text-xs">
          {invalid.length > 0 && (
            <p className="text-danger">
              Found {invalid.length} invalid numbers
            </p>
          )}
          {duplicates.length > 0 && (
            <p className="text-warning">
              Found {duplicates.length} duplicate numbers (will be skipped)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
