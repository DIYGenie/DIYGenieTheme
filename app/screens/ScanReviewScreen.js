import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PressableScale from '../components/ui/PressableScale';
import { emitScanPhoto } from '../lib/scanEvents';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ScanReviewScreen({ route, navigation }) {
  const { photoUri } = route.params || {};

  const handleRetake = () => {
    navigation.goBack();
  };

  const handleUsePhoto = () => {
    if (photoUri) {
      emitScanPhoto(photoUri);
      navigation.navigate('NewProject');
    }
  };

  if (!photoUri) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.errorText}>No photo to review</Text>
          <PressableScale
            onPress={() => navigation.goBack()}
            haptic="light"
            style={styles.errorButton}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />

      {/* Top gradient overlay for better back button visibility */}
      <View style={styles.topGradient} />

      <SafeAreaView style={styles.safeArea}>
        {/* Back button */}
        <PressableScale
          onPress={handleRetake}
          haptic="light"
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={colors.onBrand} />
        </PressableScale>

        {/* Bottom action buttons */}
        <View style={styles.actionsContainer}>
          <PressableScale
            onPress={handleRetake}
            haptic="light"
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel="Retake photo"
            style={styles.secondaryButton}
          >
            <Ionicons name="camera-reverse-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.secondaryButtonText}>Retake</Text>
          </PressableScale>

          <PressableScale
            onPress={handleUsePhoto}
            haptic="medium"
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel="Use this photo"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Use Photo</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  photo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  safeArea: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: typography.fontFamily.manropeSemiBold,
  },
  primaryButton: {
    flex: 2,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ctaShadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryButtonText: {
    color: colors.onBrand,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: typography.fontFamily.manropeBold,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeSemiBold,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  errorButtonText: {
    color: colors.brand,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: typography.fontFamily.manropeSemiBold,
  },
});
