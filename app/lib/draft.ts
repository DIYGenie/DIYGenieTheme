import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'new_project_draft_v1';

export type NewProjectDraft = {
  description?: string;
  budget?: string;
  skill?: string;
};

export async function saveDraft(d: NewProjectDraft) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(d)); } catch {}
}

export async function loadDraft(): Promise<NewProjectDraft> {
  try { const s = await AsyncStorage.getItem(KEY); return s ? JSON.parse(s) : {}; } catch { return {}; }
}

export async function clearDraft() { try { await AsyncStorage.removeItem(KEY); } catch {} }
