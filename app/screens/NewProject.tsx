import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Modal, ActivityIndicator, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const BASE = process.env.EXPO_PUBLIC_BASE_URL || 'https://api.diygenieapp.com';
const USER_ID = (globalThis as any).__DEV_USER_ID__ || 'e4cb3591-7272-46dd-b1f6-d7cc4e2f3d24';

async function postJSON(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

async function api(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  
  try {
    const res = await fetch(`${BASE}${path}`, {
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
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [skill, setSkill] = useState('');
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [sugs, setSugs] = useState<any | null>(null);
  const [sugsBusy, setSugsBusy] = useState(false);
  const [promptText, setPromptText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const budgetOptions = ['$', '$$', '$$$'];
  const skillOptions = ['Beginner', 'Intermediate', 'Advanced'];

  const formReady = description.trim().length >= 10 && budget && skill && photoUri;

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

  async function createProject() {
    if (creating) return;
    if (!description || description.trim().length < 10) {
      Alert.alert('Tell us a bit more', 'Please enter at least 10 characters for the project description.');
      return;
    }
    if (!budget || !skill) {
      Alert.alert('Missing info', 'Please choose a budget and skill level.');
      return;
    }

    setCreating(true);
    try {
      let res = await postJSON(`${BASE}/api/projects`, {
        user_id: USER_ID,
        name: description.trim(),
        budget,
        skill_level: skill,
      });

      if (!res.ok) {
        const firstErr = res?.data?.error || res?.data?.message || `HTTP ${res.status}`;
        const fallback = await postJSON(`${BASE}/api/projects`, {
          user_id: 'auto',
          name: description.trim(),
          budget,
          skill_level: skill,
        });
        if (!fallback.ok) {
          const secondErr = fallback?.data?.error || fallback?.data?.message || `HTTP ${fallback.status}`;
          throw new Error(`Create failed.\nFirst: ${firstErr}\nThen (auto): ${secondErr}`);
        }
        res = fallback;
      }

      const projectId =
        res?.data?.item?.id || res?.data?.id || res?.data?.project?.id || res?.data?.item_id;
      if (!projectId) {
        throw new Error('Create succeeded but no project ID was returned.');
      }

      setDraftId(projectId);
      
      if (!promptText) {
        setPromptText(`Build plan for: ${description.trim()}. Budget: ${budget}. Skill: ${skill}.`);
      }
      
      return projectId;
    } catch (e: any) {
      const msg = String(e?.message || e);
      Alert.alert('Couldn\'t create project', msg);
      return null;
    } finally {
      setCreating(false);
    }
  }

  const ensureDraft = async () => {
    if (draftId) return draftId;
    return await createProject();
  };

  const fetchSuggestions = async () => {
    if (sugsBusy) return;
    
    setSugsBusy(true);
    
    try {
      const pid = await ensureDraft();
      if (!pid) {
        setSugsBusy(false);
        return;
      }
      
      const response = await api(`/api/projects/${pid}/suggestions`, {
        method: 'POST',
        body: JSON.stringify({ user_id: USER_ID }),
      });
      
      if (response.ok && response.bullets) {
        setSugs({ bullets: response.bullets.slice(0, 5) || [], tags: response.tags || [] });
      }
    } catch (e: any) {
      console.error('Suggestions fetch failed:', e);
    } finally {
      setSugsBusy(false);
    }
  };

  useEffect(() => {
    if (formReady && !sugs && !sugsBusy) {
      fetchSuggestions();
    }
  }, [formReady]);

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
          reader.onload = () => resolve(String(reader.result));
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
    return uri;
  }

  const onUploadPhoto = async () => {
    try {
      const uri = Platform.OS === 'web' ? await pickPhotoWeb() : await pickPhotoNative();
      setPhotoUri(uri);
      if (fetchSuggestions) {
        setSugsBusy(true);
        try { 
          await fetchSuggestions(); 
        } finally { 
          setSugsBusy(false); 
        }
      }
    } catch (err: any) {
      Alert.alert('Photo picker', err?.message || 'Could not select photo');
    }
  };

  const generatePlan = async () => {
    if (isGenerating) return;
    
    try {
      setIsGenerating(true);
      
      const pid = await ensureDraft();
      if (!pid) {
        Alert.alert('Error', 'Could not create project');
        setIsGenerating(false);
        return;
      }
      
      await api(`/api/projects/${pid}/build-without-preview`, {
        method: 'POST',
        body: JSON.stringify({ 
          user_id: USER_ID, 
          prompt: promptText || description 
        }),
      });
      
      triggerHaptic('success');
      
      setTimeout(() => {
        navigation.navigate('Projects', { screen: 'ProjectDetails', params: { id: pid } });
      }, 400);
    } catch (e: any) {
      console.error('Plan generation failed:', e);
      Alert.alert('Error', 'Could not generate plan. Please try again.');
      triggerHaptic('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBudgetSelect = (option: string) => {
    setBudget(option);
    setShowBudgetDropdown(false);
  };

  const handleSkillSelect = (option: string) => {
    setSkill(option);
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
              <Text style={[styles.dropdownText, !skill && styles.placeholderText]}>
                {skill || 'Select skill level'}
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
                We'll upload your photo later when you request a visual preview.
              </Text>
            </View>
          )}
        </View>

        {formReady && (
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
              disabled={isGenerating || creating || !promptText?.trim()}
              style={({ pressed }) => [
                styles.primaryButton,
                (isGenerating || creating || !promptText?.trim()) && styles.primaryButtonDisabled,
                { marginTop: 12, transform: [{ scale: pressed && !isGenerating && !creating && promptText?.trim() ? 0.98 : 1 }] }
              ]}
              accessibilityRole="button"
            >
              {isGenerating || creating ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>{isGenerating ? 'Generating…' : 'Creating…'}</Text>
                </>
              ) : (
                <Text style={styles.primaryButtonText}>Generate Plan</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
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
});
