import { API_BASE, joinUrl } from './api';

export async function softHealthCheck(base = API_BASE) {
  try {
    let url = joinUrl(base, 'health/full');
    let res = await fetch(url);
    if (res.status === 404) {
      url = joinUrl(base, 'api/health/full');
      res = await fetch(url);
    }
    if (!res.ok) return console.warn('[health] non-200', res.status);
    const json = await res.json();
    console.log('[health] ok', { modes: json?.modes, uptime_s: json?.uptime_s });
  } catch (e) {
    console.warn('[health] failed', String(e));
  }
}
