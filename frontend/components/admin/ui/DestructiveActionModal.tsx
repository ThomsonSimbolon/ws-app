'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

/**
 * DestructiveActionModal Interface
 * 
 * Defines the contract for the high-safety modal.
 * Designed to replace window.confirm and window.prompt.
 */
export interface DestructiveActionModalProps {
  /** Global visibility state */
  isOpen: boolean;
  
  /** Title of the destructive action (e.g. "Delete Device") */
  title: string;
  
  /** 
   * Description of consequences. 
   * Can be a string or ReactNode for rich text warnings.
   */
  description: React.ReactNode;
  
  /** 
   * The specific entity being acted upon (e.g. "Device: iPhone 13").
   * Crucial for context awareness.
   */
  targetId: string;
  
  /** Text for the confirm button (default: "Confirm") */
  confirmText?: string;
  
  /** 
   * If provided, enables "Input Confirmation Mode".
   * User MUST type this exact string to enable the confirm button.
   * Case-sensitive.
   */
  confirmKeyword?: string;
  
  /** Visual style variant (default: 'danger') */
  variant?: 'danger' | 'warning' | 'info';
  
  /** 
   * Controls the loading state of the confirm button.
   * When true, button is disabled and shows spinner.
   */
  isLoading?: boolean;
  
  /** Callback when user confirms action */
  onConfirm: () => void;
  
  /** Callback when user cancels or closes modal */
  onCancel: () => void;
}

/**
 * DestructiveActionModal Component
 * 
 * A high-safety modal for admin destructive actions.
 * Enforces deliberate intent through:
 * 1. Clear context display (Target ID)
 * 2. Visual warning styling
 * 3. Optional keyword typing requirement (for High Risk actions)
 * 4. Double-execution prevention via isLoading prop
 */
export default function DestructiveActionModal({
  isOpen,
  title,
  description,
  targetId,
  confirmText = 'Confirm',
  confirmKeyword,
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: DestructiveActionModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  // Accessibility-friendly focus management
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen && confirmKeyword && inputRef.current) {
      // Small timeout to ensure modal animation has started/DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, confirmKeyword]);

  if (!mounted || !isOpen) return null;

  // Determine if confirm button should be disabled
  const isInputMode = !!confirmKeyword;
  const isInputMatch = isInputMode ? inputValue === confirmKeyword : true;
  const isDisabled = isLoading || !isInputMatch;

  // Visual variants
  const getHeaderColor = () => {
    switch (variant) {
      case 'danger': return 'bg-danger-soft text-danger';
      case 'warning': return 'bg-warning-soft text-warning';
      case 'info': return 'bg-info-soft text-info';
      default: return 'bg-danger-soft text-danger';
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'danger': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'primary'; // Info usually maps to primary/safe
      default: return 'danger';
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md scale-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <Card padding="none" className="overflow-hidden shadow-2xl ring-1 ring-border">
          {/* Header */}
          <div className={`px-6 py-4 flex items-center gap-3 border-b border-divider ${getHeaderColor()}`}>
            <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 id="modal-title" className="font-bold text-lg leading-6">
              {title}
            </h3>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6 bg-card">
            {/* Description */}
            <div className="text-text-secondary text-sm leading-relaxed">
              {description}
            </div>

            {/* Target Context Box - CRITICAL for safety */}
            <div className="bg-elevated rounded-lg p-3 border border-border">
              <span className="text-xs uppercase tracking-wider text-text-muted font-semibold block mb-1">
                Target Entity
              </span>
              <code className="text-sm font-mono text-text-primary break-all">
                {targetId}
              </code>
            </div>

            {/* Input Confirmation Field (Conditional) */}
            {isInputMode && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-text-primary">
                  To confirm, type <span className="font-bold select-all">"{confirmKeyword}"</span> below:
                </label>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`Type ${confirmKeyword}`}
                  className="w-full border-danger focus:ring-danger"
                  ref={inputRef}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-elevated/50 border-t border-divider flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
              type="button"
            >
              Cancel
            </Button>
            
            <Button
              variant={getButtonVariant()}
              onClick={onConfirm}
              disabled={isDisabled}
              className="min-w-[100px]"
              type="button"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </div>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );

  // Portal to body to ensure z-index correctness
  return createPortal(modalContent, document.body);
}
