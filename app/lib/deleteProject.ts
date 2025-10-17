import { supabase } from './supabase';
import { WEBHOOKS_BASE } from './env';
import { track } from './track';

/**
 * Delete a project via API only
 */
export async function deleteProjectDeep(
  projectId: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    // Get auth token and userId from Supabase session
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const userId = sessionData?.session?.user?.id;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Delete via API only
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const res = await fetch(`${WEBHOOKS_BASE}/api/projects/${encodeURIComponent(projectId)}`, {
        method: 'DELETE',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (res.ok || res.status === 204) {
        // Track successful deletion
        if (userId) {
          await track({ userId, event: 'delete_project', projectId });
        }
        return { ok: true };
      }

      // API failed - return error without fallback
      return {
        ok: false,
        message: `Delete failed (${res.status})`,
      };
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr?.name === 'AbortError') {
        return { ok: false, message: 'Delete timeout' };
      }
      throw fetchErr;
    }
  } catch (e: any) {
    return {
      ok: false,
      message: e?.message || 'Delete failed',
    };
  }
}
