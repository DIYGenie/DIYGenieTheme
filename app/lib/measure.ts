import { supabase } from './supabase';

export async function setScanScalePxPerIn(scanId: string, scalePxPerIn: number) {
  const { error } = await supabase
    .from('room_scans')
    .update({ scale_px_per_in: scalePxPerIn })
    .eq('id', scanId);
  if (error) throw error;
  return true;
}

export type LinePoint = { x: number; y: number };

export async function saveLineMeasurement(opts: {
  scanId: string;
  regionId?: string | null;
  points: LinePoint[];
  valueInches: number;
  unit?: string;
}) {
  const { data, error } = await supabase
    .from('room_scan_measurements')
    .insert({
      scan_id: opts.scanId,
      region_id: opts.regionId ?? null,
      tool: 'line',
      points: opts.points,
      value: opts.valueInches,
      unit: opts.unit ?? 'in',
      meta: {},
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getScanScalePxPerIn(scanId: string) {
  const { data, error } = await supabase
    .from('room_scans')
    .select('scale_px_per_in')
    .eq('id', scanId)
    .single();
  if (error) throw error;
  return (data?.scale_px_per_in ?? null) as number | null;
}
