// app/lib/scanEvents.ts
import { supabase } from '../lib/supabase';

export type Roi = { x: number; y: number; w: number; h: number };

export async function saveArScan(opts: {
  projectId: string;
  roi?: Roi | null;
}): Promise<{ scanId: string; imageUrl?: string; source: 'ar' }> {
  const { projectId, roi } = opts;
  if (!projectId) throw new Error('PROJECT_ID_REQUIRED');

  console.log('[scan] saveArScan start', { projectId, roi, source: 'ar' });

  const { data, error } = await supabase
    .from('room_scans')
    .insert([{
      project_id: projectId,
      source: 'ar',
      roi: roi ?? null,     // JSONB column
      image_url: null       // no image from AR
      // user_id is DB default (auth.uid())
    }])
    .select('id, image_url')
    .single();

  if (error) {
    console.log('[scan] save failed', error.message);
    throw error;
  }

  return { scanId: data.id, imageUrl: data.image_url, source: 'ar' };
}

export async function requestPreviewIfEligible(projectId: string): Promise<void> {
  console.log('[preview] stub: checking eligibility for project', projectId);
  console.log('[preview] stub: would kick off AI preview job here if subscribed');
}
