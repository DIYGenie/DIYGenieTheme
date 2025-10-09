import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const KEY = 'new_project_draft_v1';

const API_BASE =
  process.env.EXPO_PUBLIC_WEBHOOKS_BASE_URL ||
  'https://diy-genie-webhooks-tyekowalski.replit.app';

export type NewProjectDraft = {
  title?: string;
  description?: string;
  budget?: string;
  skill?: string;
};

export type DraftLike = {
  projectId?: string;
  name?: string;
  budget?: string | number;
  skill_level?: string;
  title?: string;
};

export async function saveDraft(d: NewProjectDraft) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(d)); } catch {}
}

export async function loadDraft(): Promise<NewProjectDraft> {
  try { const s = await AsyncStorage.getItem(KEY); return s ? JSON.parse(s) : {}; } catch { return {}; }
}

export async function clearDraft() { try { await AsyncStorage.removeItem(KEY); } catch {} }

export async function ensureProjectForDraft(draft: DraftLike): Promise<string> {
  if (draft.projectId) return draft.projectId;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const uid = data?.session?.user?.id;
  if (!uid) throw new Error('AUTH_REQUIRED');

  const body = {
    user_id: uid,
    name: draft?.name ?? draft?.title ?? 'Untitled project',
    budget: draft?.budget ?? '',
    skill_level: draft?.skill_level ?? '',
  };

  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PROJECT_CREATE_FAILED:${res.status}`);
  const json = await res.json();
  const id = json?.item?.id || json?.project?.id || json?.id;
  if (!id) throw new Error('PROJECT_ID_MISSING');
  return String(id);
}
