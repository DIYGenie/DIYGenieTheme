import { supabase } from './supabase';
import { API_BASE } from './api';
import { log } from './logger';
import { deleteProjectStorage } from './storageCleanup';

/**
 * Lightweight telemetry helper - logs events best-effort
 */
export async function safeLogEvent(name: string, props?: any) {
  try {
    // Best-effort telemetry - could insert into a telemetry table if it exists
    // For now, just console log
    log(`[event:${name}]`, props || {});
    
    // Optional: Insert into telemetry table if it exists
    try {
      const eventData = {
        event_name: name,
        event_props: props || {},
        created_at: new Date().toISOString(),
      };
      
      // Try to insert but don't fail if table doesn't exist
      await supabase.from('events').insert([eventData]);
    } catch {
      // Silently ignore if events table doesn't exist
    }
  } catch (e) {
    // Silently ignore all errors
  }
}

/**
 * Delete a project and all its associated resources
 * First tries the backend API, falls back to Supabase if needed
 */
export async function deleteProjectDeep(
  projectId: string
): Promise<{ ok: boolean; usedApi: boolean; message?: string }> {
  let usedApi = false;

  // Step 1: Try to delete via backend API
  try {
    const url = `${API_BASE}/api/projects/${encodeURIComponent(projectId)}`;
    log('[delete] trying API', url);
    
    // Get auth token from Supabase session
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Use 10s timeout for delete
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (res.ok || res.status === 204) {
        log('[delete] API success');
        usedApi = true;
        await safeLogEvent('project_deleted', { projectId, usedApi: true });
        return { ok: true, usedApi: true };
      }

      if (res.status === 404) {
        log('[delete] API 404, falling back to Supabase');
      } else {
        log('[delete] API failed with status', res.status);
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr?.name === 'AbortError') {
        log('[delete] API timeout (10s), falling back to Supabase');
      } else {
        throw fetchErr;
      }
    }
  } catch (e) {
    log('[delete] API error, falling back to Supabase', e);
  }

  // Step 2: Fallback to Supabase direct deletion
  try {
    log('[delete] using Supabase fallback');

    // Get userId from session for storage cleanup
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;

    // Step 2a: Storage cleanup (best-effort)
    await deleteProjectStorage({ supabase, projectId, userId });

    // Step 2b: Delete DB row (FKs/ON DELETE CASCADE will handle children)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      console.error('[delete] failed to delete project', deleteError);
      return {
        ok: false,
        usedApi: false,
        message: deleteError.message || 'Failed to delete project',
      };
    }

    log('[delete] Supabase success');
    await safeLogEvent('project_deleted', { projectId, usedApi: false });
    return { ok: true, usedApi: false };
  } catch (e: any) {
    console.error('[delete] Supabase fallback failed', e);
    return {
      ok: false,
      usedApi: false,
      message: e?.message || 'Failed to delete project',
    };
  }
}
