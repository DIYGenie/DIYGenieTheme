/**
 * Supabase Storage helper for image uploads
 */

import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
  return uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
}

/**
 * Pick an image from the device gallery
 * Uses new API that works on web & native
 * 
 * @returns URI string or null if cancelled
 */
export async function pickImageAsync(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images' as any,
    quality: 0.9,
    allowsEditing: false,
  });
  if (result.canceled) return null;
  return result.assets?.[0]?.uri ?? null;
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
  const contentType = guessMime(fileUri);
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const fileName = `${Date.now()}.${ext}`;
  const path = `projects/${projectId}/${fileName}`;

  const resp = await fetch(fileUri);
  const blob = await resp.blob();

  const file = Platform.OS === 'web'
    ? new File([blob], fileName, { type: contentType })
    : blob;

  const { error } = await supabase
    .storage
    .from(UPLOADS_BUCKET)
    .upload(path, file as any, { contentType, upsert: true });

  if (error) throw new Error(error.message);
  
  const { data: pub } = supabase.storage.from(UPLOADS_BUCKET).getPublicUrl(path);
  return pub?.publicUrl;
}
