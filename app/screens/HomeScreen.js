import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors.ts';
import { spacing, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function HomeScreen({ navigation }) {
  const handleNewProject = () => {
    navigation.navigate('HowItWorks');
  };

  const handleScanRoom = () => {
    // TODO: Navigate to room scanning
  };

  const handleUploadPhoto = () => {
    // TODO: Navigate to photo upload
  };

  return (
    <SafeAreaView style={styles.container}>
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

        {/* Welcome Header */}
        <View style={styles.welcomeHeader}>
          <Text style={styles.welcomeTitle}>Welcome back, Tye</Text>
          <Text style={styles.welcomeSubtitle}>Ready to start your next DIY project?</Text>
        </View>

        {/* CTA Tiles */}
        <View style={styles.ctaRow}>
          <TouchableOpacity style={styles.scanRoomTile} onPress={handleScanRoom}>
            <Ionicons name="camera" size={28} color="#F59E0B" style={styles.tileIcon} />
            <Text style={styles.scanRoomText}>Scan Room</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.uploadPhotoTile} onPress={handleUploadPhoto}>
            <Ionicons name="image" size={28} color="#1F2937" style={styles.tileIcon} />
            <Text style={styles.uploadPhotoText}>Upload Photo</Text>
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
    </SafeAreaView>
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
    backgroundColor: colors.surface,
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
    color: '#0F172A',
    marginBottom: 24,
  },
  projectsSection: {
    gap: 16,
    paddingBottom: spacing.xxxl,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
  welcomeHeader: {
    marginTop: 20,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#0F172A',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.interMedium,
    color: '#475569',
    lineHeight: 21, // 1.5 line height
  },
  ctaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 24,
    marginBottom: 32,
  },
  scanRoomTile: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    minHeight: 120,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#FBBF24',
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
    // Web-specific shadow
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
  },
  uploadPhotoTile: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    minHeight: 120,
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
    // Web-specific shadow
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
    color: '#1F2937',
    textAlign: 'center',
  },
});