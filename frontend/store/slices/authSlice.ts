import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { login as loginService, LoginResponse } from '@/lib/authService';
import { clearAuthTokens } from '@/lib/api';
import { ApiError } from '@/lib/api';

/**
 * Auth Slice - GLOBAL State
 * 
 * Purpose: Manage authentication state with API integration
 * Why in Redux: Auth is global state, needed across many components
 */

export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: 'admin' | 'user';
  isActive: boolean;
  avatar?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Check if user is already authenticated (has token in localStorage)
const getInitialAuthState = (): { isAuthenticated: boolean; user: User | null } => {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, user: null };
  }

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      return { isAuthenticated: true, user };
    } catch {
      return { isAuthenticated: false, user: null };
    }
  }

  return { isAuthenticated: false, user: null };
};

const initialAuthState = getInitialAuthState();

const initialState: AuthState = {
  isAuthenticated: initialAuthState.isAuthenticated,
  user: initialAuthState.user,
  loading: false,
  error: null,
};

/**
 * Async thunk for login
 */
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await loginService(credentials);
      
      // Store user in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      return rejectWithValue((error as ApiError).message || 'Login failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
      
      // Clear tokens and user from localStorage
      clearAuthTokens();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
      }
    },
    
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        
        // Update user in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      }
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login pending
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // Login fulfilled
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })
      // Login rejected
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
      });
  },
});

export const { logout, updateUser, clearError } = authSlice.actions;
export default authSlice.reducer;
