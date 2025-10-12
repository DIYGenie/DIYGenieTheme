import { API_BASE } from './api';

export async function softHealthCheck(base = API_BASE) {
  try {
    const res = await fetch(`${base}/health/full`, { method: 'GET' });
    if (!res.ok) return console.warn('[health] non-200', res.status);
    const json = await res.json();
    console.log('[health] ok', { modes: json?.modes, uptime_s: json?.uptime_s });
  } catch (e) {
    console.warn('[health] failed', String(e));
  }
}
