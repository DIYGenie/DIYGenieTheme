import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Modal, ActivityIndicator, ScrollView, Image, TouchableOpacity, Platform, AppState, findNodeHandle, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import useOptionalTabBarHeight from '../hooks/useOptionalTabBarHeight';
import { useNavigation, useRoute, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootTabParamList } from '../navigation/RootTabs';
import type { ProjectsStackParamList } from '../navigation/ProjectsNavigator';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { brand, colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { api, apiRaw } from '../lib/api';
import PromptApplyModal from '../components/PromptApplyModal';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { subscribeScanPhoto } from '../lib/scanEvents';
import { saveRoomScan } from '../features/scans/saveRoomScan';
import { useAuth } from '../hooks/useAuth';
import { uploadRoomScan } from '../lib/uploadRoomScan';
import { supabase } from '../lib/supabase';
import RoiModal from '../components/RoiModal';
import { saveRoomScanRegion } from '../lib/regions';
import MeasureModal from '../components/MeasureModal';
import { saveLineMeasurement } from '../lib/measure';
import { saveDraft, loadDraft, clearDraft } from '../lib/draft';
import { attachScanToProject } from '../lib/scans';
import { setLastScan as setLastScanEphemeral } from '../lib/ephemeral';

const USER_ID = (globalThis as any).__DEV_USER_ID__ || '00000000-0000-0000-0000-000000000001';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList>,
  NativeStackNavigationProp<ProjectsStackParamList>
>;

export default function NewProject({ navigation: navProp }: { navigation?: any }) {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
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
  const [uploading, setUploading] = useState(false);
  
  const [sugs, setSugs] = useState<any>(null);
  const [sugsBusy, setSugsBusy] = useState(false);
  const [sugsError, setSugsError] = useState<string | undefined>(undefined);
  const [applyOpen, setApplyOpen] = React.useState(false);
  const [pendingTip, setPendingTip] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [lastScan, setLastScan] = useState<{ scanId: string; imageUrl: string } | null>(null);
  const [roiOpen, setRoiOpen] = useState(false);
  const [lastRegionId, setLastRegionId] = useState<string | null>(null);
  const [measureOpen, setMeasureOpen] = useState(false);
  
  const insets = useSafeAreaInsets();
  const tabBarHeight = useOptionalTabBarHeight();

  const scrollRef = React.useRef<ScrollView>(null);
  const descRef = React.useRef<TextInput>(null);
  const sugRef = React.useRef<View>(null);
  const ctaRef = React.useRef<View>(null);
  const lastScanRef = useRef<{ scanId: string; imageUrl: string | null } | null>(null);

  const budgetOptions = ['$', '$$', '$$$'];
  const skillOptions = ['Beginner', 'Intermediate', 'Advanced'];

  const canPreview = ents?.previewAllowed ?? false;

  const descOk = (description?.trim().length ?? 0) >= 10;
  const budgetOk = !!budget;
  const skillOk = !!skillLevel;
  const canProceed = descOk && budgetOk && skillOk;

  // Helper: robust navigation to a project detail (removed - using direct navigation now)

  function hasValidForm() {
    return description.trim().length >= 10 && !!budget && !!skillLevel;
  }

  function normalizeAppend(base: string, add: string) {
    const b = base.trim();
    const a = add.trim().replace(/\s+/g, ' ');
    if (!b) return a;
    const endPunct = /[.!?]$/.test(b) ? '' : '.';
    return `${b}${endPunct} ${a}`;
  }

  function resetForm() {
    try {
      setDraftId(null);
      setTitle('');
      setDescription('');
      setBudget('');
      setSkillLevel('');
      setPhotoUri(null);
      setLastScan(null);
      lastScanRef.current = null;
      setLastScanEphemeral(null);
      setSugs(null);
      setSugsBusy(false);
      setSugsError(undefined);
      setApplyOpen(false);
      setPendingTip(null);
      clearDraft();
    } catch {}
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

  async function fetchEntitlementsSafe(userId: string) {
    try {
      const r = await api(`/me/entitlements/${userId}`);
      return r; // expected: { tier, remaining, previewAllowed }
    } catch {
      console.warn('[entitlements] falling back to Free defaults');
      return { tier: 'Free', remaining: 2, previewAllowed: false, ok: true };
    }
  }

  async function fetchEntitlements() {
    const userId = user?.id || USER_ID;
    const r = await fetchEntitlementsSafe(userId);
    const data = (r as any).data || r;
    setEnts({ 
      previewAllowed: !!(data?.previewAllowed) || false, 
      remaining: data?.remaining ?? 2
    });
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

  // Load draft and last scan on mount
  useEffect(() => {
    (async () => {
      const draft = await loadDraft();
      if (draft.title) setTitle(draft.title);
      if (draft.description) setDescription(draft.description);
      if (draft.budget) setBudget(draft.budget);
      if (draft.skill) setSkillLevel(draft.skill);
    })();
    
    // Restore last scan from ephemeral store
    const { getLastScan } = require('../lib/ephemeral');
    const cached = getLastScan();
    if (cached) {
      setLastScan(cached);
      lastScanRef.current = cached;
    }
  }, []);

  // Save draft when fields change
  useEffect(() => {
    saveDraft({ title, description, budget, skill: skillLevel });
  }, [title, description, budget, skillLevel]);

  // Clear form when navigating away from tab
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      if (draftId) {
        resetForm();
      }
    });
    return unsubscribe;
  }, [navigation, draftId]);

  // Subscribe to scan photo events
  useEffect(() => {
    const subscription = subscribeScanPhoto(async (uri) => {
      setPhotoUri(uri);
      if (route.params?.fromScan) {
        showToast('Room photo added', 'success');
      }
      await uploadPhotoToSupabase(uri, 'scan');
    });
    return () => subscription.remove();
  }, [draftId]);

  // Handle photo from scan navigation params
  useEffect(() => {
    if (route.params?.photoUri && route.params?.fromScan) {
      setPhotoUri(route.params.photoUri);
      showToast('Room photo added', 'success');
      uploadPhotoToSupabase(route.params.photoUri, 'scan');
      // Clear params to avoid re-triggering
      navigation.setParams({ photoUri: undefined, fromScan: undefined } as any);
    }
  }, [route.params?.photoUri, route.params?.fromScan]);

  // Handle section deep-link parameter
  const section = route.params?.section as 'desc' | 'media' | 'preview' | 'plan' | undefined;

  const scrollToView = (ref: React.RefObject<View>) => {
    ref.current?.measureLayout(
      findNodeHandle(scrollRef.current) as number,
      (x, y) => scrollRef.current?.scrollTo({ y: Math.max(y - 24, 0), animated: true }),
      () => {}
    );
  };

  useEffect(() => {
    if (!section) return;
    const t = setTimeout(() => {
      switch (section) {
        case 'desc':
          descRef.current?.focus();
          break;
        case 'media':
          onUploadPhoto();
          break;
        case 'preview':
          scrollToView(sugRef);
          break;
        case 'plan':
          scrollToView(ctaRef);
          break;
      }
    }, 250);
    return () => clearTimeout(t);
  }, [section]);

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

  async function fetchSuggestions() {
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
      fetchSuggestions();
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
      mediaTypes: ['images'],
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

  async function uploadPhotoToSupabase(uri: string, source: 'scan' | 'upload') {
    if (!user) {
      showToast('User not found', 'error');
      return;
    }

    setUploading(true);
    try {
      if (Platform.OS === 'web' && uri.startsWith('data:')) {
        console.log('[web] Skipping upload for data URL (web preview only)');
        showToast('Photo added (web preview)', 'success');
        return;
      }

      const { scanId, imageUrl } = await uploadRoomScan({
        uri,
        userId: user.id,
        projectId: draftId ?? null,
      });
      
      const scanData = { scanId, imageUrl };
      setLastScan(scanData);
      lastScanRef.current = scanData;
      setLastScanEphemeral(scanData);
      console.log('[scan saved]', { scanId, imageUrl });
      showToast('Scan uploaded & saved', 'success');
    } catch (e) {
      console.error('[upload failed]', e);
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  const onScanRoom = () => {
    if (!canProceed) {
      showToast('Please complete all required fields first.', 'error');
      return;
    }
    (navigation as any).navigate('Scan');
  };

  const onUploadPhoto = async () => {
    if (!canProceed) {
      showToast('Please complete all required fields first.', 'error');
      return;
    }
    
    try {
      const uri = Platform.OS === 'web' ? await pickPhotoWeb() : await pickPhotoNative();
      setPhotoUri(uri);
      await uploadPhotoToSupabase(uri, 'upload');
    } catch (err: any) {
      Alert.alert('Photo picker', err?.message || 'Could not select photo');
    }
  };

  async function generatePreview() {
    const descriptionOk = (description?.trim()?.length ?? 0) >= 10;
    const canGenerate = (descriptionOk || !!photoUri) && canPreview;
    
    if (!canGenerate || busy) return;
    
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
      clearDraft();
      try {
        (navigation as any).getParent?.('root-tabs')?.navigate('Projects', {
          screen: 'ProjectDetails',
          params: { id },
        });
      } catch (e) {
        console.error('[nav error]', e);
      }
    } catch (err: any) {
      Alert.alert('Preview failed', err?.message || 'Could not generate preview');
      triggerHaptic('error');
    } finally {
      setBusy(false);
    }
  }

  function navigateToProject(id: string) {
    try {
      (navigation as any).getParent?.('root-tabs')?.navigate('Projects', {
        screen: 'ProjectDetails',
        params: { id },
      });
    } catch (e) {
      console.error('[nav error]', e);
    }
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
      // @ts-ignore – RN FormData type
      form.append('file', {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('User not found', 'error');
        setBusyBuild(false);
        return;
      }

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

      const res = await apiRaw(`/api/projects/${id}/build-without-preview?user_id=${encodeURIComponent(user.id)}`, {
        method: 'POST',
      });
      console.log('[build] accepted', res);
      
      // Link the last scan to the project if available
      const ls = lastScanRef.current;
      try {
        if (ls?.scanId) {
          await attachScanToProject(ls.scanId, id);
        }
      } catch (e) {
        console.warn('[link scan]', e);
      }
      
      showToast('Plan requested', 'success');
      // Navigate and pass the image URL as a fallback for immediate display
      try {
        (navigation as any).getParent?.('root-tabs')?.navigate('Projects', {
          screen: 'ProjectDetails',
          params: { id, imageUrl: ls?.imageUrl ?? null },
        });
      } catch (e) {
        console.error('[nav error]', e);
      }
    } finally {
      setBusyBuild(false);
    }
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
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            <ScrollView 
        ref={scrollRef}
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
          <Text style={styles.title}>Create Your New Project</Text>
          <Text style={styles.subtitle}>Tell us a little about your DIY project so Genie can guide you through scanning, planning, and building.</Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Project Title</Text>
          <TextInput
            style={styles.textArea}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Built-in Bookcase"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Project Description</Text>
          <TextInput
            ref={descRef}
            style={[styles.textArea, { height: 84 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Build 3 floating shelves for living room wall (minimum 10 characters)"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            scrollEnabled={false}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
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
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingVertical: 12 }}>
              <Pressable
                testID="btn-scan-room"
                disabled={!canProceed || uploading}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 120,
                  borderRadius: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: pressed ? '#6D28D9' : brand.primary,
                  shadowColor: '#7C3AED',
                  shadowOpacity: (!canProceed || uploading) ? 0 : 0.3,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                  opacity: (!canProceed || uploading) ? 0.5 : 1,
                })}
                onPress={onScanRoom}
              >
                <Ionicons 
                  name="scan-outline" 
                  size={28} 
                  color="#FFFFFF" 
                  style={{ marginBottom: 8 }} 
                />
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', fontFamily: typography.fontFamily.manropeSemiBold }}>
                  Scan room
                </Text>
              </Pressable>

              <Pressable
                testID="btn-upload-photo"
                disabled={!canProceed || uploading}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 120,
                  borderRadius: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: pressed ? '#F9FAFB' : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#D1D5DB',
                  opacity: (!canProceed || uploading) ? 0.5 : 1,
                })}
                onPress={onUploadPhoto}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={brand.primary} />
                ) : (
                  <>
                    <Ionicons 
                      name="image-outline" 
                      size={28} 
                      color={brand.primary} 
                      style={{ marginBottom: 8 }} 
                    />
                    <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600', fontFamily: typography.fontFamily.manropeSemiBold }}>
                      Upload Photo
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              testID="np-photo-preview"
              onPress={onUploadPhoto}
              disabled={uploading}
              style={{ 
                borderRadius: 16, 
                overflow: 'hidden', 
                borderWidth: 1, 
                borderColor: '#E5E7EB',
                marginVertical: 8,
              }}
            >
              <Image 
                source={{ uri: photoUri }} 
                style={{ 
                  width: '100%', 
                  aspectRatio: 16/9,
                }} 
                resizeMode="cover"
              />
              {uploading && (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              )}
              <View style={{ 
                padding: 12, 
                alignItems: 'flex-end',
                backgroundColor: '#FFFFFF',
              }}>
                <Text style={{ color: brand.primary, fontSize: 14, fontWeight: '600' }}>
                  {uploading ? 'Uploading...' : 'Change photo'}
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        {lastScan && (
          <View style={{
            marginTop: 16,
            padding: 12,
            backgroundColor: '#F9FAFB',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}>
            <Image 
              source={{ uri: lastScan.imageUrl }} 
              style={{
                width: 60,
                height: 60,
                borderRadius: 8,
              }}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 4 }}>
                Saved scan
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>
                {lastScan.scanId.slice(0, 8)}…
              </Text>
            </View>
            {lastScan?.imageUrl && (
              <View style={{ flexDirection: 'column', gap: 8 }}>
                <Pressable
                  onPress={() => setRoiOpen(true)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: pressed ? '#EDE9FE' : '#F3F0FF',
                    borderWidth: 1,
                    borderColor: '#DDD6FE',
                  })}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: brand.primary }}>
                    Mark area
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMeasureOpen(true)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: pressed ? '#EDE9FE' : '#F3F0FF',
                    borderWidth: 1,
                    borderColor: '#DDD6FE',
                  })}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: brand.primary }}>
                    Measure
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {(!!photoUri || (description?.trim().length ?? 0) >= 10) && (
          <View 
            ref={sugRef}
            testID="np-suggestions-card"
            style={styles.suggestionsCard}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.suggestionsTitle}>Suggestions</Text>
              <Pressable
                testID="np-suggestions-refresh"
                onPress={fetchSuggestions}
                disabled={sugsBusy}
                style={[styles.suggestionsRefresh, sugsBusy && { opacity: 0.5 }]}
              >
                <Ionicons name="refresh" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.suggestionsRefreshText}>{sugsBusy ? 'Refreshing…' : 'Refresh'}</Text>
              </Pressable>
            </View>
            
            {sugsBusy ? (
              <View style={styles.suggestionsLoading}>
                <ActivityIndicator size="small" color={brand.primary} />
                <Text style={styles.suggestionsLoadingText}>Loading suggestions…</Text>
              </View>
            ) : sugs?.bullets && sugs.bullets.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                {sugs.bullets.map((suggestion: string, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => { setPendingTip(suggestion); setApplyOpen(true); }}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 9999,
                      borderWidth: 1,
                      borderColor: '#DDD',
                      marginRight: 8,
                    }}
                  >
                    <Text>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={{ opacity: 0.6, fontSize: 14 }}>Tips will appear after you add a photo or describe your project.</Text>
            )}
            
            {sugsError && (
              <Text style={styles.suggestionsError}>{sugsError}</Text>
            )}
          </View>
        )}

        {(hasValidForm() || !!photoUri) && (
          <View ref={ctaRef} style={{ marginTop: 20 }}>
            {(() => {
              const descriptionOk = (description?.trim()?.length ?? 0) >= 10;
              const canGenerate = (descriptionOk || !!photoUri) && canPreview;
              
              return (
                <>
                  <PrimaryButton
                    testID="np-generate-preview"
                    title="Generate AI Preview"
                    onPress={generatePreview}
                    disabled={!canGenerate}
                    loading={busy}
                  />

                  {!canPreview && (
                    <Text style={styles.upgradeHint}>
                      <Text style={{ color: '#6B7280' }}>Need visual previews? </Text>
                      <Text 
                        style={{ color: brand.primary, fontWeight: '600' }}
                        onPress={() => navigation.navigate('Profile')}
                      >
                        Upgrade
                      </Text>
                    </Text>
                  )}

                  <SecondaryButton
                    testID="np-build-without-preview"
                    title="Build Plan Without Preview"
                    onPress={onBuildWithoutPreview}
                    disabled={busyBuild}
                    loading={busyBuild}
                    style={{ marginTop: 12 }}
                  />
                  
                  <TouchableOpacity
                    onPress={resetForm}
                    style={{ marginTop: 16, alignItems: 'center' }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '500' }}>
                      Clear Form
                    </Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        )}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>

        {toastMessage && (
        <View style={[
          styles.toast,
          toastType === 'error' && styles.toastError
        ]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <PromptApplyModal
        visible={applyOpen}
        tip={pendingTip}
        onReplace={() => {
          if (pendingTip) setDescription(pendingTip);
          setApplyOpen(false);
        }}
        onAppend={() => {
          if (pendingTip) setDescription(prev => normalizeAppend(prev || '', pendingTip));
          setApplyOpen(false);
        }}
        onClose={() => setApplyOpen(false)}
      />

      <RoiModal
        visible={roiOpen}
        imageUrl={lastScan?.imageUrl ?? ''}
        onCancel={() => setRoiOpen(false)}
        onSave={async (points, label) => {
          try {
            if (!lastScan?.scanId) throw new Error('No scan');
            const row = await saveRoomScanRegion({ scanId: lastScan.scanId, points, label });
            setLastRegionId(row.id);
            showToast('Area saved', 'success');
          } catch (e: any) {
            showToast(e?.message ?? 'Save failed', 'error');
          } finally {
            setRoiOpen(false);
          }
        }}
      />

      <MeasureModal
        visible={measureOpen}
        scanId={lastScan?.scanId!}
        imageUrl={lastScan?.imageUrl ?? ''}
        regionId={lastRegionId ?? null}
        onCancel={() => setMeasureOpen(false)}
        onSaveLine={async ([a, b], valueInches) => {
          try {
            await saveLineMeasurement({
              scanId: lastScan!.scanId,
              regionId: lastRegionId ?? null,
              points: [a, b],
              valueInches,
            });
            showToast(`Saved ${valueInches.toFixed(1)} in`, 'success');
          } catch (e: any) {
            showToast(e?.message ?? 'Save failed', 'error');
          } finally {
            setMeasureOpen(false);
          }
        }}
      />
      </SafeAreaView>
    </KeyboardAvoidingView>
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
