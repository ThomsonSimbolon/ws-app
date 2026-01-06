'use client';

import { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store, AppDispatch } from './index';
import { hydrateAuth } from './slices/authSlice';

/**
 * Redux Provider Wrapper
 * 
 * Purpose: Wraps the app with Redux Provider and handles auth hydration
 * 
 * IMPORTANT: Marked as 'use client' because Redux needs client-side React Context.
 * This does NOT break SSR - the Provider component itself is client-only,
 * but the children can still be server components.
 * 
 * Auth Hydration:
 * - Initial Redux state is always unauthenticated (for SSR consistency)
 * - After mount, we hydrate auth from localStorage
 * - This prevents hydration mismatch between server and client
 */

function AuthHydration({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Hydrate auth state from localStorage after mount
    dispatch(hydrateAuth());
  }, [dispatch]);

  return <>{children}</>;
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthHydration>{children}</AuthHydration>
    </Provider>
  );
}

