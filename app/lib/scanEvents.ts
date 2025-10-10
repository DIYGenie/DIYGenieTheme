// app/lib/scanEvents.ts
import { supabase } from '../lib/supabase';
import { requestScanMeasurement } from './api';

export type Roi = { x: number; y: number; w: number; h: number };

export async function startMeasurementJob(projectId: string, scanId: string) {
  try {
    console.log('[measure] start', { projectId, scanId });
    await requestScanMeasurement(projectId, scanId);
    console.log('[measure] started');
  } catch (e: any) {
    console.log('[measure] start failed', e?.message || e);
  }
}

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

  // Trigger measurement job (non-blocking)
  setTimeout(() => startMeasurementJob(projectId, data.id).catch(() => {}), 0);

  return { scanId: data.id, imageUrl: data.image_url, source: 'ar' };
}

export async function requestPreviewIfEligible(projectId: string): Promise<void> {
  console.log('[preview] stub: checking eligibility for project', projectId);
  console.log('[preview] stub: would kick off AI preview job here if subscribed');
}
