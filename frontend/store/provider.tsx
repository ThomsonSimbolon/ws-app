'use client';

import { Provider } from 'react-redux';
import { store } from './index';

/**
 * Redux Provider Wrapper
 * 
 * Purpose: Wraps the app with Redux Provider
 * 
 * IMPORTANT: Marked as 'use client' because Redux needs client-side React Context.
 * This does NOT break SSR - the Provider component itself is client-only,
 * but the children can still be server components.
 * 
 * Integration with Hydration Script:
 * - The hydration script sets data-theme BEFORE React loads
 * - themeSlice initializes from data-theme attribute (already set)
 * - No conflict between hydration script and Redux
 */

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
