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
    // Normalize base URL and path
    const BASE = BASE_URL.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${BASE}${normalizedPath}`;
    
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
      throw new ApiError('Request timeout - please try again', 0);
    }

    // Network error (CORS, DNS, connection refused, etc.)
    console.warn('Network/CORS?', error.message);
    throw new ApiError(
      error.message || 'Network error - please check your connection',
      0
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

/**
 * Project creation payload
 */
export interface CreateProjectPayload {
  user_id: string;
  name: string;
  budget: '$' | '$$' | '$$$';
  skill: 'Beginner' | 'Intermediate' | 'Advanced';
  status?: string;
}

/**
 * Project creation response
 */
export interface CreateProjectResponse {
  id: string;
  [key: string]: any; // Tolerate extra fields
}

/**
 * Create a new project via webhook
 */
export async function createProject(
  payload: CreateProjectPayload
): Promise<CreateProjectResponse> {
  return fetchJson<CreateProjectResponse>('/api/projects', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      status: payload.status || 'pending',
    }),
  });
}

/**
 * Update an existing project (gracefully handles 404/405 if not supported)
 */
export async function updateProject(
  projectId: string,
  patch: Record<string, any>
): Promise<void> {
  try {
    await fetchJson(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  } catch (error) {
    // Gracefully swallow 404/405 errors if backend doesn't support PATCH yet
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
      console.warn(`PATCH not supported for project ${projectId}, continuing...`);
      return;
    }
    throw error;
  }
}

/**
 * Trigger preview generation for a project
 */
export async function triggerPreview(
  projectId: string,
  payload: {
    input_image_url: string;
    prompt?: string;
    room_type?: string;
    design_style?: string;
  }
): Promise<any> {
  return fetchJson(`/api/projects/${projectId}/preview`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * List all projects for a user
 */
export async function listProjects(userId: string): Promise<any[]> {
  const data = await fetchJson(`/api/projects?user_id=${userId}`);
  // Tolerate different response shapes - if it's already an array, return it
  // Otherwise try to find an array in common field names
  if (Array.isArray(data)) {
    return data;
  }
  if (data.projects && Array.isArray(data.projects)) {
    return data.projects;
  }
  if (data.data && Array.isArray(data.data)) {
    return data.data;
  }
  // If we can't find an array, return empty array
  return [];
}
