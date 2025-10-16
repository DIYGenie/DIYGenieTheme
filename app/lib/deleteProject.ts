import { supabase } from './supabase';
import { API_BASE } from './api';

/**
 * Lightweight telemetry helper - logs events best-effort
 */
export async function safeLogEvent(name: string, props?: any) {
  try {
    // Best-effort telemetry - could insert into a telemetry table if it exists
    // For now, just console log
    console.log(`[event:${name}]`, props || {});
    
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
    console.log('[delete] trying API', url);
    
    // Get auth token from Supabase session
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (res.ok || res.status === 204) {
      console.log('[delete] API success');
      usedApi = true;
      await safeLogEvent('project_deleted', { projectId, usedApi: true });
      return { ok: true, usedApi: true };
    }

    if (res.status === 404) {
      console.log('[delete] API 404, falling back to Supabase');
    } else {
      console.log('[delete] API failed with status', res.status);
    }
  } catch (e) {
    console.log('[delete] API error, falling back to Supabase', e);
  }

  // Step 2: Fallback to Supabase direct deletion
  try {
    console.log('[delete] using Supabase fallback');

    // Fetch the project directly from Supabase to get media paths
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (fetchError || !project) {
      console.log('[delete] project not found', fetchError);
      return { ok: false, usedApi: false, message: 'Project not found' };
    }

    // Step 2a: Delete media from storage buckets (best-effort)
    const mediaPaths = [
      project.image,
      project.preview_url,
      project.scan_url,
      project.scan?.image_url,
    ].filter(Boolean);

    for (const path of mediaPaths) {
      if (!path || typeof path !== 'string') continue;

      try {
        let bucket: string | null = null;
        let filePath = path;

        // Determine bucket based on path
        if (path.includes('/uploads/')) {
          bucket = process.env.EXPO_PUBLIC_UPLOADS_BUCKET || 'uploads';
          // Extract just the filename after /uploads/
          const match = path.match(/\/uploads\/(.+)$/);
          if (match) filePath = match[1];
        } else if (path.includes('/room-scans/')) {
          bucket = 'room-scans';
          // Extract just the filename after /room-scans/
          const match = path.match(/\/room-scans\/(.+)$/);
          if (match) filePath = match[1];
        }

        if (bucket) {
          console.log('[delete] removing from storage', { bucket, filePath });
          await supabase.storage.from(bucket).remove([filePath]);
        }
      } catch (storageErr) {
        console.log('[delete] storage error (non-fatal)', storageErr);
      }
    }

    // Step 2b: Delete dependent rows (best-effort)
    try {
      // Delete from project_media if table exists
      await supabase.from('project_media').delete().eq('project_id', projectId);
    } catch {
      console.log('[delete] project_media table not found (ok)');
    }

    try {
      // Delete from room_scans if table exists
      await supabase.from('room_scans').delete().eq('project_id', projectId);
    } catch {
      console.log('[delete] room_scans table not found (ok)');
    }

    try {
      // Delete from progress tracking if exists
      await supabase.from('project_progress').delete().eq('project_id', projectId);
    } catch {
      console.log('[delete] project_progress table not found (ok)');
    }

    // Step 2c: Delete the main project record
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

    console.log('[delete] Supabase success');
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
