import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { brand, colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { supabase } from '../lib/supabase';
import { uploadRoomScan } from '../lib/uploadRoomScan';
import RoiModal from '../components/RoiModal';
import MeasureModal from '../components/MeasureModal';

export default function NewProjectMedia({ navigation, route }) {
  const onPickImage = route?.params?.onPickImage;
  const [savedScan, setSavedScan] = useState(null);
  const [showRoi, setShowRoi] = useState(false);
  const [showMeasure, setShowMeasure] = useState(false);

  async function authPreflight() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const user = data?.session?.user;
      if (!user) {
        Alert.alert('Session expired', 'Please sign in again.');
        await supabase.auth.signOut();
        throw new Error('AUTH_REQUIRED');
      }
      return user;
    } catch (e) {
      throw e;
    }
  }

  const pickFromLibrary = async () => {
    try {
      const user = await authPreflight();
      
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (!file.type?.startsWith?.('image/')) {
            Alert.alert('Invalid file', 'Please select an image');
            return;
          }
          
          const reader = new FileReader();
          reader.onerror = () => {
            Alert.alert('Upload failed', 'Failed to read file. Please try again.');
          };
          reader.onload = async () => {
            const dataUrl = String(reader.result);
            console.info('[photo] picked web (media screen)', { type: file.type, size: file.size });
            
            try {
              const result = await uploadRoomScan({
                uri: dataUrl,
                userId: user.id,
                projectId: null,
              });
              
              if (result?.imageUrl) {
                setSavedScan(result);
                Alert.alert('Success', 'Scan saved!');
              }
            } catch (err) {
              console.error('[upload failed]', err);
              Alert.alert('Upload failed', 'Could not save scan. Try again.');
            }
          };
          reader.readAsDataURL(file);
        };
        
        input.click();
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.85,
          selectionLimit: 1,
        });
        
        if (result.canceled) return;
        const asset = result.assets?.[0];
        if (!asset?.uri) return;

        console.info('[photo] picked native (media screen)', { uri: asset.uri });
        
        try {
          const uploadResult = await uploadRoomScan({
            uri: asset.uri,
            userId: user.id,
            projectId: null,
          });
          
          if (uploadResult?.imageUrl) {
            setSavedScan(uploadResult);
            Alert.alert('Success', 'Scan saved!');
          }
        } catch (err) {
          console.error('[upload failed]', err);
          Alert.alert('Upload failed', 'Could not save scan. Try again.');
        }
      }
    } catch (e) {
      if (e?.message === 'AUTH_REQUIRED') return;
      Alert.alert('Photo picker', e?.message || 'Could not select photo');
    }
  };

  const handleScanRoom = async () => {
    try {
      await authPreflight();
      Alert.alert('AR Scan', 'AR scan coming soon! Use Upload Photo for now.');
    } catch (_) {
      // Already handled in authPreflight (alert + signOut)
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add Room Photo</Text>
          <Text style={styles.subtitle}>Scan your room or upload a photo to begin.</Text>
        </View>

        {/* Media Options */}
        <View style={styles.mediaOptions}>
          <TouchableOpacity 
            style={styles.scanRoomTile} 
            onPress={handleScanRoom}
            testID="btn-scan-room"
          >
            <Ionicons name="camera" size={28} color={brand.primary} style={styles.tileIcon} />
            <Text style={styles.scanRoomText}>Scan Room</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.uploadPhotoTile} 
            onPress={pickFromLibrary}
            testID="btn-upload-photo"
          >
            <Ionicons name="image" size={28} color="#64748B" style={styles.tileIcon} />
            <Text style={styles.uploadPhotoText}>Upload Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Saved Scan Card */}
        {savedScan && (
          <View style={styles.savedScanCard}>
            <Image
              source={{ uri: savedScan.imageUrl }}
              style={styles.scanImage}
              resizeMode="cover"
            />
            <Text style={styles.savedScanTitle}>Saved Scan</Text>
            <View style={styles.scanActions}>
              <Pressable
                onPress={() => setShowRoi(true)}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>Mark Area</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowMeasure(true)}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>Measure</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Modals */}
      <RoiModal visible={showRoi} onClose={() => setShowRoi(false)} scan={savedScan} />
      <MeasureModal visible={showMeasure} onClose={() => setShowMeasure(false)} scan={savedScan} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 22,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.interMedium,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  mediaOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  scanRoomTile: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: brand.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
  },
  uploadPhotoTile: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
  },
  tileIcon: {
    marginBottom: 8,
  },
  scanRoomText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: brand.primary,
    textAlign: 'center',
  },
  uploadPhotoText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#64748B',
    textAlign: 'center',
  },
  savedScanCard: {
    marginTop: 32,
    backgroundColor: '#F3F0FF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  scanImage: {
    width: 220,
    height: 140,
    borderRadius: 12,
  },
  savedScanTitle: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#1F2937',
  },
  scanActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: typography.fontFamily.manropeSemiBold,
  },
});
