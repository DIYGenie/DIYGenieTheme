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

type AnyJson = Record<string, any>;

function extractItems(json: AnyJson | any): any[] {
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== 'object') return [];
  return json.items || json.projects || json.data || [];
}

export async function fetchProjectsForCurrentUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const uid = data?.session?.user?.id;
  if (!uid) return [];

  const API_BASE =
    process.env.EXPO_PUBLIC_WEBHOOKS_BASE_URL ||
    'https://diy-genie-webhooks-tyekowalski.replit.app';

  const paramVariants = [
    `user_id=${encodeURIComponent(uid)}`,
    `userId=${encodeURIComponent(uid)}`,
    `uid=${encodeURIComponent(uid)}`,
  ];

  // Try user-filtered endpoints first
  for (const q of paramVariants) {
    try {
      const url = `${API_BASE}/api/projects?${q}`;
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) continue;

      const json = await res.json();
      const items = extractItems(json) ?? [];
      console.log('[projects fetch]', q, '→', Array.isArray(items) ? items.length : 0);

      if (Array.isArray(items) && items.length > 0) {
        return items;
      }
      // If shape returned a single object (rare), normalize to array
      if (!Array.isArray(items) && items) {
        return [items];
      }
    } catch (e) {
      console.log('[projects fetch error]', q, String(e));
    }
  }

  // Final fallback: fetch all and filter client-side by user_id
  try {
    const url = `${API_BASE}/api/projects`;
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (res.ok) {
      const json = await res.json();
      const items = extractItems(json) ?? [];
      const filtered = items.filter((it: any) => {
        const val = it.user_id || it.userId || it.uid;
        return val === uid;
      });
      console.log('[projects fetch] fallback(all) ->', filtered.length);
      return filtered;
    }
  } catch (e) {
    console.log('[projects fetch error] fallback(all)', String(e));
  }

  return [];
}

const API_BASE =
  process.env.EXPO_PUBLIC_WEBHOOKS_BASE_URL ||
  'https://diy-genie-webhooks-tyekowalski.replit.app';

type FetchProjOpts = { signal?: AbortSignal; timeoutMs?: number };

