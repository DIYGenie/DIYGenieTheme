import { SupabaseClient } from '@supabase/supabase-js';

type CleanupArgs = {
  supabase: SupabaseClient;
  projectId: string;
  userId?: string | null;
};

async function deleteByPrefix(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string
) {
  try {
    const toRemove: string[] = [];

    // List files at this prefix (limit 1000)
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .list(prefix, { limit: 1000 });

    if (error || !data) return;

    for (const f of data) {
      if (f.name === '.' || f.name === '..') continue;
      
      // If it's a folder, recurse
      if (f.id === null && f.name && f.created_at === null) {
        // nested folder – call again
        await deleteByPrefix(supabase, bucket, `${prefix}/${f.name}`);
      } else {
        toRemove.push(`${prefix}/${f.name}`);
      }
    }

    // remove in batches of 100
    while (toRemove.length) {
      const batch = toRemove.splice(0, 100);
      const { error: remErr } = await supabase.storage.from(bucket).remove(batch);
      if (remErr) {
        // swallow; best-effort cleanup
        break;
      }
    }
  } catch {
    // best-effort; never throw
  }
}

export async function deleteProjectStorage({ supabase, projectId, userId }: CleanupArgs) {
  // Primary bucket where preview/input images live
  // We save under: uploads / projects/{projectId}/...
  await deleteByPrefix(supabase, 'uploads', `projects/${projectId}`);

  // Room scans bucket: folder naming varies; cover common prefixes safely
  // 1) user-scoped project folder: room-scans/{userId}/{projectId}/...
  if (userId) {
    await deleteByPrefix(supabase, 'room-scans', `${userId}/${projectId}`);
    // 2) some earlier builds may have only user folder – leave as-is to avoid nuking all user scans
  }

  // Best effort only; never throw
}
