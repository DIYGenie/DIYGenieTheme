import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors.ts';
import { spacing, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function HomeScreen() {
  const handleNewProject = () => {
    // TODO: Navigate to new project creation
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header Card */}
          <View style={styles.headerCard}>
            <Text style={styles.title}>Home</Text>
            <Text style={styles.subtitle}>Welcome to DIY Genie!</Text>
            
            {/* New Project CTA Button */}
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleNewProject}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>New Project</Text>
            </TouchableOpacity>
          </View>

          {/* Projects Section */}
          <View style={styles.content}>
            <View style={styles.projectsSection}>
              <ProjectCard />
              <ProjectCard />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function ProjectCard() {
  return (
    <View style={styles.projectCard}>
      {/* Thumbnail Placeholder */}
      <View style={styles.thumbnailPlaceholder} />
      
      {/* Content */}
      <View style={styles.cardContent}>
        {/* Title Line */}
        <View style={styles.titlePlaceholder} />
        
        {/* Description Lines */}
        <View style={styles.descriptionPlaceholder} />
        <View style={[styles.descriptionPlaceholder, styles.descriptionShort]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.containerPadding,
    paddingBottom: spacing.xxxl,
  },
  headerCard: {
    backgroundColor: colors.surface,
    marginHorizontal: layout.containerPadding,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    // Web-specific shadow
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  ctaButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xxxl * 1.38,
    paddingVertical: spacing.md * 1.15,
    borderRadius: layout.borderRadius.full,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    // Web-specific shadow
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
  },
  ctaButtonText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.white,
    textAlign: 'center',
  },
  projectsSection: {
    width: '100%',
    gap: spacing.lg,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    // Web-specific shadow
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: colors.muted,
    borderRadius: layout.borderRadius.sm,
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  titlePlaceholder: {
    height: 16,
    backgroundColor: colors.textSecondary,
    opacity: 0.3,
    borderRadius: 4,
    marginBottom: spacing.sm,
    width: '70%',
  },
  descriptionPlaceholder: {
    height: 12,
    backgroundColor: colors.muted,
    borderRadius: 3,
    marginBottom: spacing.xs,
    width: '100%',
  },
  descriptionShort: {
    width: '60%',
  },
});