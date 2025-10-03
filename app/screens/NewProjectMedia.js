import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function NewProjectMedia({ navigation, route }) {
  const onPickImage = route?.params?.onPickImage;

  const pickFromLibrary = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
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
          reader.onload = () => {
            const dataUrl = String(reader.result);
            console.info('[photo] picked web (media screen)', { type: file.type, size: file.size });
            if (onPickImage) {
              onPickImage(dataUrl);
              navigation.goBack();
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
        if (onPickImage) {
          onPickImage(asset.uri);
          navigation.goBack();
        }
      }
    } catch (e) {
      Alert.alert('Photo picker', e?.message || 'Could not select photo');
    }
  };

  const handleScanRoom = () => {
    Alert.alert('AR Scan (stub)', 'Use Upload Photo for now');
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
            <Ionicons name="camera" size={28} color="#F59E0B" style={styles.tileIcon} />
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
      </View>
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
    borderColor: '#F59E0B',
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
    color: '#F59E0B',
    textAlign: 'center',
  },
  uploadPhotoText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#64748B',
    textAlign: 'center',
  },
});