export async function fetchProjectById(id: string, opts: FetchProjOpts = {}) {
  const controller = opts.signal ? null : new AbortController();
  const signal = opts.signal ?? controller!.signal;
  const timeoutMs = opts.timeoutMs ?? 8000;

  let to: any;
  if (!opts.signal) {
    to = setTimeout(() => controller?.abort(), timeoutMs);
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/projects/${encodeURIComponent(id)}`,
      { signal, headers: { accept: 'application/json' } }
    );
    if (!res.ok) throw new Error(`PROJECT_FETCH_FAILED:${res.status}`);
    const json = await res.json();
    return (json as any).item || (json as any).project || json;
  } finally {
    if (to) clearTimeout(to);
  }
}

export async function pollProjectReady(projectId: string, opts = { tries: 40, interval: 2000 }) {
  for (let i = 0; i < opts.tries; i++) {
    const item = await fetchProjectById(projectId).catch(() => null);
    const ready = item?.status === 'ready' || !!item?.plan;
    if (ready) return { ok: true, item };
    await new Promise(r => setTimeout(r, opts.interval));
  }
  return { ok: false };
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
  return { scanId: data.id as string, imageUrl: data.image_url as string };
}

export async function fetchProjectPlanMarkdown(
  projectId: string,
  opts: { signal?: AbortSignal; tolerate409?: boolean } = {}
): Promise<string | null> {
  const base =
    (global as any).__API_BASE_URL__ ??
    process.env.EXPO_PUBLIC_WEBHOOKS_BASE_URL ??
    process.env.EXPO_PUBLIC_BASE_URL ??
    process.env.API_BASE ??
    'https://diy-genie-webhooks-tyekowalski.replit.app';

  const url = `${base}/api/projects/${projectId}/plan`;
  const res = await fetch(url, { method: 'GET', signal: opts?.signal } as any);
  
  if (res.status === 409) {
    console.log('[plan fetch] GET /api/projects/:id/plan status', 409);
    return opts.tolerate409 ? null : Promise.reject(Object.assign(new Error('PLAN_409'), { status: 409 }));
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.log('[plan fetch error]', res.status, text);
    throw new Error(`PLAN_FETCH_FAILED:${res.status}`);
  }
  const md = await res.text();
  return md || '';
}

export async function buildPlanWithoutPreview(projectId: string): Promise<boolean> {
  const base =
    (global as any).__API_BASE_URL__ ??
    process.env.EXPO_PUBLIC_WEBHOOKS_BASE_URL ??
    process.env.EXPO_PUBLIC_BASE_URL ??
    process.env.API_BASE ??
    'https://diy-genie-webhooks-tyekowalski.replit.app';
  const url = `${base}/api/projects/${projectId}/build-without-preview`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`build failed: ${res.status} ${t}`);
  }
  return true;
}

export async function requestProjectPreview(projectId: string) {
  // Always use DEV webhooks for preview while in development
  const dev = process.env.EXPO_PUBLIC_WEBHOOKS_DEV 
    ?? 'https://diy-genie-webhooks-tyekowalski.replit.app';
  const url = `${dev}/api/projects/${projectId}/preview`;
  try {
    const res = await fetch(url, { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    const ok = res.status >= 200 && res.status < 300;
    // Graceful fallback: treat 404/422 as "stub accepted" for dev
    const softOk = res.status === 404 || res.status === 422;
    return { ok: ok || softOk, status: res.status, body };
  } catch (e: any) {
    return { ok: false, status: 0, body: { error: String(e?.message || e) } };
  }
}

// Poll plan endpoint until it is available (or time out). Uses gentle backoff.
export async function waitForPlanReady(
  projectId: string,
  opts?: { totalMs?: number; stepMs?: number; maxStepMs?: number }
): Promise<string | null> {
  const totalMs = opts?.totalMs ?? 60000;       // wait up to 60s
  let stepMs = opts?.stepMs ?? 1200;            // start at 1.2s
  const maxStep = opts?.maxStepMs ?? 5000;      // cap at 5s
  const start = Date.now();
  while (Date.now() - start < totalMs) {
    const md = await fetchProjectPlanMarkdown(projectId).catch(() => null);
    if (md !== null) return md; // ready (even if empty string)
    await new Promise((r) => setTimeout(r, stepMs));
    // backoff a bit each loop
    stepMs = Math.min(Math.floor(stepMs * 1.35), maxStep);
  }
  return null; // timed out still not ready
}

// Unified loader for the user's projects — Webhooks (tries both userId & user_id), newest first
export async function fetchMyProjects(): Promise<any[]> {
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess?.session?.user?.id;
  if (!userId) throw new Error('AUTH_REQUIRED');

  const base =
    (global as any).__API_BASE_URL__ ??
    process.env.EXPO_PUBLIC_API_BASE ??
    process.env.API_BASE ??
    'https://diy-genie-webhooks-tyekowalski.replit.app';

  const urls = [
    `${base}/api/projects?userId=${encodeURIComponent(userId)}`,   // variant A
    `${base}/api/projects?user_id=${encodeURIComponent(userId)}`,  // variant B
  ];

  async function hit(u: string): Promise<any[]> {
    try {
      const res = await fetch(u, { method: 'GET' });
      if (!res.ok) return [];
      const body = await res.json().catch(() => null);
      const list = Array.isArray(body) ? body : body?.items ?? [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  const results = await Promise.all(urls.map(hit));
  const mergedById = new Map<string, any>();
  for (const arr of results) {
    for (const it of arr) {
      if (it?.id && !mergedById.has(it.id)) mergedById.set(it.id, it);
    }
  }

  const items = Array.from(mergedById.values());
  const toTime = (x: any) => {
    const ts = Date.parse(x?.updated_at || x?.created_at || '');
    return Number.isNaN(ts) ? 0 : ts;
  };
  items.sort((a, b) => toTime(b) - toTime(a));

  console.log(
    '[projects fetch webhooks] userId=%s → %d items (A=%d, B=%d)',
    userId,
    items.length,
    results[0]?.length ?? 0,
    results[1]?.length ?? 0
  );
  return items;
}

/**
 * Create a project and ALWAYS return a project ID, regardless of server response shape.
 * Throws with actionable error message on failure.
 */
export async function createProjectAndReturnId(payload: {
  name: string;
  description: string;
  budget: string;
  skill_level: string;
}): Promise<string> {
  const base = BASE;
  const res = await fetch(`${base}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch {}

  console.log('[createProject] status', res.status, 'body', body);

  // Accept all common shapes
  const id =
    body?.id ??
    body?.item?.id ??
    body?.project_id ??
    body?.project?.id ??
    body?.data?.id ??
    body?.data?.project_id;

  if (!res.ok || body?.ok === false) {
    throw new Error(`[createProject] ${res.status} ${body?.error ?? 'unknown_error'}`);
  }

  if (!id) {
    throw new Error(`[createProject] ok but no id in body: ${JSON.stringify(body)}`);
  }

  return String(id);
}
