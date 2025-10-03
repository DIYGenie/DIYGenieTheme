import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform, useWindowDimensions, Modal, ActivityIndicator, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { createProject, uploadRoomPhoto, getEntitlements } from '../lib/api';
import { pickRoomPhoto } from '../lib/storage';
import Toast from '../components/Toast';
import { useDebouncePress } from '../lib/hooks';
import { useUser } from '../lib/useUser';
import API from '../lib/apiClient';

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:5000';

// Skip image upload during suggestions phase to avoid 500s and keep flow cheap
const STUB_SKIP_IMAGE_UPLOAD = true;

async function api(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
    clearTimeout(timeout);
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e: any) {
    clearTimeout(timeout);
    throw e;
  }
}

export default function NewProject({ navigation }: { navigation: any }) {
  const { userId, loading: loadingUser } = useUser();
  const currentUserId = userId || globalThis.__DEV_USER_ID__ || '00000000-0000-0000-0000-000000000001';
  
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [entitlements, setEntitlements] = useState({ remaining: 0, quota: 0, tier: 'Free', previewAllowed: false });
  const [loadingEntitlements, setLoadingEntitlements] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [inputImageUrl, setInputImageUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isBuildingPlan, setIsBuildingPlan] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [networkError, setNetworkError] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState(0);
  
  // Smart Suggestions state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [sugs, setSugs] = useState<any | null>(null);
  const [sugsBusy, setSugsBusy] = useState(false);
  const [sugsErr, setSugsErr] = useState('');
  
  // Editable build prompt
  const [promptText, setPromptText] = useState<string>('');
  
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { height: H } = useWindowDimensions();
  const isSmall = H < 740;
  const isVerySmall = H < 680;

  const budgetOptions = ['$', '$$', '$$$'];
  const skillOptions = ['Beginner', 'Intermediate', 'Advanced'];

  const isFormValid = description.trim().length >= 10 && budget && skillLevel;
  const remaining = Number(entitlements?.remaining ?? 0);
  const previewAllowed = Boolean(entitlements?.previewAllowed);
  
  const canUpload = true;
  const hasImage = Boolean(inputImageUrl);
  const formReady = isFormValid && hasImage;
  const canPreview = isFormValid && remaining > 0 && previewAllowed && hasImage;
  const canBuild = isFormValid && remaining > 0 && hasImage;

  const showToast = (message: string, type = 'success') => {
    setToast({ visible: true, message, type });
  };

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

  useEffect(() => {
    if (!currentUserId) return;
    
    const init = async () => {
      try {
        const healthResp = await API.get('/health');
        if (healthResp.status === 200) {
          setLastHealthCheck(Date.now());
          setNetworkError(false);
        }
      } catch (healthErr) {
        setNetworkError(true);
      }

      try {
        const data = await getEntitlements(currentUserId);
        setEntitlements({
          tier: data.tier || 'Free',
          remaining: data.remaining || 0,
          quota: data.quota || 0,
          previewAllowed: data.previewAllowed || false,
        });
        if (Date.now() - lastHealthCheck < 60000) {
          setNetworkError(false);
        }
      } catch (error) {
        setNetworkError(true);
        setEntitlements({ tier: 'Free', quota: 5, remaining: 5, previewAllowed: false });
      } finally {
        setLoadingEntitlements(false);
      }
    };
    
    init();
  }, [currentUserId]);

  // Helper: Ensure draft project exists
  const ensureDraftProject = async () => {
    if (draftId) return draftId;
    if (!isFormValid) return null;
    
    try {
      const projectData = await createProject({
        name: description.substring(0, 100),
        budget: budget,
        skill: skillLevel,
        user_id: currentUserId,
        status: 'pending',
      });

      if (projectData.ok === false || !projectData.id) {
        return null;
      }
      
      const newDraftId = projectData.id;
      setDraftId(newDraftId);
      setProjectId(newDraftId);
      
      // Pre-fill prompt once
      if (!promptText) {
        setPromptText(`Build plan for: ${description.trim()}. Budget: ${budget}. Skill: ${skillLevel}. Focus on clean steps and accurate cut list.`);
      }
      
      return newDraftId;
    } catch (e) {
      console.error('Draft project creation failed:', e);
      return null;
    }
  };

  // Helper: Upload image to project
  const uploadImage = async (projectId: string, asset: any) => {
    try {
      await uploadRoomPhoto(projectId, asset);
      return true;
    } catch (e) {
      console.error('Image upload failed:', e);
      return false;
    }
  };

  // Helper: Fetch suggestions
  const fetchSuggestions = async () => {
    if (sugsBusy) return;
    
    setSugsBusy(true);
    setSugsErr('');
    
    try {
      const pid = await ensureDraftProject();
      if (!pid) {
        setSugsErr('Could not create draft project');
        setSugsBusy(false);
        return;
      }
      
      const response = await api(`/api/projects/${pid}/suggestions`, {
        method: 'POST',
        body: JSON.stringify({ user_id: currentUserId }),
      });
      
      if (response.ok && response.bullets) {
        setSugs({ bullets: response.bullets || [], tags: response.tags || [] });
        setSugsErr('');
      } else {
        setSugsErr('Could not get suggestions. You can still edit the prompt below.');
      }
    } catch (e: any) {
      console.error('Suggestions fetch failed:', e);
      setSugsErr('Could not get suggestions. You can still edit the prompt below.');
    } finally {
      setSugsBusy(false);
    }
  };
  
  // Helper: Generate Plan (no preview)
  const generatePlan = async () => {
    if (isBuildingPlan) return;
    
    try {
      setIsBuildingPlan(true);
      
      const pid = await ensureDraftProject();
      if (!pid) {
        showToast('Could not create project', 'error');
        triggerHaptic('error');
        setIsBuildingPlan(false);
        return;
      }
      
      const body = { 
        user_id: currentUserId, 
        prompt: promptText?.trim() || description?.trim() || 'Build plan' 
      };
      
      await api(`/api/projects/${pid}/build-without-preview`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      
      showToast('Plan requested', 'success');
      triggerHaptic('success');
      
      setTimeout(() => {
        navigation.navigate('Projects');
      }, 600);
    } catch (e: any) {
      console.error('Plan generation failed:', e);
      Alert.alert('Could not generate plan', e?.message || 'Please try again.');
      triggerHaptic('error');
    } finally {
      setIsBuildingPlan(false);
    }
  };

  // Auto-trigger suggestions when form is complete and photo added
  useEffect(() => {
    if (!isFormValid || !hasImage || sugs || sugsBusy) return;
    
    // Set loading state immediately so card shows "Analyzing your photo..." on first render
    setSugsBusy(true);
    
    // Auto-fetch even if draftId doesn't exist yet - fetchSuggestions will create it
    fetchSuggestions();
  }, [isFormValid, hasImage, sugs, sugsBusy]);

  const handleScanRoom = () => {
    if (canUpload) {
      navigation.navigate('ScanRoomIntro');
    }
  };

  const handleUploadPhoto = async () => {
    if (!isFormValid) {
      showToast('Please complete all fields (10+ char description, budget, skill)', 'error');
      return;
    }
    
    if (isUploading) return;
    
    try {
      const asset = await pickRoomPhoto();
      if (!asset) return;

      setIsUploading(true);

      // Create or reuse draft project
      let currentProjectId = draftId;
      if (!currentProjectId) {
        const projectData = await createProject({
          name: description.substring(0, 100),
          budget: budget,
          skill: skillLevel,
          user_id: currentUserId,
          status: 'pending',
        });

        if (projectData.ok === false || !projectData.id) {
          showToast("Couldn't create your project (permission). Try again or contact support.", 'error');
          triggerHaptic('error');
          setIsUploading(false);
          return;
        }
        
        currentProjectId = projectData.id;
        setDraftId(currentProjectId);
        setProjectId(currentProjectId);
      }

      // Skip image upload during suggestions phase - we'll upload later for preview
      if (!STUB_SKIP_IMAGE_UPLOAD) {
        await uploadRoomPhoto(currentProjectId, asset);
      }
      
      // Keep local photo for UI preview
      setInputImageUrl(asset.uri);

      showToast('Photo selected ✨', 'success');
      triggerHaptic('success');

      // Suggestions will auto-fetch via useEffect when hasImage becomes true

    } catch (error: any) {
      console.error('Upload failed:', error);
      showToast(error.message || 'Upload failed', 'error');
      triggerHaptic('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!canPreview || isGeneratingPreview) return;

    setIsGeneratingPreview(true);

    try {
      const response = await API.post(`/api/projects/${projectId}/preview`, { user_id: currentUserId });
      
      if (response.data && response.data.ok === false) {
        showToast(response.data.error || 'Preview failed', 'error');
        triggerHaptic('error');
        setIsGeneratingPreview(false);
        return;
      }
      
      showToast('Preview requested', 'success');
      triggerHaptic('success');
      
      setTimeout(() => {
        navigation.navigate('Projects');
      }, 600);
    } catch (e: any) {
      console.error('Preview generation failed:', e);
      
      if (e?.response?.status === 409) {
        showToast("You've already used the preview for this project.", 'error');
        triggerHaptic('error');
        setIsGeneratingPreview(false);
        return;
      }
      
      const errorMsg = e?.response?.data?.error || e?.message || 'Preview failed';
      showToast(errorMsg, 'error');
      triggerHaptic('error');
      setIsGeneratingPreview(false);
    }
  };

  const handleBuildWithoutPreview = async () => {
    if (!canBuild || isBuildingPlan) return;
    
    try {
      setIsBuildingPlan(true);
      
      const r = await API.post(`/api/projects/${projectId}/build-without-preview`, { user_id: currentUserId });
      
      if (r.data && r.data.ok === false) {
        showToast(r.data.error || 'Build failed', 'error');
        triggerHaptic('error');
        setIsBuildingPlan(false);
        return;
      }
      
      if (r.data?.ok) {
        showToast('Plan requested', 'success');
        triggerHaptic('success');
        
        setTimeout(() => {
          navigation.navigate('Projects');
        }, 600);
      }
    } catch (error: any) {
      console.error('Build without preview failed:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Could not build plan';
      showToast(errorMessage, 'error');
      triggerHaptic('error');
    } finally {
      setIsBuildingPlan(false);
    }
  };

  const handleBudgetFocus = () => {
    setShowBudgetDropdown(true);
    setShowSkillDropdown(false);
  };

  const handleSkillFocus = () => {
    setShowSkillDropdown(true);
    setShowBudgetDropdown(false);
  };

  const handleBudgetSelect = (option: string) => {
    setBudget(option);
    setShowBudgetDropdown(false);
  };

  const handleSkillSelect = (option: string) => {
    setSkillLevel(option);
    setShowSkillDropdown(false);
  };

  const debouncedGeneratePreview = useDebouncePress(handleGeneratePreview);
  const debouncedBuildWithoutPreview = useDebouncePress(handleBuildWithoutPreview);

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
        {networkError && (
          <View style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ color: '#991B1B', fontSize: 13, textAlign: 'center' }}>
              ⚠️ Can't reach server. Some features may not work.
            </Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.title}>Create New Project</Text>
          <Text style={styles.subtitle}>Wish. See. Build.</Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Project Description</Text>
          <TextInput
            style={[styles.textArea, { height: isSmall ? 68 : 84 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Build 3 floating shelves for living room wall (minimum 10 characters)"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={isSmall ? 2 : 3}
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
              onPress={handleBudgetFocus}
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
              onPress={handleSkillFocus}
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

        <View style={[styles.tilesContainer, { opacity: isUploading ? 0.6 : 1, pointerEvents: isUploading ? 'none' : 'auto' }]}>
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

          {!loadingEntitlements && !inputImageUrl && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              {isUploading && <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 8 }} />}
              <Text style={styles.helperText}>
                {isUploading
                  ? 'Uploading photo...'
                  : !isFormValid
                  ? 'Complete fields to upload photo'
                  : entitlements.remaining <= 0
                  ? `Upload allowed • Upgrade for AI preview & plans`
                  : `${entitlements.remaining} of ${entitlements.quota} projects remaining`}
              </Text>
            </View>
          )}

          {!inputImageUrl ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
              <Pressable
                disabled={!canUpload}
                style={({ pressed }) => ({
                  width: TILE_SIZE, height: 120, borderRadius: 16, marginVertical: 8,
                  justifyContent: 'center', alignItems: 'center',
                  backgroundColor: '#FFF',
                  borderWidth: 1.5, borderColor: '#FBBF24',
                  opacity: !canUpload ? 0.4 : 1,
                  shadowColor: '#000', 
                  shadowOpacity: !canUpload ? 0 : 0.06, 
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 }, 
                  elevation: 6,
                  transform: [{ scale: pressed && canUpload ? 0.98 : 1 }],
                  pointerEvents: !canUpload ? 'none' : 'auto',
                })}
                onPress={handleScanRoom}
              >
                <Ionicons 
                  name="camera" 
                  size={ICON_SIZE} 
                  color="#F59E0B" 
                  style={{ marginBottom: 6 }} 
                />
                <Text style={styles.tileTitle}>Scan Room</Text>
                <Text style={styles.tileSubtitle}>Use camera</Text>
              </Pressable>

              <Pressable
                disabled={!canUpload}
                style={({ pressed }) => ({
                  width: TILE_SIZE, height: 120, borderRadius: 16, marginVertical: 8,
                  justifyContent: 'center', alignItems: 'center',
                  backgroundColor: '#FFF',
                  borderWidth: 1.5, borderColor: '#E5E7EB',
                  opacity: !canUpload ? 0.4 : 1,
                  shadowColor: '#000', 
                  shadowOpacity: !canUpload ? 0 : 0.04, 
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 }, 
                  elevation: 4,
                  transform: [{ scale: pressed && canUpload ? 0.98 : 1 }],
                  pointerEvents: !canUpload ? 'none' : 'auto',
                })}
                onPress={handleUploadPhoto}
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
                source={{ uri: inputImageUrl }} 
                style={{ 
                  width: TILE_SIZE, 
                  height: 200, 
                  borderRadius: 12,
                  marginBottom: 12,
                }} 
                resizeMode="cover"
              />
              
              <TouchableOpacity 
                onPress={handleUploadPhoto}
                disabled={isUploading}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  opacity: isUploading ? 0.5 : 1,
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
                We'll upload your photo later when you request a visual preview.
              </Text>
            </View>
          )}
        </View>

        {/* Smart Suggestions Card */}
        {hasImage && isFormValid && (
          <View 
            testID="np-suggestions-card"
            style={styles.suggestionsCard}
          >
            <Text style={styles.suggestionsTitle}>Smart Suggestions (beta)</Text>
            
            {sugsBusy ? (
              <View style={styles.suggestionsLoading}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={styles.suggestionsLoadingText}>Analyzing your photo…</Text>
              </View>
            ) : sugsErr ? (
              <Text style={styles.suggestionsError}>{sugsErr}</Text>
            ) : sugs?.bullets ? (
              <View>
                {sugs.bullets.map((bullet: string, idx: number) => (
                  <View key={idx} style={styles.suggestionBullet}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 8 }} />
                    <Text style={styles.suggestionText}>{bullet}</Text>
                  </View>
                ))}
                {sugs.tags && sugs.tags.length > 0 && (
                  <Text style={styles.suggestionTags}>{sugs.tags.join(' · ')}</Text>
                )}
              </View>
            ) : null}
            
            <Pressable
              testID="np-suggestions-refresh"
              onPress={fetchSuggestions}
              disabled={sugsBusy}
              style={[styles.suggestionsRefresh, sugsBusy && { opacity: 0.5 }]}
            >
              <Ionicons name="refresh" size={14} color="#6B7280" style={{ marginRight: 4 }} />
              <Text style={styles.suggestionsRefreshText}>Refresh suggestions</Text>
            </Pressable>
          </View>
        )}

        {/* Editable Prompt */}
        {formReady && (
          <View style={styles.promptCard}>
            <Text style={styles.promptTitle}>Edit build prompt</Text>
            <TextInput
              value={promptText}
              onChangeText={setPromptText}
              multiline
              numberOfLines={4}
              placeholder="Describe your ideal result, constraints, materials on hand, etc."
              placeholderTextColor="#9CA3AF"
              style={styles.promptInput}
              textAlignVertical="top"
            />
            <Text style={styles.promptHint}>
              You get <Text style={{ fontWeight: '700' }}>1 visual preview per project</Text>. Refine with suggestions before generating your plan.
            </Text>
            <Pressable
              testID="np-generate-plan"
              onPress={generatePlan}
              disabled={isBuildingPlan || !promptText?.trim()}
              style={({ pressed }) => [
                styles.primaryButton,
                (isBuildingPlan || !promptText?.trim()) && styles.primaryButtonDisabled,
                { marginTop: 12, transform: [{ scale: pressed && !isBuildingPlan && promptText?.trim() ? 0.98 : 1 }] }
              ]}
              accessibilityRole="button"
            >
              {isBuildingPlan ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Generating…</Text>
                </>
              ) : (
                <Text style={styles.primaryButtonText}>Generate Plan</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type as 'success' | 'error'}
        onHide={() => setToast({ ...toast, visible: false })}
      />
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
  helperText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.inter,
    color: '#6B7280',
    textAlign: 'center',
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
  suggestionsError: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: '#6B7280',
    fontStyle: 'italic',
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
  suggestionTags: {
    fontSize: 12,
    fontFamily: typography.fontFamily.inter,
    color: '#9CA3AF',
    marginTop: 8,
  },
  suggestionsRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  suggestionsRefreshText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.inter,
    color: '#6B7280',
  },
  previewHint: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  previewHintText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.inter,
    color: '#92400E',
    lineHeight: 18,
  },
  ctaContainer: {
    marginTop: 20,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ctaCol: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#E39A33',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#FFF',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E39A33',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#E39A33',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    fontFamily: typography.fontFamily.inter,
    color: '#9CA3AF',
  },
  upgradeHint: {
    fontSize: 12,
    fontFamily: typography.fontFamily.inter,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  upgradeLink: {
    color: '#E39A33',
    fontFamily: typography.fontFamily.manropeBold,
  },
  quotaWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  quotaWarningText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.inter,
    color: '#DC2626',
    marginLeft: 8,
  },
  promptCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  promptTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#111827',
    marginBottom: 12,
  },
  promptInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontFamily: typography.fontFamily.inter,
    color: colors.textPrimary,
    minHeight: 100,
  },
  promptHint: {
    fontSize: 12,
    fontFamily: typography.fontFamily.inter,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 18,
  },
});
