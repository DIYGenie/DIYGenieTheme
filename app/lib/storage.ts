/**
 * Supabase Storage helper for image uploads
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, UPLOADS_BUCKET } from '../config';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export supabase client for auth access
export { supabase };

/**
 * Detect mime type from file extension
 */
function guessMime(uri: string): string {
  if (uri.endsWith('.png') || uri.endsWith('.PNG')) return 'image/png';
  if (uri.endsWith('.jpg') || uri.endsWith('.JPG')) return 'image/jpeg';
  if (uri.endsWith('.jpeg') || uri.endsWith('.JPEG')) return 'image/jpeg';
  return 'image/jpeg'; // default
}

/**
 * Upload an image to Supabase Storage and return its public URL
 * 
 * @param projectId - Project ID for organizing uploads
 * @param fileUri - Local file URI from image picker
 * @returns Public URL of the uploaded image
 * @throws Error (not ApiError) on storage failures
 */
export async function uploadImageAsync(
  projectId: string,
  fileUri: string
): Promise<string> {
  const resp = await fetch(fileUri);
  const blob = await resp.blob();
  const contentType = guessMime(fileUri);

  const fileName = `${Date.now()}.${contentType === 'image/png' ? 'png' : 'jpg'}`;
  const path = `projects/${projectId}/${fileName}`;

  const { data, error } = await supabase
    .storage
    .from(UPLOADS_BUCKET)
    .upload(path, blob, { contentType, upsert: true });

  if (error) throw new Error(error.message);
  
  const { data: pub } = supabase.storage.from(UPLOADS_BUCKET).getPublicUrl(path);
  return pub?.publicUrl;
}
