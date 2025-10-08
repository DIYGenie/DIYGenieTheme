import { supabase } from './supabase';

export const BASE =
  (process.env.EXPO_PUBLIC_BASE_URL as string) || 'http://localhost:5000';

export async function api(path: string, init: RequestInit = {}) {
  const url = `${BASE}${path}`;
  const method = (init.method || 'GET').toUpperCase();
  const bodySent = init.body;
  
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const defaultHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };
  const headers = { ...defaultHeaders, ...(init.headers || {}) };
  
  const res = await fetch(url, {
    headers,
    ...init,
  });
  
  if (!res.ok) {
    let payload: any = null;
    let payloadText = '<no body>';
    try {
      // try JSON then fall back to text
      payload = await res.clone().json();
      try { payloadText = JSON.stringify(payload, null, 2); } catch { payloadText = '[unstringifiable JSON]'; }
    } catch {
      try { payloadText = await res.clone().text(); } catch {}
    }

    // capture headers too (often include error codes)
    const headersObj: Record<string, string> = {};
    try {
      res.headers.forEach((v, k) => { headersObj[k] = v; });
    } catch {}

    console.error('API_ERROR', {
      url,
      method,
      status: res.status,
      statusText: res.statusText,
      headers: headersObj,
      bodySent,
      payloadText
    });
    throw new Error(`API ${method} ${url} failed: ${res.status} ${res.statusText}`);
  }
  
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  
  return { ok: res.ok, status: res.status, data };
}

export async function apiRaw(path: string, init: RequestInit = {}) {
  const base = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:3001';
  const url = path.startsWith('http') ? path : `${base}${path}`;

  const res = await fetch(url, init); // no default headers here

  if (!res.ok) {
    let payloadText = '<no body>';
    try { payloadText = await res.clone().text(); } catch {}
    console.error('API_RAW_ERROR', {
      url,
      method: (init.method || 'GET').toUpperCase(),
      status: res.status,
      statusText: res.statusText,
      payloadText,
    });
    throw new Error(`API_RAW ${init.method || 'GET'} ${url} failed: ${res.status}`);
  }
  // try JSON, fallback to text
  try { return await res.json(); } catch { return await res.text(); }
}

export async function listProjects(userId: string) {
  const list = await api(`/api/projects?user_id=${encodeURIComponent(userId)}`);
  if (!list || !list.data) {
    console.warn('[projects] empty');
    return { items: [] };
  }
  return list.data;
}

export async function fetchProjectsForCurrentUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const uid = data?.session?.user?.id;
  if (!uid) return [];

  try {
    const result = await listProjects(uid);
    const items = Array.isArray(result) ? result : (result.items || result.projects || []);
    return items ?? [];
  } catch (err) {
    console.error('[fetchProjectsForCurrentUser] error:', err);
    return [];
  }
}

export async function fetchProjectById(id: string) {
  const res = await fetch(`${BASE}/api/projects/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('PROJECT_FETCH_FAILED');
  const json = await res.json();
  return json.item || json.project || json;
}

export async function fetchLatestScanForProject(projectId: string) {
  const { data, error } = await supabase
    .from('room_scans')
    .select('id,image_url')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { scanId: data.id, imageUrl: data.image_url as string };
}
