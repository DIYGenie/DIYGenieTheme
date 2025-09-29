import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Start a New Project</Text>
          <Text style={styles.subtitle}>Tell us what you'd like DIY Genie to help you build</Text>
        </View>

        {/* Description Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Project Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="e.g. Build 3 floating shelves for living room wall (minimum 10 characters)"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/10 characters minimum</Text>
        </View>

        {/* Budget Dropdown */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Budget</Text>
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowBudgetDropdown(!showBudgetDropdown)}
          >
            <Text style={[styles.dropdownText, !budget && styles.placeholderText]}>
              {budget || 'Select budget range'}
            </Text>
            <Ionicons 
              name={showBudgetDropdown ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
          
          {showBudgetDropdown && (
            <View style={styles.dropdownOptions}>
              {budgetOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.dropdownOption}
                  onPress={() => handleBudgetSelect(option)}
                >
                  <Text style={styles.dropdownOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Skill Level Dropdown */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Skill Level</Text>
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowSkillDropdown(!showSkillDropdown)}
          >
            <Text style={[styles.dropdownText, !skillLevel && styles.placeholderText]}>
              {skillLevel || 'Select skill level'}
            </Text>
            <Ionicons 
              name={showSkillDropdown ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
          
          {showSkillDropdown && (
            <View style={styles.dropdownOptions}>
              {skillOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.dropdownOption}
                  onPress={() => handleSkillSelect(option)}
                >
                  <Text style={styles.dropdownOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        </ScrollView>
        
        {/* Sticky Bottom Action Bar */}
        <View style={styles.bottomActionBar}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.scanRoomButton, !isFormValid && styles.actionButtonDisabled]}
            onPress={handleScanRoom}
            disabled={!isFormValid}
          >
            <Ionicons name="camera" size={24} color={isFormValid ? '#F59E0B' : '#9CA3AF'} />
            <Text style={[styles.scanRoomText, !isFormValid && styles.actionButtonTextDisabled]}>Scan Room</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.uploadPhotoButton, !isFormValid && styles.actionButtonDisabled]}
            onPress={handleUploadPhoto}
            disabled={!isFormValid}
          >
            <Ionicons name="image" size={24} color={isFormValid ? '#1F2937' : '#9CA3AF'} />
            <Text style={[styles.uploadPhotoText, !isFormValid && styles.actionButtonTextDisabled]}>Upload Photo</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.interMedium,
    color: '#475569',
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 24,
    position: 'relative',
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
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontFamily: typography.fontFamily.inter,
    color: colors.textPrimary,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    marginTop: 4,
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
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
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    marginTop: 4,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
    // Web-specific shadow
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
    zIndex: 1000,
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
  bottomActionBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    width: '49%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
    // Web-specific shadow
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
  },
  actionButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
    boxShadow: 'none',
  },
  scanRoomButton: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#FBBF24',
  },
  uploadPhotoButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scanRoomText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#F59E0B',
    marginTop: 6,
  },
  uploadPhotoText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#1F2937',
    marginTop: 6,
  },
  actionButtonTextDisabled: {
    color: '#9CA3AF',
  },
});