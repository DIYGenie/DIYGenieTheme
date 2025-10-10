import { supabase } from './supabase';

export async function saveArScan(opts: {
  projectId: string;
  imageUrl?: string;
  roi?: { x: number; y: number; w: number; h: number };
}): Promise<{ scanId: string; imageUrl?: string; source: 'ar' }> {
  if (!opts.projectId) throw new Error('PROJECT_ID_REQUIRED');
  
  const { projectId, imageUrl, roi } = opts;
  
  console.log('[scan] saveArScan start', { projectId, roi, source: 'ar' });

  const { data, error } = await supabase
    .from('room_scans')
    .insert([
      {
        project_id: projectId,
        source: 'ar',
        roi: roi || null,
        image_url: imageUrl || null,
      }
    ])
    .select('id, project_id, source, image_url, roi, created_at')
    .single();

  if (error) {
    console.log('[scan] save failed', error.message || error);
    throw error;
  }
  
  return { 
    scanId: data.id, 
    imageUrl: data.image_url ?? undefined, 
    source: 'ar' as const 
  };
}

export async function requestPreviewIfEligible(projectId: string): Promise<void> {
  console.log('[preview] stub: checking eligibility for project', projectId);
  console.log('[preview] stub: would kick off AI preview job here if subscribed');
}
