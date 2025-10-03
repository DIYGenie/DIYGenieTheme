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

export default function NewProjectForm({ navigation }) {
  const { userId, loading: loadingUser } = useUser();
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
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { height: H } = useWindowDimensions();
  const isSmall = H < 740;
  const isVerySmall = H < 680;

  const budgetOptions = ['$', '$$', '$$$'];
  const skillOptions = ['Beginner', 'Intermediate', 'Advanced'];

  // --- GATING LOGIC (Free: 2 plans, no previews; Casual/Pro: previews allowed) ---
  const isFormValid = description.trim().length >= 10 && budget && skillLevel;
  const remaining = Number(entitlements?.remaining ?? 0);
  const previewAllowed = Boolean(entitlements?.previewAllowed);
  
  // Upload is ALWAYS allowed (even on Free tier). We only gate the Preview button.
  const canUpload = true;
  
  // Preview requires: valid form AND plan quota AND previewAllowed AND image uploaded.
  const hasImage = Boolean(inputImageUrl);
  const canPreview = isFormValid && remaining > 0 && previewAllowed && hasImage;
  
  // Build without preview requires: valid form AND quota AND image uploaded (project exists).
  const canBuild = isFormValid && remaining > 0 && hasImage;

  const showToast = (message, type = 'success') => {
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
      // Haptics not available on this device
    }
  };

  useEffect(() => {
    if (!userId) return;
    
    const init = async () => {
      // Health ping
      try {
        const healthResp = await API.get('/health');
        if (healthResp.status === 200) {
          setLastHealthCheck(Date.now());
          setNetworkError(false);
        }
      } catch (healthErr) {
        setNetworkError(true);
      }

      // Fetch entitlements
      try {
        const data = await getEntitlements(userId);
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
  }, [userId]);

  const handleScanRoom = () => {
    if (canUpload) {
      navigation.navigate('ScanRoomIntro');
    }
  };

  const handleUploadPhoto = async () => {
    // Upload is always allowed, but form must be valid to create project
    if (!isFormValid) {
      showToast('Please complete all fields (10+ char description, budget, skill)', 'error');
      return;
    }
    
    if (isUploading) return;
    
    try {
      const asset = await pickRoomPhoto();
      if (!asset) return;

      setIsUploading(true);

      // Create project with error handling
      let projectData;
      try {
        projectData = await createProject({
          name: description.substring(0, 100),
          budget: budget,
          skill: skillLevel,
          user_id: userId || 'dev-user',
          status: 'pending',
        });

        // Check for permission errors or failed responses
        if (projectData.ok === false || !projectData.id) {
          showToast("Couldn't create your project (permission). Try again or contact support.", 'error');
          triggerHaptic('error');
          setIsUploading(false);
          return;
        }
      } catch (createError) {
        // Handle 403 or other errors
        if (createError.response && createError.response.status === 403) {
          showToast("Couldn't create your project (permission). Try again or contact support.", 'error');
        } else {
          showToast(createError.message || 'Failed to create project', 'error');
        }
        triggerHaptic('error');
        setIsUploading(false);
        return;
      }

      const currentProjectId = projectData.id;
      setProjectId(currentProjectId);

      // Upload via backend
      await uploadRoomPhoto(currentProjectId, asset);

      // Show immediately in the UI
      setInputImageUrl(asset.uri);

      showToast('Photo uploaded ✨', 'success');
      triggerHaptic('success');

    } catch (error) {
      console.error('Upload failed:', error);
      showToast(error.message || 'Upload failed', 'error');
      triggerHaptic('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBudgetSelect = (option) => {
    setBudget(option);
    setShowBudgetDropdown(false);
  };

  const handleSkillSelect = (option) => {
    setSkillLevel(option);
    setShowSkillDropdown(false);
  };

  const handleBudgetFocus = () => {
    setShowBudgetDropdown(!showBudgetDropdown);
  };

  const handleSkillFocus = () => {
    setShowSkillDropdown(!showSkillDropdown);
  };

  const startPollingStatus = async (projectId) => {
    const start = Date.now();
    const timeout = 60000;
    const pollInterval = 2000;

    while (Date.now() - start < timeout) {
      await new Promise(r => setTimeout(r, pollInterval));
      
      const response = await API.get(`/api/projects/${projectId}`);
      const project = response.data.item || response.data;
      
      // preview_ready → show preview_url
      if (project.status === 'preview_ready') {
        showToast('Preview ready!', 'success');
        triggerHaptic('success');
        setIsGeneratingPreview(false);
        
        setTimeout(() => {
          navigation.navigate('Project', { id: projectId });
        }, 800);
        return;
      }
      
      // preview_failed → show "Try again" with error from API
      if (project.status === 'preview_failed') {
        const errorMessage = project.error || 'Preview generation failed';
        showToast(`Try again: ${errorMessage}`, 'error');
        triggerHaptic('error');
        setIsGeneratingPreview(false);
        return;
      }
      
      // preview_requested → continue showing spinner (loop continues)
    }
    
    // Timeout - keep both buttons enabled
    showToast('Preview timed out. You can try again or continue without a preview.', 'error');
    setIsGeneratingPreview(false);
  };

  const handleGeneratePreview = async () => {
    if (!canPreview || isGeneratingPreview) return;

    setIsGeneratingPreview(true);

    try {
      const response = await API.post(`/api/projects/${projectId}/preview`, { user_id: userId });
      
      // Handle { ok:false, error } responses
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
    } catch (e) {
      console.error('Preview generation failed:', e);
      
      // Handle 409 error - preview already used
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
      
      const r = await API.post(`/api/projects/${projectId}/build-without-preview`, { user_id: userId });
      
      // Handle { ok:false, error } responses
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
    } catch (error) {
      console.error('Build without preview failed:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Could not build plan';
      showToast(errorMessage, 'error');
      triggerHaptic('error');
    } finally {
      setIsBuildingPlan(false);
    }
  };

  const debouncedGeneratePreview = useDebouncePress(handleGeneratePreview, 300);
  const debouncedUploadPhoto = useDebouncePress(handleUploadPhoto, 300);
  const debouncedBuildWithoutPreview = useDebouncePress(handleBuildWithoutPreview, 300);

  const TILE_SIZE = 160;
  const ICON_SIZE = 24;
  const LABEL_SIZE = 13;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 6,
          paddingBottom: 140,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Start a New Project</Text>
          <Text style={styles.subtitle}>Tell us what you'd like DIY Genie to help you build</Text>
          {__DEV__ && <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>API: {process.env.EXPO_PUBLIC_BASE_URL}</Text>}
          {networkError && __DEV__ && (
            <View style={styles.devBanner}>
              <Text style={styles.devBannerText}>Can't reach server. Check BASE_URL or CORS.</Text>
            </View>
          )}
        </View>

          {/* Description Input */}
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

          {/* Budget Dropdown */}
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

          {/* Skill Level Dropdown */}
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

        {/* Bottom: media section */}
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

          {/* Helper text */}
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
            /* Show tiles when no image uploaded */
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
              {/* Scan Room */}
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
                  color={canUpload ? '#F59E0B' : '#9CA3AF'} 
                  style={{ marginBottom: 4 }} 
                />
                <Text style={{
                  fontSize: LABEL_SIZE, 
                  fontWeight: '600', 
                  color: canUpload ? '#F59E0B' : '#9CA3AF'
                }}>
                  Scan Room
                </Text>
              </Pressable>

              {/* Upload Photo */}
              <Pressable
                disabled={!canUpload}
                style={({ pressed }) => ({
                  width: TILE_SIZE, height: 120, borderRadius: 16, marginVertical: 8,
                  justifyContent: 'center', alignItems: 'center',
                  backgroundColor: '#FFF',
                  borderWidth: 1, borderColor: '#E5E7EB',
                  opacity: !canUpload ? 0.4 : 1,
                  shadowColor: '#000', 
                  shadowOpacity: !canUpload ? 0 : 0.06, 
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 }, 
                  elevation: 6,
                  transform: [{ scale: pressed && canUpload ? 0.98 : 1 }],
                  pointerEvents: !canUpload ? 'none' : 'auto',
                })}
                onPress={debouncedUploadPhoto}
              >
                <Ionicons 
                  name="image" 
                  size={ICON_SIZE} 
                  color={canUpload ? '#1F2937' : '#9CA3AF'} 
                  style={{ marginBottom: 4 }} 
                />
                <Text style={{
                  fontSize: LABEL_SIZE, 
                  fontWeight: '600', 
                  color: canUpload ? '#1F2937' : '#9CA3AF'
                }}>
                  Upload Photo
                </Text>
              </Pressable>
            </View>
          ) : (
            /* Show uploaded photo with CTAs */
            <View style={styles.photoSection}>
              <Image source={{ uri: inputImageUrl }} style={styles.roomPhoto} resizeMode="cover" />
              <TouchableOpacity 
                onPress={debouncedUploadPhoto} 
                disabled={isUploading} 
                style={styles.changeLink}
              >
                <Text style={styles.changeLinkText}>
                  {isUploading ? 'Changing...' : 'Change photo'}
                </Text>
              </TouchableOpacity>

              {/* Show remaining projects */}
              {!loadingEntitlements && (
                <Text style={styles.helperText}>
                  {entitlements.remaining <= 0
                    ? 'Upgrade for AI preview & build plans'
                    : `${entitlements.remaining} of ${entitlements.quota} projects remaining`}
                </Text>
              )}

              <View style={styles.ctaCol}>
                <Pressable
                  onPress={debouncedGeneratePreview}
                  disabled={!canPreview}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    !canPreview && styles.primaryButtonDisabled,
                    { transform: [{ scale: pressed && canPreview ? 0.98 : 1 }] }
                  ]}
                >
                  {isGeneratingPreview ? (
                    <>
                      <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryButtonText}>Generating…</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryButtonText}>Generate AI Preview</Text>
                    </>
                  )}
                </Pressable>

                {!entitlements.previewAllowed && (
                  <Text style={styles.planNote}>
                    Preview isn't in your plan.{' '}
                    <Text style={styles.upgradeLink} onPress={() => navigation.navigate('Profile')}>
                      Upgrade
                    </Text>
                  </Text>
                )}

                <Pressable
                  onPress={debouncedBuildWithoutPreview}
                  disabled={!canBuild}
                  style={({ pressed }) => [
                    styles.outlineButton,
                    !canBuild && { opacity: 0.5 },
                    { transform: [{ scale: pressed && canBuild ? 0.98 : 1 }] }
                  ]}
                >
                  {isBuildingPlan ? (
                    <>
                      <ActivityIndicator size="small" color="#1F2937" style={{ marginRight: 8 }} />
                      <Text style={styles.outlineButtonText}>Building…</Text>
                    </>
                  ) : (
                    <Text style={styles.outlineButtonText}>Build Plan Without Preview</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      <Toast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type} 
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
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
    maxWidth: 300,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetDropdownPosition: {
    marginTop: -50,
  },
  skillDropdownPosition: {
    marginTop: 0,
  },
  dropdownOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.inter,
    color: colors.textPrimary,
  },
  tilesContainer: {
    zIndex: 0,
    elevation: 0,
  },
  tilesWrapper: {
    alignItems: 'center',
    zIndex: 0,
    elevation: 0,
  },
  helperText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.inter,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  roomPhoto: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  changeLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  changeLinkText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.interMedium,
    color: '#2563EB',
    fontWeight: '600',
  },
  ctaCol: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#FFF',
  },
  planNote: {
    fontSize: 13,
    fontFamily: typography.fontFamily.inter,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 4,
  },
  upgradeLink: {
    color: '#2563EB',
    fontWeight: '700',
  },
  outlineButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#1F2937',
  },
  devBanner: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  devBannerText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
});
