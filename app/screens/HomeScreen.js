import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors.ts';
import { spacing, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function HomeScreen() {
  const handleNewProject = () => {
    // TODO: Navigate to new project creation
  };

  const handleScanRoom = () => {
    // TODO: Navigate to room scanning
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Home</Text>
          <View style={styles.avatarPlaceholder} />
        </View>

        {/* Content Sheet - overlaps gradient */}
        <View style={styles.contentSheet}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search projects…"
                placeholderTextColor={colors.textSecondary}
                editable={false}
              />
            </View>

            {/* How it works section */}
            <View style={styles.howItWorksSection}>
              <Text style={styles.howItWorksTitle}>How DIY Genie Works</Text>
              
              <View style={styles.stepCardsRow}>
                <View style={styles.stepCard}>
                  <Ionicons name="camera" size={24} color={colors.textSecondary} style={styles.stepIcon} />
                  <Text style={styles.stepText}>Add your room</Text>
                </View>
                
                <View style={styles.stepCard}>
                  <Ionicons name="create" size={24} color={colors.textSecondary} style={styles.stepIcon} />
                  <Text style={styles.stepText}>Tell us the goal</Text>
                </View>
                
                <View style={styles.stepCard}>
                  <Ionicons name="sparkles" size={24} color={colors.textSecondary} style={styles.stepIcon} />
                  <Text style={styles.stepText}>See & build</Text>
                </View>
              </View>
              
              {/* Primary CTA */}
              <TouchableOpacity style={styles.primaryCTA} onPress={handleNewProject}>
                <Ionicons name="sparkles" size={20} color={colors.white} style={styles.ctaIcon} />
                <View style={styles.ctaTextContainer}>
                  <Text style={styles.ctaMainText}>Start a Project</Text>
                  <Text style={styles.ctaSubText}>Upload photo or Scan room</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Section Header */}
            <Text style={styles.sectionHeader}>Recent Projects</Text>

            {/* Project Cards */}
            <View style={styles.projectsSection}>
              <ProjectCard />
              <ProjectCard />
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function ProjectCard() {
  return (
    <TouchableOpacity style={styles.projectCard}>
      {/* Thumbnail Placeholder */}
      <View style={styles.thumbnailPlaceholder} />
      
      {/* Content */}
      <View style={styles.cardContent}>
        {/* Title */}
        <Text style={styles.cardTitle}>DIY Kitchen Cabinet</Text>
        
        {/* Subtitle */}
        <Text style={styles.cardSubtitle}>3 steps remaining</Text>
      </View>
      
      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: spacing.md,
    backgroundColor: colors.brandPurpleDeep,
  },
  topBarTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.white,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    backgroundColor: colors.muted,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    // Web-specific shadow
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.04)',
  },
  contentSheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -14, // Overlap gradient by 14px
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 16, // rounded-2xl
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: 24,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.inter,
    color: colors.textPrimary,
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 20,
  },
  projectsSection: {
    gap: 16,
    paddingBottom: spacing.xxxl,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
    // Web-specific shadow
    boxShadow: '0px 6px 24px rgba(0, 0, 0, 0.08)',
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    backgroundColor: colors.muted,
    borderRadius: 12,
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
  },
  howItWorksSection: {
    marginBottom: 24,
  },
  howItWorksTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  stepCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  stepCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    // Web-specific shadow
    boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.04)',
  },
  stepIcon: {
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  primaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 26, // pill shape
    paddingHorizontal: 24,
    paddingVertical: 16,
    height: 52,
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
  ctaIcon: {
    marginRight: 12,
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaMainText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.white,
    marginBottom: 2,
  },
  ctaSubText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.inter,
    color: colors.white,
    opacity: 0.8,
  },
});