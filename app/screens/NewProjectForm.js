import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform, useWindowDimensions, Modal, ActivityIndicator, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { getEntitlements, createProject, updateProject, requestPreview, getProject, ApiError, uploadRoomPhoto } from '../lib/api';
import { pickRoomPhoto } from '../lib/storage';
import Toast from '../components/Toast';
import { useDebouncePress } from '../lib/hooks';
import { BASE_URL } from '../config';

export default function NewProjectForm({ navigation }) {
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [entitlements, setEntitlements] = useState({ remaining: 0, quota: 0, tier: 'free' });
  const [loadingEntitlements, setLoadingEntitlements] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [inputImageUrl, setInputImageUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [networkError, setNetworkError] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState(0);
  const userId = '4e599cea-dfe5-4a8f-9738-bea3631ee4e6';
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { height: H } = useWindowDimensions();
  const isSmall = H < 740;
  const isVerySmall = H < 680;

  const budgetOptions = ['$', '$$', '$$$'];
  const skillOptions = ['Beginner', 'Intermediate', 'Advanced'];

  const isFormValid = description.trim().length >= 10 && budget && skillLevel;
  const canUpload = isFormValid && entitlements.remaining > 0 && !isUploading;
  const canPreview = entitlements && entitlements.tier !== 'Free' && (entitlements.remaining ?? 0) > 0;

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
    const init = async () => {
      // Health ping
      try {
        const healthResp = await fetch(`${BASE_URL}/health`, { method: 'GET' });
        if (healthResp.ok) {
          setLastHealthCheck(Date.now());
          setNetworkError(false);
        } else {
          throw new Error('Health check failed');
        }
      } catch (healthErr) {
        setNetworkError(true);
      }

      // Fetch entitlements
      try {
        const data = await getEntitlements(userId);
        setEntitlements(data);
        if (Date.now() - lastHealthCheck < 60000) {
          setNetworkError(false);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 0) {
          if (Date.now() - lastHealthCheck >= 60000) {
            setNetworkError(true);
          }
        }
        setEntitlements({ tier: 'Free', quota: 5, remaining: 5 });
      } finally {
        setLoadingEntitlements(false);
      }
    };
    
    init();
  }, []);

  const handleScanRoom = () => {
    if (canUpload) {
      navigation.navigate('ScanRoomIntro');
    }
  };

  const handleUploadPhoto = async () => {
    if (!canUpload || isUploading) return;
    
    try {
      const asset = await pickRoomPhoto();
      if (!asset) {
        showToast('Permission needed to access photos', 'error');
        return;
      }

      setIsUploading(true);

      // Step 1: Create project
      const projectData = await createProject({
        user_id: userId || 'dev-user',
        name: description.substring(0, 100),
        budget: budget,
        skill: skillLevel,
        status: 'pending',
      });

      const currentProjectId = projectData.id;
      setProjectId(currentProjectId);

      // Step 2: Upload via backend (sets input_image_url and status='preview_requested')
      const { url } = await uploadRoomPhoto(currentProjectId, asset);
      setInputImageUrl(url);

      // Success!
      showToast('Photo uploaded!', 'success');
      triggerHaptic('success');

      // Step 3: Start preview flow automatically
      setIsGeneratingPreview(true);
      
      // poll status until ready (60s max)
      const start = Date.now();
      while (Date.now() - start < 60000) {
        const { item } = await getProject(currentProjectId);
        if (item?.status === 'preview_ready') {
          showToast('Preview ready!', 'success');
          triggerHaptic('success');
          setIsGeneratingPreview(false);
          return;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      
      showToast('Preview timeout', 'error');
      setIsGeneratingPreview(false);

    } catch (error) {
      console.error('Upload failed:', error);
      showToast(`Upload failed: ${error.message || 'Unknown error'}`, 'error');
      triggerHaptic('error');
      setIsGeneratingPreview(false);
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

  const handleGeneratePreview = async () => {
    if (!projectId || !inputImageUrl || isGeneratingPreview) return;

    setIsGeneratingPreview(true);

    try {
      await requestPreview(projectId);

      // poll status until ready (60s max)
      const start = Date.now();
      while (Date.now() - start < 60000) {
        const { item } = await getProject(projectId);
        if (item?.status === 'preview_ready') {
          showToast('Preview ready!', 'success');
          triggerHaptic('success');
          setTimeout(() => {
            navigation.navigate('Projects', { refresh: true });
          }, 800);
          return;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      Alert.alert('Preview timed out. Please try again.');
      setIsGeneratingPreview(false);
    } catch (e) {
      Alert.alert('Preview failed', String(e));
      triggerHaptic('error');
      setIsGeneratingPreview(false);
    }
  };

  const handleBuildWithoutPreview = () => {
    if (!projectId) return;
    
    triggerHaptic('success');
    navigation.navigate('Projects', { refresh: true });
  };

  const debouncedGeneratePreview = useDebouncePress(handleGeneratePreview, 300);
  const debouncedUploadPhoto = useDebouncePress(handleUploadPhoto, 300);

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
          {__DEV__ && <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>API: {BASE_URL}</Text>}
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
        <View style={[styles.tilesContainer, { opacity: isUploading || isGeneratingPreview ? 0.6 : 1, pointerEvents: isUploading || isGeneratingPreview ? 'none' : 'auto' }]}>
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
                  ? 'Complete fields to continue'
                  : entitlements.remaining <= 0
                  ? 'Upgrade to continue'
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

              <View style={styles.ctaCol}>
                <Pressable
                  onPress={debouncedGeneratePreview}
                  disabled={!canPreview || isGeneratingPreview}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (!canPreview || isGeneratingPreview) && styles.primaryButtonDisabled,
                    { transform: [{ scale: pressed && canPreview && !isGeneratingPreview ? 0.98 : 1 }] }
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

                {!canPreview && (
                  <Text style={styles.planNote}>
                    Preview isn't included in your current plan.{' '}
                    <Text style={styles.upgradeLink} onPress={() => navigation.navigate('Profile')}>
                      Upgrade
                    </Text>
                  </Text>
                )}

                <Pressable
                  onPress={handleBuildWithoutPreview}
                  style={({ pressed }) => [
                    styles.outlineButton,
                    { transform: [{ scale: pressed ? 0.98 : 1 }] }
                  ]}
                >
                  <Text style={styles.outlineButtonText}>Build Plan Without Preview</Text>
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
    // Web-specific shadow
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
  scanRoomText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#F59E0B',
  },
  uploadPhotoText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#1F2937',
  },
  actionButtonTextDisabled: {
    color: '#9CA3AF',
  },
  generateButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  generateButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#FFFFFF',
  },
  devBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  devBannerText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.inter,
    color: '#D97706',
    fontWeight: '600',
  },
  photoSection: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 12,
  },
  roomPhoto: {
    width: '92%',
    aspectRatio: 4 / 3,
    borderRadius: 14,
    backgroundColor: '#F2F3F5',
  },
  changeLink: {
    paddingVertical: 6,
  },
  changeLinkText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
  },
  ctaCol: {
    width: '92%',
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#FFFFFF',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#1F2937',
  },
  planNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: -4,
    textAlign: 'center',
    fontFamily: typography.fontFamily.inter,
  },
  upgradeLink: {
    color: '#2563EB',
    fontWeight: '700',
  },
});