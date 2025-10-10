import { supabase } from './supabase';

export async function saveArScan(opts: {
  projectId: string;
  imageUrl?: string;
  roi?: { x: number; y: number; w: number; h: number };
}): Promise<{ scanId: string }> {
  if (!opts.projectId) throw new Error('PROJECT_ID_REQUIRED');
  
  const { projectId, imageUrl, roi } = opts;

  const { data, error } = await supabase
    .from('room_scans')
    .insert({
      project_id: projectId,
      image_url: imageUrl || null,
      source: 'ar',
      meta: roi ? { roi } : null,
    })
    .select('id')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create AR scan');

  return { scanId: data.id };
}

export async function requestPreviewIfEligible(projectId: string): Promise<void> {
  console.log('[preview] stub: checking eligibility for project', projectId);
  console.log('[preview] stub: would kick off AI preview job here if subscribed');
}
