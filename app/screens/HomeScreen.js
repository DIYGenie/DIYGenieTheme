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

            {/* Onboarding Card */}
            <View style={styles.onboardingCard}>
              <Text style={styles.onboardingTitle}>Getting Started with DIY Genie</Text>
              
              <View style={styles.bulletPoints}>
                <View style={styles.bulletPoint}>
                  <Ionicons name="camera-outline" size={16} color={colors.textSecondary} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>Upload or scan your room</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="create-outline" size={16} color={colors.textSecondary} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>Describe your project</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Ionicons name="bulb-outline" size={16} color={colors.textSecondary} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>Get your AI plan + preview</Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.ctaButton} onPress={handleNewProject}>
                <Text style={styles.ctaButtonText}>Start Your First Project</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={[styles.quickAction, styles.newProjectAction]} onPress={handleNewProject}>
                <Ionicons name="add" size={32} color={colors.accent} />
                <Text style={styles.newProjectText}>New Project</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.quickAction, styles.scanRoomAction]} onPress={handleScanRoom}>
                <Ionicons name="camera" size={32} color={colors.textPrimary} />
                <Text style={styles.scanRoomText}>Scan Room</Text>
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
    backgroundColor: colors.surface,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    // Web-specific shadow
    boxShadow: '0px 2px 16px rgba(0, 0, 0, 0.06)',
  },
  topBarTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    backgroundColor: colors.muted,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.muted,
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
  quickActionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  quickAction: {
    flex: 1,
    minHeight: 116,
    borderRadius: 20,
    justifyContent: 'center',
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
  newProjectAction: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  scanRoomAction: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  newProjectText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.accent,
    marginTop: 8,
    textAlign: 'center',
  },
  scanRoomText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
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
  onboardingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16, // rounded-xl
    padding: 20,
    marginBottom: 24,
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
  onboardingTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  bulletPoints: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulletIcon: {
    marginRight: 12,
  },
  bulletText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    flex: 1,
  },
  ctaButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24, // pill shape
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
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.surface,
    textAlign: 'center',
  },
});