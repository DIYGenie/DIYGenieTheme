import React, { useState } from 'react';
import { View, Text, Alert, Image, Pressable } from 'react-native';
import { supabase } from '../lib/supabase';
import { ensureProjectForDraft } from '../lib/draft';
import RoiModal from '../components/RoiModal';
import MeasureModal from '../components/MeasureModal';

export default function NewProjectMedia(props) {
  const { draft, onDraftChange, isFormValid, onBlocked } = props;
  const [savedScan, setSavedScan] = useState(null);
  const [showRoi, setShowRoi] = useState(false);
  const [showMeasure, setShowMeasure] = useState(false);

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

  const guard = (fn) => () => {
    if (!isFormValid) {
      onBlocked?.();
      return;
    }
    fn && fn();
  };

  const handleUpload = guard(async () => {
    try {
      await authPreflight();

      // 1) Ensure there is a project for this draft
      const projectId = await ensureProjectForDraft(draft);
      if (!draft?.projectId) {
        onDraftChange?.({ ...draft, projectId });
      }

      // 2) Perform the upload
      const { uploadRoomScan } = await import('../lib/uploadRoomScan');
      const result = await uploadRoomScan(); // keep existing picker flow
      if (!result?.scanId) {
        Alert.alert('Upload failed', 'Try again.');
        return;
      }

      // 3) Link the scan to the project (authoritative association)
      await supabase
        .from('room_scans')
        .update({ project_id: projectId })
        .eq('id', result.scanId);

      // NOTE: uploads are non-AR; disable measurement in UI for V1
      setSavedScan({
        ...result,
        projectId,
        source: 'upload',
        allowMeasure: false, // <-- key flag the UI will read
      });
      Alert.alert('Success', 'Scan saved to project!');
    } catch (e) {
      console.log('[upload/link failed]', e);
      // authPreflight already shows an alert for auth issues
      if (String(e?.message || e).includes('AUTH_REQUIRED')) return;
      Alert.alert('Upload failed', 'Please try again.');
    }
  });

  const handleScan = guard(async () => {
    Alert.alert('AR Scan', 'AR scan coming soon!');
  });

  // Helper: only AR scans (future) can measure; uploads cannot.
  const canMeasure =
    !!savedScan &&
    (savedScan.allowMeasure === true || savedScan.source === 'ar'); // strict

  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      {/* Scan / Upload */}
      <Pressable
        onPress={handleScan}
        style={{
          backgroundColor: isFormValid ? '#7C3AED' : '#C7C7C7',
          padding: 14,
          borderRadius: 14,
          alignItems: 'center',
          opacity: isFormValid ? 1 : 0.7,
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Scan Room</Text>
      </Pressable>

      <Pressable
        onPress={handleUpload}
        style={{
          backgroundColor: isFormValid ? '#7C3AED' : '#C7C7C7',
          padding: 14,
          borderRadius: 14,
          alignItems: 'center',
          opacity: isFormValid ? 1 : 0.7,
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Upload Photo</Text>
      </Pressable>

      {/* Saved Scan Card (single-scan mode) */}
      {savedScan && (
        <View
          style={{
            marginTop: 16,
            backgroundColor: '#F3F0FF',
            borderRadius: 16,
            padding: 12,
            alignItems: 'center',
          }}
        >
          <Image
            source={{ uri: savedScan.imageUrl }}
            style={{ width: 220, height: 140, borderRadius: 12 }}
            resizeMode="cover"
          />
          <Text style={{ marginTop: 8, fontWeight: '600' }}>Saved Scan</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <Pressable
              onPress={() => setShowRoi(true)}
              style={{ backgroundColor: '#7C3AED', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Mark Area</Text>
            </Pressable>
            {canMeasure ? (
              <Pressable
                onPress={() => setShowMeasure(true)}
                style={{ backgroundColor: '#7C3AED', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Measure</Text>
              </Pressable>
            ) : null}
          </View>
          {!canMeasure ? (
            <Text style={{ marginTop: 8, color: '#6B7280', fontSize: 13, textAlign: 'center' }}>
              Measurements are available when you use <Text style={{ fontWeight: '700' }}>Scan room</Text>.
            </Text>
          ) : null}
        </View>
      )}

      <RoiModal visible={showRoi} onClose={() => setShowRoi(false)} scan={savedScan} />
      {/* Only mount MeasureModal when allowed, so it cannot appear via state glitches */}
      {canMeasure ? (
        <MeasureModal visible={showMeasure} onClose={() => setShowMeasure(false)} scan={savedScan} />
      ) : null}
    </View>
  );
}
