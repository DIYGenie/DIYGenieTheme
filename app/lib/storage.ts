/**
 * Supabase Storage helper for image uploads
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, UPLOADS_BUCKET } from '../config';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Convert local URI to Blob for upload
 * Works on both web and mobile via fetch
 */
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}

/**
 * Upload an image to Supabase Storage and return its public URL
 * 
 * @param localUri - Local file URI from image picker
 * @param projectId - Project ID for organizing uploads
 * @returns Public URL of the uploaded image
 */
export async function uploadImageAsync(
  localUri: string,
  projectId: string
): Promise<string> {
  try {
    // Generate unique file path
    const timestamp = Date.now();
    const filePath = `projects/${projectId}/${timestamp}.jpg`;

    // Convert local URI to Blob
    const blob = await uriToBlob(localUri);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(UPLOADS_BUCKET)
      .upload(filePath, blob, {
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('Upload succeeded but no data returned');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(UPLOADS_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image');
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error('Image upload error:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to upload image: ${error.message}`
        : 'Failed to upload image - please try again'
    );
  }
}
