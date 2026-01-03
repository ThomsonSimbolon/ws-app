import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Theme Slice - GLOBAL State
 * 
 * Purpose: Manage theme state (dark/light)
 * Why in Redux: Theme is global app state, shared across all components
 * 
 * Contract:
 * - Redux state is the source of truth
 * - Updates flow: Redux → data-theme attribute → localStorage
 * - No localStorage reads in React render phase
 * - Initial state derived from current data-theme attribute (set by hydration script)
 */

type ThemeMode = 'dark' | 'light';

interface ThemeState {
  mode: ThemeMode;
}

// Safe function to get initial theme from data-theme attribute
const getInitialTheme = (): ThemeMode => {
  // Only run client-side
  if (typeof window === 'undefined') {
    return 'dark';
  }
  
  // Read from data-theme attribute (already set by hydration script)
  const currentTheme = document.documentElement.getAttribute('data-theme');
  return (currentTheme === 'light' ? 'light' : 'dark') as ThemeMode;
};

const initialState: ThemeState = {
  mode: getInitialTheme(),
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      // Toggle between dark and light
      const newMode = state.mode === 'dark' ? 'light' : 'dark';
      state.mode = newMode;
      
      // Side effects (client-side only)
      if (typeof window !== 'undefined') {
        // Update data-theme attribute
        document.documentElement.setAttribute('data-theme', newMode);
        
        // Persist to localStorage
        try {
          localStorage.setItem('theme', newMode);
        } catch (e) {
          console.error('Failed to save theme to localStorage:', e);
        }
      }
    },
    
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload;
      
      // Side effects (client-side only)
      if (typeof window !== 'undefined') {
        // Update data-theme attribute
        document.documentElement.setAttribute('data-theme', action.payload);
        
        // Persist to localStorage
        try {
          localStorage.setItem('theme', action.payload);
        } catch (e) {
          console.error('Failed to save theme to localStorage:', e);
        }
      }
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
