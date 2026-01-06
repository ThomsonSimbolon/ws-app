import { useState, useCallback } from 'react';
import { ApiError } from '@/lib/api';

/**
 * Configuration options for the useDestructiveAction hook
 */
interface UseDestructiveActionOptions<T> {
  /** The async function that performs the destructive action */
  action: (args: T) => Promise<void | any>;
  
  /** Callback fired on successful execution */
  onSuccess?: (result?: any) => void;
  
  /** Callback fired on failure (after internal error handling) */
  onError?: (error: any) => void;
  
  /** 
   * Validation function to check PRE-action state.
   * Return a string (error message) if validation fails.
   * Return null if validation passes.
   */
  validate?: (args: T) => string | null;
}

/**
 * Result interface returned by useDestructiveAction
 */
interface UseDestructiveActionResult<T> {
  /** Execute the action (wraps the passed action function) */
  execute: (args: T) => Promise<void>;
  
  /** Current loading state */
  isLoading: boolean;
  
  /** Current error state (cleared on next execution attempt) */
  error: string | null;
  
  /** Reset hook state */
  reset: () => void;
}

/**
 * useDestructiveAction Hook
 * 
 * Centralizes the lifecycle of a destructive admin action.
 * 
 * Features:
 * 1. Double-execution prevention (via isLoading lock)
 * 2. Pre-action validation integration
 * 3. Standardized error handling (including 409 Conflict/Stale State)
 * 4. Automatic error string extraction from API responses
 * 
 * @example
 * const { execute, isLoading } = useDestructiveAction({
 *   action: (id) => deleteDevice(id),
 *   onSuccess: () => refreshData(),
 * });
 */
export function useDestructiveAction<T = string>(
  options: UseDestructiveActionOptions<T>
): UseDestructiveActionResult<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const execute = useCallback(async (args: T) => {
    // 1. SAFETY: Prevent double execution
    if (isLoading) return;

    // 2. SAFETY: Pre-action Validation
    if (options.validate) {
      const validationError = options.validate(args);
      if (validationError) {
        setError(validationError);
        if (options.onError) options.onError(new Error(validationError));
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // 3. EXECUTION
      const result = await options.action(args);
      
      // 4. SUCCESS
      if (options.onSuccess) {
        options.onSuccess(result);
      }
    } catch (err: any) {
      // 5. ERROR HANDLING
      console.error('[DestructiveAction] Failed:', err);

      let errorMessage = 'An unexpected error occurred.';

      // Extract meaningful error message
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        // Handle API Error objects aka { message: '...', status: ... }
        if (err.message) errorMessage = err.message;
        
        // SAFETY: Handle Stale State (409 Conflict) specifically
        if (err.status === 409) {
          errorMessage = `State Conflict: ${errorMessage || 'The resource state has changed.'}. Please refresh the page.`;
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(errorMessage);
      
      if (options.onError) {
        options.onError(err);
      }
    } finally {
      // Always cleanup loading state
      setIsLoading(false);
    }
  }, [isLoading, options]);

  return {
    execute,
    isLoading,
    error,
    reset
  };
}
