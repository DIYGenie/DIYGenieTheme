import { supabase } from './supabase';

export type Pt = { x: number; y: number };

export async function saveRoomScanRegion(params: {
  scanId: string;
  points: Pt[];               // 0..1 normalized TL, TR, BR, BL
  label?: string | null;
}) {
  const row = {
    scan_id: params.scanId,
    points: params.points,
    kind: 'focus_area',
    label: params.label ?? 'Area 1',
    normalized: true,
    meta: {},
  };

  const { data, error } = await supabase
    .from('room_scan_regions')
    .insert(row)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
