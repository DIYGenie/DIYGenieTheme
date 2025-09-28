import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const handleGetStarted = () => {
    navigation.navigate('Home');
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* App Icon */}
          <View style={styles.iconContainer}>
            <Image
              source={require('../../assets/Icon.png')}
              style={styles.appIcon}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>DIY Genie</Text>

          {/* Tagline */}
          <Text style={styles.tagline}>Wish. See. Build.</Text>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.containerPadding,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  appIcon: {
    width: layout.iconSize.appIcon,
    height: layout.iconSize.appIcon,
  },
  title: {
    fontSize: typography.fontSize.title,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  spacer: {
    flex: 0.3,
  },
  ctaButton: {
    backgroundColor: colors.ctaOrange,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: layout.borderRadius.full,
    marginBottom: spacing.xl,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaButtonText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.white,
    textAlign: 'center',
  },
});