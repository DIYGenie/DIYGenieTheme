// app/lib/draft.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE as base } from './api'; // existing base URL helper

const DRAFT_KEY = 'newProjectDraft:v1';

export type NewProjectDraft = {
  projectId?: string | null;
  name?: string;
  description?: string;
  budget?: string | null;          // '$' | '$$' | '$$$'
  skill_level?: string | null;     // 'Beginner' | 'Intermediate' | 'Advanced'
};

export async function loadNewProjectDraft(): Promise<NewProjectDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveNewProjectDraft(draft: NewProjectDraft): Promise<void> {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft ?? {}));
}

export async function clearNewProjectDraft(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_KEY);
}

// --- helpers for name cleanup ---
function collapseSpaces(s: string) {
  return (s || '').replace(/\s+/g, ' ').trim();
}
export function sanitizeProjectName(raw: string) {
  // trim + collapse
  const trimmed = collapseSpaces(raw);
  // strip emojis / control chars
  const basic = trimmed.normalize('NFKD').replace(/[^\w\s\-.']/g, '');
  // whitelist: letters/numbers/space/._-'
  const whitelisted = basic.replace(/[^A-Za-z0-9 _.\-']/g, '');
  // collapse again and bound length
  let safe = collapseSpaces(whitelisted).slice(0, 60);
  // avoid leading/trailing punctuation
  safe = safe.replace(/^[\s._'\-]+/, '').replace(/[\s._'\-]+$/, '');
  return safe;
}
function nameLooksValid(name: string) {
  const s = (name || '').trim();
  return s.length >= 3 && s.length <= 60 && /[A-Za-z0-9]/.test(s);
}

// ---------- NEW: strong validation + project create ----------
function validateDraftForCreate(d: NewProjectDraft) {
  const errs: string[] = [];
  const name = (d.name ?? '').trim();
  const description = (d.description ?? '').trim();
  const budget = (d.budget ?? '').trim();
  const skill = (d.skill_level ?? '').trim();

  if (name.length < 3) errs.push('Title must be at least 3 characters.');
  if (description.length < 10) errs.push('Description must be at least 10 characters.');
  if (!['$', '$$', '$$$'].includes(budget)) errs.push('Choose a budget ($, $$, $$$).');
  if (!['Beginner', 'Intermediate', 'Advanced'].includes(skill)) errs.push('Choose a skill level.');
  return { ok: errs.length === 0, errs, name, description, budget, skill };
}

/**
 * Ensure a server project exists for this draft.
 * Returns projectId. Never clears the draft.
 */
export async function ensureProjectForDraft(draft: NewProjectDraft): Promise<string> {
  if (draft?.projectId) return draft.projectId as string;

  const v = validateDraftForCreate(draft ?? {});
  if (!v.ok) {
    const message = v.errs.join('\n');
    const e: any = new Error('VALIDATION_FAILED');
    e.userMessage = message;
    throw e;
  }

  // Build payload (with sanitized name)
  let cleanName = sanitizeProjectName(v.name);
  const payload = {
    name: cleanName,
    description: v.description.trim(),
    budget: v.budget,
    skill_level: v.skill,
  };
  console.log('[project create] payload', payload);

  async function postOnce(p: typeof payload) {
    const res = await fetch(`${base}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    const text = await res.text().catch(() => '');
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { res, body, text };
  }

  // First attempt
  let { res, body } = await postOnce(payload);

  // If invalid_name, try one automatic repair and post again
  if (res.status === 422 && (body?.error === 'invalid_name' || /invalid[_\s-]?name/i.test(String(body)))) {
    const repaired = sanitizeProjectName(cleanName);
    if (repaired !== cleanName && nameLooksValid(repaired)) {
      console.log('[project create] retry with sanitized name', { repaired });
      ({ res, body } = await postOnce({ ...payload, name: repaired }));
      cleanName = repaired;
    }
  }

  if (!res.ok) {
    console.log('[project create] failed', { status: res.status, body });
    const detail =
      body?.userMessage ||
      body?.message ||
      body?.error ||
      body?.detail ||
      `HTTP ${res.status}`;
    const e: any = new Error(`PROJECT_CREATE_FAILED:${res.status}`);
    if (res.status === 422 && (body?.error === 'invalid_name')) {
      e.userMessage = 'Project title has characters the server does not accept. Use letters, numbers, spaces, and -_. (3–60 chars).';
    } else {
      e.userMessage = String(detail);
    }
    throw e;
  }

  const id = body?.id || body?.project?.id || body?.data?.id;
  if (!id) {
    const e: any = new Error('PROJECT_CREATE_FAILED:NO_ID');
    e.userMessage = 'Server did not return a project id.';
    throw e;
  }

  // Persist sanitized name + id back into draft
  const nextDraft: NewProjectDraft = { ...(draft ?? {}), projectId: id, name: cleanName };
  await saveNewProjectDraft(nextDraft);
  console.log('[project create] success', { id, name: cleanName });
  return id;
}
