import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';

/**
 * Typed Redux Hooks
 * 
 * IMPORTANT: These hooks MUST be used instead of the plain 
 * useDispatch and useSelector from react-redux.
 * 
 * Benefits:
 * - Full TypeScript support
 * - Auto-complete for state shape
 * - Type-safe dispatching
 * - Prevents importing the wrong hooks
 * 
 * Usage:
 *   const dispatch = useAppDispatch();
 *   const theme = useAppSelector((state) => state.theme.mode);
 */

// Typed dispatch hook
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Typed selector hook  
export const useAppSelector = <TSelected = unknown>(
  selector: (state: RootState) => TSelected
): TSelected => useSelector(selector);
