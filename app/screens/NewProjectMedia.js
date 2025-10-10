import React, { useState } from 'react';
import { View, Pressable, Text, Image, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { ensureProjectForDraft } from '../lib/draft';

export default function NewProjectMedia(props) {
  const {
    draft = {},
    onDraftChange = () => {},
    isFormValid = false,
    onBlocked = () => {},
  } = props;

  const [savedScan, setSavedScan] = useState(null);
  console.log('[NPMedia] vFINAL (js) render', { hasSavedScan: !!savedScan });

  const guard = (fn) => () => {
    if (!isFormValid) { onBlocked?.(); return; }
    fn && fn();
  };

  async function authPreflight() {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (!user) {
      Alert.alert('Session expired', 'Please sign in again.');
      await supabase.auth.signOut();
      throw new Error('AUTH_REQUIRED');
    }
    return user;
  }

  const handleScan = guard(async () => {
    Alert.alert('AR Scan', 'AR scan coming soon.');
  });

  const handleUpload = guard(async () => {
    try {
      await authPreflight();
      const projectId = await ensureProjectForDraft(draft);
      if (!draft?.projectId) onDraftChange({ ...draft, projectId });

      const { uploadRoomScan } = await import('../lib/uploadRoomScan');
      const result = await uploadRoomScan();
      if (!result?.scanId) { Alert.alert('Upload failed', 'Try again.'); return; }

      await supabase.from('room_scans').update({ project_id: projectId }).eq('id', result.scanId);

      setSavedScan({ ...result, projectId, source: 'upload' });
      Alert.alert('Success', 'Scan saved to project!');
    } catch (e) {
      if (String(e?.message || e).includes('AUTH_REQUIRED')) return;
      console.log('[upload/link failed]', e);
      Alert.alert('Upload failed', 'Please try again.');
    }
  });

  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      <Pressable
        onPress={handleScan}
        style={{
          backgroundColor: isFormValid ? '#7C3AED' : '#C7C7C7',
          padding: 14, borderRadius: 14, alignItems: 'center',
          opacity: isFormValid ? 1 : 0.7,
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Scan room</Text>
      </Pressable>

      <Pressable
        onPress={handleUpload}
        style={{
          backgroundColor: isFormValid ? '#7C3AED' : '#C7C7C7',
          padding: 14, borderRadius: 14, alignItems: 'center',
          opacity: isFormValid ? 1 : 0.7,
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Upload Photo</Text>
      </Pressable>

      {savedScan && (
        <View style={{ marginTop: 16, backgroundColor: '#F3F0FF', borderRadius: 16, padding: 12, alignItems: 'center' }}>
          <Image source={{ uri: savedScan.imageUrl }} style={{ width: 220, height: 140, borderRadius: 12 }} resizeMode="cover" />
          <Text style={{ marginTop: 8, fontWeight: '600' }}>
            {savedScan?.source === 'upload' ? 'Saved photo' : 'Saved scan'}
          </Text>
          <Text style={{ marginTop: 8, color: '#6B7280', fontSize: 13, textAlign: 'center' }}>
            {savedScan?.source === 'upload'
              ? 'AR tools appear after Scan room (coming soon).'
              : 'Tools appear when you use Scan room.'}
          </Text>
        </View>
      )}
    </View>
  );
}
