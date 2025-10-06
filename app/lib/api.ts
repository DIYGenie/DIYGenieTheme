export const BASE =
  (process.env.EXPO_PUBLIC_BASE_URL as string) || 'http://localhost:5000';

export async function api(path: string, init: RequestInit = {}) {
  const url = `${BASE}${path}`;
  const method = (init.method || 'GET').toUpperCase();
  const bodySent = init.body;
  
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  
  if (!res.ok) {
    console.error('API_ERROR', { 
      url, 
      method, 
      status: res.status, 
      bodySent, 
      payload: data 
    });
  }
  
  return { ok: res.ok, status: res.status, data };
}
