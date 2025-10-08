import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { Platform } from 'react-native';

type Args = {
  uri: string;
  userId: string;
  projectId?: string | null;
};

export async function uploadRoomScan({ uri, userId, projectId = null }: Args) {
  // 1) Make a stable id and storage path
  const scanId = Crypto.randomUUID();
  const path = `${userId}/${scanId}.jpg`;

  // 2) Turn the local file into a Blob for supabase-js
  const res = await fetch(uri);
  const blob = await res.blob();

  // 3) Upload to storage
  const { error: upErr } = await supabase
    .storage
    .from('room-scans')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

  if (upErr) throw upErr;

  // 4) Get a public URL (bucket policy already set)
  const { data: pub } = supabase.storage.from('room-scans').getPublicUrl(path);
  const imageUrl = pub?.publicUrl ?? null;

  // 5) Basic dimensions if available (best-effort)
  let width: number | null = null;
  let height: number | null = null;
  try {
    // iOS/Android: Image.getSize needs a network URL; this may fail silently on some dev tunnels.
    // That's okay—dimensions are optional and can be filled later by a server job.
    const sizeRes = await fetch(imageUrl!);
    // If you want real dimensions later, we'll add an Image.getSize step on-device once it's in the cache.
  } catch {}

  // 6) Insert DB row
  const { error: dbErr } = await supabase.from('room_scans').insert([{
    id: scanId,
    user_id: userId,
    project_id: projectId,
    image_url: imageUrl,
    raw_scan_url: null,
    dimensions: width && height ? { width, height } : null,
    scale_px_per_in: null,
    meta: {
      source: 'camera',
      platform: Platform.OS,
    }
  }]);

  if (dbErr) throw dbErr;

  return { scanId, imageUrl, path };
}
