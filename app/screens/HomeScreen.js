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

        {/* Content Sheet */}
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

            {/* Quick Actions */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={[styles.quickAction, styles.newProjectAction]} onPress={handleNewProject}>
                <Ionicons name="add" size={38} color={colors.surface} />
                <Text style={styles.newProjectText}>New Project</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.quickAction, styles.scanRoomAction]} onPress={handleScanRoom}>
                <Ionicons name="camera" size={38} color={colors.textPrimary} />
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
        {/* Title Line */}
        <View style={styles.titlePlaceholder} />
        
        {/* Description Lines */}
        <View style={styles.descriptionPlaceholder} />
        <View style={[styles.descriptionPlaceholder, styles.descriptionShort]} />
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
    paddingHorizontal: layout.containerPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    // Web-specific shadow
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
  },
  topBarTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: colors.muted,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.surface,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    // Web-specific shadow
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.08)',
  },
  contentSheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    // Web-specific shadow
    boxShadow: '0px -4px 16px rgba(0, 0, 0, 0.1)',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: layout.containerPadding,
    paddingTop: spacing.xl,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: layout.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
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
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  quickAction: {
    width: 120,
    height: 120,
    borderRadius: layout.borderRadius.lg,
    justifyContent: 'center',
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
  newProjectAction: {
    backgroundColor: colors.accent,
  },
  scanRoomAction: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  newProjectText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.surface,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  scanRoomText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  projectsSection: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
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