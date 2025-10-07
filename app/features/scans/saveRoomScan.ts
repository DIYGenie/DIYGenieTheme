import * as FileSystem from 'expo-file-system';
import { supabase } from '../../lib/supabase';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Platform } from 'react-native';

type SaveArgs = {
  uri: string;
  source: 'scan' | 'upload';
  projectId?: string | null;
  userId?: string | null;
};

export async function saveRoomScan({ uri, source, projectId = null, userId = null }: SaveArgs) {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const fileBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const file = new Blob([fileBytes], { type: 'image/jpeg' });

  const id = uuidv4();
  const path = `projects/${projectId ?? 'unassigned'}/${id}.jpg`;

  const { error: upErr } = await supabase.storage.from('room-scans').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'image/jpeg',
  });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from('room-scans').getPublicUrl(path);
  const image_url = pub?.publicUrl ?? null;

  const meta = {
    source,
    device: Platform.OS,
    uri,
    uploaded_path: path,
  };
  const payload = {
    id,
    user_id: userId ?? null,
    project_id: projectId,
    image_url,
    raw_scan_url: null,
    dimensions: null,
    scale_px_per_in: null,
    meta,
  };
  const { error: dbErr } = await supabase.from('room_scans').insert(payload);
  if (dbErr) throw dbErr;

  return { id, image_url, path };
}
