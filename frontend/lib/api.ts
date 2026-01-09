/**
 * API Client Utility
 *
 * Centralized API client for making requests to the backend.
 * Handles authentication, error handling, and response parsing.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005/api";

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/**
 * Get refresh token from localStorage
 * @internal - Currently not used but kept for future token refresh functionality
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

/**
 * Set authentication token in localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
}

/**
 * Set refresh token in localStorage
 */
export function setRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("refreshToken", token);
}

/**
 * Remove authentication tokens from localStorage
 */
export function clearAuthTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
}

/**
 * Build headers for API request
 */
function buildHeaders(customHeaders?: Record<string, string>): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Parse error response
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  let errorData: {
    message?: string;
    error?: string;
    errors?: Record<string, string[]>;
  };

  try {
    errorData = await response.json();
  } catch {
    errorData = { message: response.statusText || "An error occurred" };
  }

  return {
    message: errorData.message || errorData.error || "An error occurred",
    status: response.status,
    errors: errorData.errors,
  };
}

/**
 * Make API request
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: buildHeaders(options.headers as Record<string, string>),
  };

  try {
    const response = await fetch(url, config);

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      if (response.ok) {
        return { success: true };
      }
      throw await parseErrorResponse(response);
    }

    const data = await response.json();

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return {
      success: true,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw {
        message: "Network error. Please check your connection.",
        status: 0,
      } as ApiError;
    }

    // Check if error is already an ApiError
    if (error && typeof error === "object" && "status" in error) {
      throw error as ApiError;
    }

    throw {
      message: (error as Error).message || "An unexpected error occurred",
    } as ApiError;
  }
}

/**
 * GET request
 */
export async function get<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    ...options,
    method: "GET",
  });
}

/**
 * POST request
 */
export async function post<T>(
  endpoint: string,
  body?: unknown,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    ...options,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request
 */
export async function put<T>(
  endpoint: string,
  body?: unknown,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    ...options,
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request
 */
export async function del<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    ...options,
    method: "DELETE",
  });
}

/**
 * PATCH request
 */
export async function patch<T>(
  endpoint: string,
  body?: unknown,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}
