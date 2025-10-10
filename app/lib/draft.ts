import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const KEY = 'new_project_draft_v1';
const DRAFT_KEY = 'newProjectDraft:v1';

const API_BASE =
  process.env.EXPO_PUBLIC_WEBHOOKS_BASE_URL ||
  'https://diy-genie-webhooks-tyekowalski.replit.app';

export type NewProjectDraft = {
  projectId?: string | null;
  name?: string;
  description?: string;
  budget?: any; // can be "$$", number, etc — normalize when posting
  skill_level?: string | null;
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

export async function loadNewProjectDraft(): Promise<NewProjectDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveNewProjectDraft(draft: NewProjectDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft ?? {}));
  } catch {
    // ignore
  }
}

export async function clearNewProjectDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function normalizeBudget(b: any) {
  // Accept "$", "$$", "$$$", numbers, strings — send as-is if truthy
  if (b == null) return null;
  if (typeof b === 'number') return b;
  const s = String(b).trim();
  return s.length ? s : null;
}

export async function ensureProjectForDraft(draft: DraftLike | NewProjectDraft): Promise<string> {
  // 1) reuse if present
  if (draft?.projectId) return draft.projectId;

  // 2) session required
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess?.session?.user?.id;
  if (!userId) throw new Error('AUTH_REQUIRED');

  // 3) validate inputs (tight but user-friendly)
  const name = (draft?.name ?? (draft as any)?.title ?? '').trim();
  const skill = (draft?.skill_level ?? '').trim();
  const budget = normalizeBudget(draft?.budget);
  if (name.length < 3 || !skill || !budget) {
    const e: any = new Error('VALIDATION_FAILED');
    e.details = { nameLen: name.length, hasSkill: !!skill, hasBudget: !!budget };
    throw e;
  }

  // 4) create via Webhooks with small retry (handles transient 5xx)
  const payload = { user_id: userId, name, budget, skill_level: skill };
  async function postOnce() {
    const res = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok || !json?.item?.id) {
      const err: any = new Error(json?.error || `PROJECT_CREATE_FAILED:${res.status}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json.item.id as string;
  }

  try {
    const id = await postOnce();
    // persist projectId into draft storage (best effort)
    await saveNewProjectDraft({ ...(draft || {}), projectId: id });
    return id;
  } catch (e: any) {
    // single retry for transient issues only
    if (String(e?.status || '').startsWith('5')) {
      const id = await postOnce();
      await saveNewProjectDraft({ ...(draft || {}), projectId: id });
      return id;
    }
    throw e;
  }
}

export async function ensureProjectIdAndPersist(draft: NewProjectDraft): Promise<string> {
  const id = await ensureProjectForDraft(draft);
  // double-save to be safe
  await saveNewProjectDraft({ ...(draft || {}), projectId: id });
  return id;
}
