/**
 * API wrapper with fetch helper and entitlements endpoint
 */

import { Platform } from 'react-native';
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
const BASE = BASE_URL.replace(/\/+$/, '');
const join = (p: string) => `${BASE}${p.startsWith('/') ? p : `/${p}`}`;

async function fetchJson<T = any>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const url = join(path);
    if (__DEV__) console.log('[API]', url);
    
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || errorData.message || `HTTP ${response.status}`,
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
      throw new ApiError('Request timeout', 0);
    }

    // Network error (CORS, DNS, connection refused, etc.)
    console.warn('Network/CORS or wrong BASE_URL');
    throw new ApiError(
      error.message || 'Network error',
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
  // Handle { ok: true, items: [...] } response
  if (data.items && Array.isArray(data.items)) {
    return data.items;
  }
  // Tolerate different response shapes
  if (Array.isArray(data)) {
    return data;
  }
  if (data.projects && Array.isArray(data.projects)) {
    return data.projects;
  }
  if (data.data && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

/**
 * Get project details by ID
 */
export async function getProject(id: string) {
  const r = await fetch(`${BASE}/api/projects/${id}`);
  if (!r.ok) throw new Error('getProject failed');
  return r.json(); // { ok, item }
}

/**
 * Request preview generation for a project
 */
export async function requestPreview(id: string) {
  const r = await fetch(`${BASE}/api/projects/${id}/preview`, { method: 'POST' });
  if (!r.ok) throw new Error('requestPreview failed');
  return r.json(); // { ok:true }
}

/**
 * Poll project status until preview is ready or timeout
 */
export async function pollProjectStatus(
  projectId: string,
  options: { interval?: number; timeout?: number } = {}
): Promise<any> {
  const { interval = 2000, timeout = 60000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await getProject(projectId);
      const project = response.item || response;
      
      // Check if preview is ready
      if (project.status === 'preview_ready' || project.preview_url) {
        return project;
      }
      
      // If failed, throw error
      if (project.status === 'failed') {
        throw new Error('Preview generation failed');
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      // If it's a clear error message, throw immediately
      if (error.message && error.message.includes('failed')) {
        throw error;
      }
      // Continue polling for other errors
    }
  }
  
  throw new Error('Preview generation timeout');
}

/**
 * Upload room photo using FormData (works on web & native)
 */
export async function uploadRoomPhoto(projectId: string, asset: any): Promise<{ ok: true; url: string }> {
  let filePart: any = {
    uri: asset.uri,
    name: asset.fileName || `room-${Date.now()}.jpg`,
    type: asset.mimeType || 'image/jpeg',
  };

  if (Platform.OS === 'web') {
    const resp = await fetch(asset.uri);
    const blob = await resp.blob();
    filePart = new File([blob], filePart.name, { type: filePart.type });
  }

  const fd = new FormData();
  fd.append('file', filePart as any);

  const r = await fetch(`${BASE}/api/projects/${projectId}/image`, {
    method: 'POST',
    body: fd,
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Upload failed (${r.status}): ${t || 'unknown error'}`);
  }
  
  return r.json();
}
