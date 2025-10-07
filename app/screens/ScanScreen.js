import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PressableScale from '../components/ui/PressableScale';

export default function ScanScreen({ navigation }) {
  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="scan-outline" size={64} color={colors.brand} />
        </View>

        <Text style={styles.title}>Scan coming soon</Text>
        <Text style={styles.subtitle}>
          We just set up permissions. The room scanner will be available here soon.
        </Text>

        <PressableScale
          onPress={handleBack}
          haptic="medium"
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back to Home</Text>
        </PressableScale>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: typography.fontFamily.manropeBold,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ctaShadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    width: '100%',
    maxWidth: 280,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: colors.onBrand,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: typography.fontFamily.manropeBold,
  },
});
