import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Modal, ActivityIndicator, ScrollView, Image, TouchableOpacity, Platform, AppState } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { api, apiRaw } from '../lib/api';

const USER_ID = (globalThis as any).__DEV_USER_ID__ || '00000000-0000-0000-0000-000000000001';

export default function NewProject({ navigation: navProp }: { navigation?: any }) {
  const navigation = useNavigation<any>();
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [ents, setEnts] = useState<{ previewAllowed: boolean; remaining?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyBuild, setBusyBuild] = useState(false);
  
  const [sugs, setSugs] = useState<any>(null);
  const [sugsBusy, setSugsBusy] = useState(false);
  const [sugsError, setSugsError] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const budgetOptions = ['$', '$$', '$$$'];
  const skillOptions = ['Beginner', 'Intermediate', 'Advanced'];

  const canPreview = ents?.previewAllowed ?? false;

  // Helper: robust navigation to a project detail, across nested navigators + web
  function goToProject(id: string) {
    // Try: Projects tab -> ProjectDetail
    try { navigation.navigate('Projects', { screen: 'ProjectDetail', params: { id } }); return; } catch {}
    // Try common standalone detail routes
    for (const name of ['ProjectDetail', 'OpenPlan', 'Plan', 'ProjectDetails', 'ProjectDetailScreen']) {
      try { navigation.navigate(name as never, { id } as never); return; } catch {}
    }
    // Fallback: go to Projects list
    try { navigation.navigate('Projects' as never); } catch {}

    // Web hard fallback: update URL if navigation didn't work (SPA routing)
    if (Platform.OS === 'web') {
      try {
        const url = Linking.createURL(`/projects/${id}`);
        (window as any).history.pushState({}, '', url);
      } catch {}
    }
  }

  function hasValidForm() {
    return description.trim().length >= 10 && !!budget && !!skillLevel;
  }

  function resetForm() {
    setDescription('');
    setBudget('');
    setSkillLevel('');
    setPhotoUri(null);
    setSugs(null);
    setDraftId(null);
  }

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 2000);
  }

  const triggerHaptic = async (type = 'success') => {
    try {
      if (type === 'success') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      // Haptics not available
    }
  };

  async function fetchEntitlements() {
    try {
      const r = await api(`/me/entitlements/${USER_ID}`);
      setEnts({ 
        previewAllowed: !!r.data?.previewAllowed, 
        remaining: r.data?.remaining 
      });
    } catch (err) {
      console.warn('[entitlements]', err);
    }
  }

  useEffect(() => {
    fetchEntitlements();
    
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fetchEntitlements();
      }
    });
    
    return () => subscription.remove();
  }, []);

  async function ensureDraft() {
    if (draftId) return draftId;

    const name = description.trim();
    if (name.length < 10 || !budget || !skillLevel) {
      showToast('Please complete all fields (10+ char description, budget, skill)', 'error');
      return null;
    }

    const r = await api('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ user_id: USER_ID, name, budget, skill: skillLevel }),
    });

    if (!r.ok) {
      const msg = r?.data?.error || r?.data?.message || 'Failed to create project';
      showToast(msg, 'error');
      return null;
    }

    const id = r.data?.item?.id || r.data?.id;
    if (!id) { 
      showToast('Project not created', 'error'); 
      return null; 
    }
    setDraftId(id);
    return id;
  }

  async function fetchDesignSuggestions() {
    if (!draftId) return;
    setSugsBusy(true);
    try {
      const r = await api(`/api/projects/${draftId}/suggestions`, {
        method: 'POST',
        body: JSON.stringify({ user_id: USER_ID }),
      });
      if (!r.ok) {
        console.warn('Suggestions error', r.status, r.data);
        return;
      }
      setSugsError(undefined);
      setSugs({
        bullets: r.data?.suggestions || [],
        tags: r.data?.tags || []
      });
    } finally {
      setSugsBusy(false);
    }
  }

  // Auto-trigger suggestions when photo is picked and form is valid
  useEffect(() => {
    if (photoUri && hasValidForm() && !sugs && !sugsBusy) {
      fetchDesignSuggestions();
    }
  }, [photoUri, description, budget, skillLevel]);

  function pickPhotoWeb(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return reject(new Error('No file selected'));
          if (!file.type?.startsWith?.('image/')) return reject(new Error('Please select an image'));
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.onload = () => {
            const dataUrl = String(reader.result);
            console.info('[photo] picked web', { type: file.type, size: file.size });
            resolve(dataUrl);
          };
          reader.readAsDataURL(file);
        };
        input.click();
      } catch (e) {
        reject(e);
      }
    });
  }

  async function pickPhotoNative(): Promise<string> {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
      base64: false,
    });
    if ((res as any).canceled) throw new Error('Selection canceled');
    const uri = (res as any).assets?.[0]?.uri;
    if (!uri) throw new Error('No image URI');
    console.info('[photo] picked native', { uri });
    return uri;
  }

  const onUploadPhoto = async () => {
    try {
      const uri = Platform.OS === 'web' ? await pickPhotoWeb() : await pickPhotoNative();
      setPhotoUri(uri);
      // Auto-trigger handled by useEffect
    } catch (err: any) {
      Alert.alert('Photo picker', err?.message || 'Could not select photo');
    }
  };

  async function generatePreview() {
    if (!hasValidForm() || !photoUri || !canPreview || busy) return;
    
    setBusy(true);
    try {
      const id = await ensureDraft();
      if (!id) return;
      
      const r = await api(`/api/projects/${id}/preview`, { 
        method: 'POST', 
        body: JSON.stringify({ user_id: USER_ID }) 
      });
      if (!r.ok) {
        Alert.alert('Preview failed', r.data?.error || 'Could not generate preview');
        triggerHaptic('error');
        return;
      }
      triggerHaptic('success');
      Alert.alert('Success', 'Preview requested');
      navigation.navigate('Projects', { screen: 'ProjectDetails', params: { id } });
    } catch (err: any) {
      Alert.alert('Preview failed', err?.message || 'Could not generate preview');
      triggerHaptic('error');
    } finally {
      setBusy(false);
    }
  }

  function navigateToProject(id: string) {
    const tryRoutes = ['ProjectDetail', 'ProjectDetailScreen', 'ProjectDetails', 'ProjectDetailsScreen'];
    for (const r of tryRoutes) {
      try { navigation.navigate(r as any, { id }); return; } catch {}
    }
    navigation.navigate('Projects' as any);
  }

  async function uploadProjectImage(id: string, photoUri?: string | null) {
    if (!photoUri) throw new Error('NO_PHOTO');

    // If already a public URL, use the server's direct_url shortcut
    if (photoUri.startsWith('http')) {
      return await api(`/api/projects/${id}/image`, {
        method: 'POST',
        body: JSON.stringify({ direct_url: photoUri }),
      });
    }

    // Build FormData across platforms
    const form = new FormData();

    if (Platform.OS === 'web') {
      // Expo ImagePicker on web returns a data URL; convert to Blob
      const res = await fetch(photoUri);
      const blob = await res.blob();
      form.append('file', blob, 'upload.jpg');
    } else {
      // Native RN needs { uri, name, type }
      form.append('file', {
        // @ts-ignore – RN FormData type
        uri: photoUri,
        name: 'upload.jpg',
        type: 'image/jpeg',
      });
    }

    return await api(`/api/projects/${id}/image`, { method: 'POST', body: form });
  }

  async function onBuildWithoutPreview() {
    if (busyBuild) return;
    setBusyBuild(true);
    try {
      const id = await ensureDraft();
      if (!id) return;

      // Upload image if needed before build
      if (photoUri) {
        try {
          const u = await uploadProjectImage(id, photoUri);
          console.log('[upload]', u);
        } catch (e) {
          console.error('image upload failed', e);
          showToast('Could not upload photo. Please re-select and try again.', 'error');
          setBusyBuild(false);
          return;
        }
      }

      let r: any = null;

      // Attempt 1: raw POST with NO headers/body (truly empty)
      try {
        // @ts-ignore
        r = await apiRaw(`/api/projects/${id}/build-without-preview`, { method: 'POST' });
      } catch (e) {
        console.log('[build attempt 1 failed]', (e as any)?.message || e);
      }

      // Attempt 2: minimal JSON { id }
      if (!r || r.ok === false) {
        try {
          r = await api(`/api/projects/${id}/build-without-preview`, {
            method: 'POST',
            body: JSON.stringify({ id }),
          });
        } catch (e) {
          console.log('[build attempt 2 failed]', (e as any)?.message || e);
        }
      }

      // Attempt 3: previous enriched payload (project_id, user_id, goal, budget, skill)
      if (!r || r.ok === false) {
        const payload = {
          project_id: id,
          user_id: USER_ID,
          goal: (description || '').trim(),
          budget: (budget || '').trim(),
          skill: (skillLevel || '').trim(),
        };
        r = await api(`/api/projects/${id}/build-without-preview`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (!r || !r.ok) {
        if (r.status === 403) {
          showToast('You are out of quota. Upgrade from Profile.', 'error');
        } else if (r.status === 422) {
          showToast(r.data?.error || 'Invalid request', 'error');
        } else {
          showToast('Could not request build. Try again.', 'error');
        }
        return;
      }

      showToast('Plan requested', 'success');
      navigateToProject(id);
      // light reset
      setDraftId(null);
      setPhotoUri(null);
    } finally {
      setBusyBuild(false);
    }
  }

  function applySuggestionsToDescription() {
    if (!sugs) return;
    
    const tagLine = sugs?.tags?.slice(0, 3).join(', ');
    const tips = (sugs?.bullets || []).slice(0, 2).join('; ');
    const append = [
      tagLine && `Style: ${tagLine}.`,
      tips && `Notes: ${tips}.`
    ].filter(Boolean).join(' ');
    
    setDescription(prev => 
      prev.endsWith('.') ? `${prev} ${append}` : `${prev}. ${append}`
    );
    
    showToast('Applied to description.', 'success');
    triggerHaptic('success');
  }

  const handleBudgetSelect = (option: string) => {
    setBudget(option);
    setShowBudgetDropdown(false);
  };

  const handleSkillSelect = (option: string) => {
    setSkillLevel(option);
    setShowSkillDropdown(false);
  };

  const TILE_SIZE = 300;
  const ICON_SIZE = 32;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: Math.max(tabBarHeight + 20, insets.bottom + 20),
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create New Project</Text>
          <Text style={styles.subtitle}>Wish. See. Build.</Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Project Description</Text>
          <TextInput
            style={[styles.textArea, { height: 84 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Build 3 floating shelves for living room wall (minimum 10 characters)"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            scrollEnabled={false}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>
            {description.length}/10 characters minimum
          </Text>
        </View>

        <View style={styles.budgetFieldWrapper}>
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Budget</Text>
            <Pressable 
              style={styles.dropdown}
              onPress={() => {
                setShowBudgetDropdown(true);
                setShowSkillDropdown(false);
              }}
            >
              <Text style={[styles.dropdownText, !budget && styles.placeholderText]}>
                {budget || 'Select budget range'}
              </Text>
              <Ionicons 
                name={showBudgetDropdown ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={colors.textSecondary} 
              />
            </Pressable>
            
            <Modal
              transparent
              visible={showBudgetDropdown}
              animationType="fade"
              onRequestClose={() => setShowBudgetDropdown(false)}
            >
              <Pressable 
                style={styles.modalOverlay} 
                onPress={() => setShowBudgetDropdown(false)}
              >
                <View style={[styles.dropdownOptions, styles.budgetDropdownPosition]}>
                  {budgetOptions.map((option) => (
                    <Pressable
                      key={option}
                      style={styles.dropdownOption}
                      onPress={() => handleBudgetSelect(option)}
                    >
                      <Text style={styles.dropdownOptionText}>{option}</Text>
                    </Pressable>
                  ))}
                </View>
              </Pressable>
            </Modal>
          </View>
        </View>

        <View style={styles.skillFieldWrapper}>
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Skill Level</Text>
            <Pressable 
              style={styles.dropdown}
              onPress={() => {
                setShowSkillDropdown(true);
                setShowBudgetDropdown(false);
              }}
            >
              <Text style={[styles.dropdownText, !skillLevel && styles.placeholderText]}>
                {skillLevel || 'Select skill level'}
              </Text>
              <Ionicons 
                name={showSkillDropdown ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={colors.textSecondary} 
              />
            </Pressable>
            
            <Modal
              transparent
              visible={showSkillDropdown}
              animationType="fade"
              onRequestClose={() => setShowSkillDropdown(false)}
            >
              <Pressable 
                style={styles.modalOverlay} 
                onPress={() => setShowSkillDropdown(false)}
              >
                <View style={[styles.dropdownOptions, styles.skillDropdownPosition]}>
                  {skillOptions.map((option) => (
                    <Pressable
                      key={option}
                      style={styles.dropdownOption}
                      onPress={() => handleSkillSelect(option)}
                    >
                      <Text style={styles.dropdownOptionText}>{option}</Text>
                    </Pressable>
                  ))}
                </View>
              </Pressable>
            </Modal>
          </View>
        </View>

        <View style={styles.tilesContainer}>
          <View style={{ 
            marginTop: 12, 
            marginBottom: 8, 
            alignItems: 'center' 
          }}>
            <View style={{ height: 1, width: '100%', backgroundColor: 'rgba(229,231,235,0.9)' }} />
            <View style={{ position: 'absolute', top: -9, paddingHorizontal: 8, backgroundColor: '#FFF' }}>
              <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: '600' }}>
                Add your room photo
              </Text>
            </View>
          </View>

          {!photoUri ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
              <Pressable
                testID="btn-upload-photo"
                style={({ pressed }) => ({
                  width: TILE_SIZE, height: 120, borderRadius: 16, marginVertical: 8,
                  justifyContent: 'center', alignItems: 'center',
                  backgroundColor: '#FFF',
                  borderWidth: 1.5, borderColor: '#E5E7EB',
                  shadowColor: '#000', 
                  shadowOpacity: 0.04, 
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 }, 
                  elevation: 4,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
                onPress={onUploadPhoto}
              >
                <Ionicons 
                  name="images-outline" 
                  size={ICON_SIZE} 
                  color="#6B7280" 
                  style={{ marginBottom: 6 }} 
                />
                <Text style={styles.tileTitle}>Upload Photo</Text>
                <Text style={styles.tileSubtitle}>From gallery</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <Image 
                testID="np-photo-preview"
                source={{ uri: photoUri }} 
                style={{ 
                  width: TILE_SIZE, 
                  height: 200, 
                  borderRadius: 12,
                  marginBottom: 12,
                }} 
                resizeMode="cover"
              />
              
              <TouchableOpacity 
                onPress={onUploadPhoto}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                }}
              >
                <Ionicons name="refresh" size={16} color="#F59E0B" />
                <Text style={{ marginLeft: 6, color: '#F59E0B', fontSize: 14 }}>
                  Change photo
                </Text>
              </TouchableOpacity>
              
              <Text style={{ 
                fontSize: 12, 
                color: '#6B7280', 
                textAlign: 'center',
                marginTop: 8,
                paddingHorizontal: 20,
              }}>
                We'll upload your photo when you generate a preview.
              </Text>
            </View>
          )}
        </View>

        {sugs !== null && description.trim().length >= 10 && (
          <View 
            testID="np-suggestions-card"
            style={styles.suggestionsCard}
          >
            <Text style={styles.suggestionsTitle}>Design Suggestions (beta)</Text>
            
            {sugsBusy ? (
              <View style={styles.suggestionsLoading}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={styles.suggestionsLoadingText}>Analyzing your photo…</Text>
              </View>
            ) : sugs?.bullets && sugs.bullets.length > 0 ? (
              <View>
                {sugs.bullets.map((suggestion: string, idx: number) => (
                  <View key={idx} style={styles.suggestionBullet}>
                    <Ionicons 
                      name="checkmark-circle" 
                      size={16} 
                      color="#10B981" 
                      style={{ marginRight: 8 }} 
                    />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </View>
                ))}
                {sugs.tags && sugs.tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    <Text style={styles.suggestionMeta}>
                      {sugs.tags.join(' · ')}
                    </Text>
                  </View>
                )}

                <View style={styles.applyRow}>
                  <Text style={styles.applyRowCaption}>Proposed edits</Text>
                  <Pressable
                    testID="np-apply-suggestions"
                    onPress={applySuggestionsToDescription}
                    style={styles.applyButton}
                  >
                    <Text style={styles.applyButtonText}>Apply to description</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            
            <Pressable
              testID="np-refresh-suggestions"
              onPress={fetchDesignSuggestions}
              disabled={sugsBusy}
              style={[styles.suggestionsRefresh, sugsBusy && { opacity: 0.5 }]}
            >
              <Ionicons name="refresh" size={14} color="#6B7280" style={{ marginRight: 4 }} />
              <Text style={styles.suggestionsRefreshText}>{sugsBusy ? 'Refreshing…' : 'Refresh suggestions'}</Text>
            </Pressable>
            {sugsError && (
              <Text style={styles.suggestionsError}>{sugsError}</Text>
            )}
          </View>
        )}

        {hasValidForm() && (
          <View style={{ marginTop: 20 }}>
            <Pressable
              testID="np-generate-preview"
              onPress={generatePreview}
              disabled={!photoUri || !canPreview || busy}
              style={({ pressed }) => [
                styles.primaryButton,
                (!photoUri || !canPreview || busy) && styles.primaryButtonDisabled,
                { transform: [{ scale: pressed && photoUri && canPreview && !busy ? 0.98 : 1 }] }
              ]}
            >
              {busy ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Requesting…</Text>
                </>
              ) : (
                <Text style={styles.primaryButtonText}>Generate AI Preview</Text>
              )}
            </Pressable>

            {!canPreview && (
              <Text style={styles.upgradeHint}>
                <Text style={{ color: '#6B7280' }}>Need visual previews? </Text>
                <Text 
                  style={{ color: '#F59E0B', fontWeight: '600' }}
                  onPress={() => navigation.navigate('Profile')}
                >
                  Upgrade
                </Text>
              </Text>
            )}

            <Pressable
              testID="np-build-without-preview"
              onPress={onBuildWithoutPreview}
              disabled={busyBuild}
              style={({ pressed }) => [
                styles.secondaryButton,
                busyBuild && styles.secondaryButtonDisabled,
                { marginTop: 12, transform: [{ scale: pressed && !busyBuild ? 0.98 : 1 }] }
              ]}
            >
              {busyBuild ? (
                <>
                  <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={styles.secondaryButtonText}>Creating…</Text>
                </>
              ) : (
                <Text style={styles.secondaryButtonText}>Build Plan Without Preview</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>

      {toastMessage && (
        <View style={[
          styles.toast,
          toastType === 'error' && styles.toastError
        ]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    overflow: 'visible',
  },
  scrollView: {
    flex: 1,
    overflow: 'visible',
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: typography.fontFamily.inter,
    color: '#64748B',
    marginBottom: 12,
  },
  budgetFieldWrapper: {
    position: 'relative',
    zIndex: 2000,
    elevation: 2000,
    overflow: 'visible',
  },
  skillFieldWrapper: {
    position: 'relative',
    zIndex: 3000,
    elevation: 3000,
    overflow: 'visible',
  },
  fieldContainer: {
    marginBottom: 14,
    position: 'relative',
    overflow: 'visible',
  },
  fieldLabel: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#111827',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: typography.fontFamily.inter,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    fontFamily: typography.fontFamily.inter,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'right',
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.inter,
    color: colors.textPrimary,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  dropdownOptions: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginHorizontal: 20,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
    maxWidth: 300,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
  },
  budgetDropdownPosition: {
    marginTop: -120,
  },
  skillDropdownPosition: {
    marginTop: -60,
  },
  dropdownOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.inter,
    color: colors.textPrimary,
  },
  tilesContainer: {
    marginTop: 8,
  },
  tileTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#1F2937',
  },
  tileSubtitle: {
    fontSize: 13,
    fontFamily: typography.fontFamily.inter,
    color: '#6B7280',
    marginTop: 2,
  },
  suggestionsCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#111827',
    marginBottom: 12,
  },
  suggestionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  suggestionsLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: '#6B7280',
  },
  suggestionBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: '#374151',
    lineHeight: 20,
  },
  suggestionMeta: {
    fontSize: 12,
    fontFamily: typography.fontFamily.inter,
    color: '#9CA3AF',
    marginTop: 8,
  },
  tagsRow: {
    marginTop: 4,
  },
  applyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  applyRowCaption: {
    fontSize: 12,
    fontFamily: typography.fontFamily.inter,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  applyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
  },
  applyButtonText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.inter,
    color: '#374151',
    fontWeight: '500' as any,
  },
  suggestionsRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
  },
  suggestionsRefreshText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.inter,
    color: '#6B7280',
  },
  suggestionsError: {
    fontSize: 12,
    fontFamily: typography.fontFamily.inter,
    color: '#DC2626',
    marginTop: 6,
  },
  primaryButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#FFF',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonDisabled: {
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#F59E0B',
  },
  upgradeHint: {
    fontSize: 13,
    fontFamily: typography.fontFamily.inter,
    textAlign: 'center',
    marginTop: 8,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastError: {
    backgroundColor: '#DC2626',
  },
  toastText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: '#FFF',
    fontWeight: '500' as any,
  },
});
