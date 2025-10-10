// app/lib/scanEvents.ts
import { supabase } from '../lib/supabase';
import { requestScanMeasurement } from './api';
import { MEASURE_API_ENABLED } from './config';

export type Roi = { x: number; y: number; w: number; h: number };

export async function startMeasurementJob(projectId: string, scanId: string) {
  if (!MEASURE_API_ENABLED) {
    console.log('[measure] skipped (feature disabled)');
    return;
  }
  
  try {
    console.log('[measure] start', { projectId, scanId });
    const result = await requestScanMeasurement(projectId, scanId);
    if (result.ok) {
      console.log('[measure] started');
    } else {
      console.log('[measure] skipped (feature disabled)');
    }
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

  // Trigger measurement job only if enabled (non-blocking)
  if (MEASURE_API_ENABLED) {
    setTimeout(() => startMeasurementJob(projectId, data.id).catch(() => {}), 0);
  } else {
    console.log('[measure] skipped (feature disabled)');
  }

  return { scanId: data.id, imageUrl: data.image_url, source: 'ar' };
}

export async function requestPreviewIfEligible(projectId: string): Promise<void> {
  console.log('[preview] stub: checking eligibility for project', projectId);
  console.log('[preview] stub: would kick off AI preview job here if subscribed');
}
