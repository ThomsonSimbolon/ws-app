'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { toggleTheme } from '@/store/slices/themeSlice';

/**
 * ToggleTheme Component
 * 
 * Theme switcher component with Redux integration.
 * 
 * Design Principles:
 * - Uses Redux (themeSlice) via typed hooks
 * - Only dispatches actions (no direct DOM manipulation)
 * - Does NOT read/write localStorage directly
 * - Accessible with aria-label
 * - Smooth transition
 * 
 * IMPORTANT: This is the ONLY UI component that accesses Redux.
 * All other UI components are pure presentational.
 * 
 * Hydration Fix: Uses mounted state to prevent SSR/client mismatch
 */

export default function ToggleTheme() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.mode);
  
  // Prevent hydration mismatch by only rendering theme-specific content after mount
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  const handleToggle = () => {
    dispatch(toggleTheme());
  };
  
  // Show a neutral state during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        className="relative p-2 rounded-lg bg-elevated border border-border hover:bg-secondary transition-all duration-200"
        aria-label="Toggle theme"
      >
        <svg
          className="w-5 h-5 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </button>
    );
  }
  
  return (
    <button
      onClick={handleToggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="relative p-2 rounded-lg bg-elevated border border-border hover:bg-secondary transition-all duration-200 active:scale-95"
    >
      {/* Sun Icon (visible in dark mode) */}
      <svg
        className={`w-5 h-5 transition-all duration-300 ${
          theme === 'dark' ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90 absolute inset-2'
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
      
      {/* Moon Icon (visible in light mode) */}
      <svg
        className={`w-5 h-5 transition-all duration-300 ${
          theme === 'light' ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90 absolute inset-2'
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
      
      {/* Color indicator */}
      <span className="text-text-primary" />
    </button>
  );
}
