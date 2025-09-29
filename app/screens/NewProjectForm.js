import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform, useWindowDimensions, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function NewProjectForm({ navigation }) {
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { height: H } = useWindowDimensions();
  const isSmall = H < 740;
  const isVerySmall = H < 680;

  const budgetOptions = ['$', '$$', '$$$'];
  const skillOptions = ['Beginner', 'Intermediate', 'Advanced'];

  const isFormValid = description.trim().length >= 10 && budget && skillLevel;

  const handleScanRoom = () => {
    if (isFormValid) {
      navigation.navigate('ScanRoomIntro');
    }
  };

  const handleUploadPhoto = async () => {
    if (!isFormValid) return;
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission required', 'Please allow camera roll access to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      navigation.navigate('ProjectPreview', {
        imageUri: result.assets[0].uri,
        description,
        budget,
        skill: skillLevel
      });
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

  const TILE = isVerySmall ? 88 : isSmall ? 92 : 104;
  const GAP = isSmall ? 10 : 12;
  const ICON_SIZE = isSmall ? 22 : 24;
  const LABEL_SIZE = isVerySmall ? 12 : 13;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
      <View style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 6,
        paddingBottom: tabBarHeight + insets.bottom + 8,
        justifyContent: 'space-between'
      }}>
        {/* Top: title + form */}
        <View>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Start a New Project</Text>
          <Text style={styles.subtitle}>Tell us what you'd like DIY Genie to help you build</Text>
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
        </View>

        {/* Bottom: media section with stacked tiles */}
        <View style={styles.tilesContainer}>
          <View style={{ 
            marginTop: 12, 
            marginBottom: 8, 
            alignItems: 'center' 
          }}>
            <View style={{ height: 1, width: '100%', backgroundColor: 'rgba(229,231,235,0.9)' }} />
            <Text style={{
              position: 'absolute', top: -9, paddingHorizontal: 8,
              backgroundColor: '#FFF', color: '#6B7280', fontSize: 12, fontWeight: '600'
            }}>
              Add your room photo
            </Text>
          </View>

          {/* Stacked tiles */}
          <View style={[styles.tilesWrapper, { gap: GAP }]}>
            {/* Scan Room */}
            <Pressable
              disabled={!isFormValid}
              style={({ pressed }) => ({
                width: TILE, height: TILE, borderRadius: 16,
                justifyContent: 'center', alignItems: 'center',
                backgroundColor: '#FFF',
                borderWidth: 1.5, borderColor: '#FBBF24',
                opacity: !isFormValid ? 0.6 : 1,
                shadowColor: '#000', 
                shadowOpacity: !isFormValid ? 0 : 0.06, 
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 }, 
                elevation: 6,
                transform: [{ scale: pressed && isFormValid ? 0.98 : 1 }],
              })}
              onPress={handleScanRoom}
            >
              <Ionicons 
                name="camera" 
                size={ICON_SIZE} 
                color={isFormValid ? '#F59E0B' : '#9CA3AF'} 
                style={{ marginBottom: 4 }} 
              />
              <Text style={{
                fontSize: LABEL_SIZE, 
                fontWeight: '600', 
                color: isFormValid ? '#F59E0B' : '#9CA3AF'
              }}>Scan Room</Text>
            </Pressable>

            {/* Upload Photo */}
            <Pressable
              disabled={!isFormValid}
              style={({ pressed }) => ({
                width: TILE, height: TILE, borderRadius: 16,
                justifyContent: 'center', alignItems: 'center',
                backgroundColor: '#FFF',
                borderWidth: 1, borderColor: '#E5E7EB',
                opacity: !isFormValid ? 0.6 : 1,
                shadowColor: '#000', 
                shadowOpacity: !isFormValid ? 0 : 0.06, 
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 }, 
                elevation: 6,
                transform: [{ scale: pressed && isFormValid ? 0.98 : 1 }],
              })}
              onPress={handleUploadPhoto}
            >
              <Ionicons 
                name="image" 
                size={ICON_SIZE} 
                color={isFormValid ? '#1F2937' : '#9CA3AF'} 
                style={{ marginBottom: 4 }} 
              />
              <Text style={{
                fontSize: LABEL_SIZE, 
                fontWeight: '600', 
                color: isFormValid ? '#1F2937' : '#9CA3AF'
              }}>Upload Photo</Text>
            </Pressable>
          </View>
        </View>
      </View>
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
});