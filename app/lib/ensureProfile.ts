import { SupabaseClient } from '@supabase/supabase-js';

export async function ensureProfile(supabase: SupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    throw new Error(`Failed to check profile: ${selectError.message}`);
  }

  if (!existing) {
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: user.id });

    if (upsertError) {
      throw new Error(`Failed to create profile: ${upsertError.message}`);
    }
  }
}
