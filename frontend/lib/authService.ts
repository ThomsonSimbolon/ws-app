/**
 * Auth Service
 * 
 * Service layer for authentication-related API calls.
 */

import { post, ApiError, setAuthToken, setRefreshToken } from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    email: string;
    fullName?: string;
    role: 'admin' | 'user';
    isActive: boolean;
  };
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
}

export interface RegisterResponse {
  user: {
    id: number;
    username: string;
    email: string;
    fullName?: string;
    role: 'admin' | 'user';
  };
  token: string;
  refreshToken: string;
}

/**
 * Login user
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await post<LoginResponse>('/auth/login', credentials);

    if (!response.success || !response.data) {
      throw {
        message: response.message || 'Login failed',
      } as ApiError;
    }

    // Store tokens
    setAuthToken(response.data.token);
    setRefreshToken(response.data.refreshToken);

    return response.data;
  } catch (error) {
    // Re-throw with proper error handling
    if ((error as ApiError).status === 401) {
      throw {
        message: 'Invalid email or password',
        status: 401,
      } as ApiError;
    }

    throw error;
  }
}

/**
 * Register new user
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  try {
    const response = await post<RegisterResponse>('/auth/register', data);

    if (!response.success || !response.data) {
      throw {
        message: response.message || 'Registration failed',
      } as ApiError;
    }

    // Store tokens
    if (response.data.token) {
      setAuthToken(response.data.token);
    }
    if (response.data.refreshToken) {
      setRefreshToken(response.data.refreshToken);
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Refresh access token
 */
export async function refreshToken(): Promise<{ token: string }> {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw {
        message: 'No refresh token available',
      } as ApiError;
    }

    const response = await post<{ token: string }>('/auth/refresh-token', {
      refreshToken,
    });

    if (!response.success || !response.data) {
      throw {
        message: response.message || 'Token refresh failed',
      } as ApiError;
    }

    // Update stored token
    setAuthToken(response.data.token);

    return response.data;
  } catch (error) {
    throw error;
  }
}

