/**
 * API wrapper with fetch helper and entitlements endpoint
 */

import { BASE_URL } from '../config';

const DEFAULT_TIMEOUT = 10000; // 10 seconds

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic JSON fetch wrapper with timeout and error handling
 */
async function fetchJson<T = any>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError('Request timeout - please try again');
    }

    throw new ApiError(
      error.message || 'Network error - please check your connection'
    );
  }
}

/**
 * User entitlements response
 */
export interface Entitlements {
  remaining: number;
  quota: number;
  tier: string;
  status: string;
  [key: string]: any; // Tolerate extra fields from API
}

/**
 * Get user entitlements (remaining projects, quota, tier)
 */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  return fetchJson<Entitlements>(`/me/entitlements/${userId}`);
}
