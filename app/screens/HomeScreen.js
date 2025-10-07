import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { brand, colors } from '../../theme/colors.ts';
import { spacing, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { listProjects } from '../lib/api';
import { useUser } from '../lib/useUser';
import HowItWorksTile from '../components/HowItWorksTile';
import PressableScale from '../components/ui/PressableScale';

function HowItWorks({ navigation }) {
  return (
    <View style={hiwStyles.section}>
      <Text style={hiwStyles.title}>How it works</Text>
      <View style={hiwStyles.grid}>
        <HowItWorksTile
          icon="create-outline"
          label="Describe"
          stepNumber={1}
          onPress={() => navigation.navigate('NewProject', { section: 'desc' })}
        />
        <HowItWorksTile
          icon="scan-outline"
          label="Scan"
          stepNumber={2}
          onPress={() => navigation.navigate('NewProject', { section: 'media' })}
        />
        <HowItWorksTile
          icon="sparkles-outline"
          label="Preview"
          stepNumber={3}
          onPress={() => navigation.navigate('NewProject', { section: 'preview' })}
        />
        <HowItWorksTile
          icon="hammer-outline"
          label="Build"
          stepNumber={4}
          onPress={() => navigation.navigate('NewProject', { section: 'plan' })}
        />
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { userId } = useUser();
  const isFocused = useIsFocused();
  const [recent, setRecent] = useState([]);
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const isVeryNarrow = winW < 360;

  const load = async () => {
    if (!userId) return;
    try {
      const data = await listProjects(userId);
      const items = (data?.items ?? [])
        .sort((a, b) => new Date(b.created_at).valueOf() - new Date(a.created_at).valueOf())
        .slice(0, 2);
      setRecent(items);
    } catch (error) {
      console.error('Failed to load recent projects:', error);
    }
  };

  useEffect(() => { load(); }, [isFocused, userId]);

  const handleNewProject = () => {
    navigation.navigate('NewProject');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <Text style={[styles.welcomeTitle, { fontSize: isVeryNarrow ? 26 : 28 }]}>Welcome back, Tye</Text>
        <Text style={styles.welcomeSubtitle}>Ready to start your next DIY project?</Text>

        {/* How it works grid */}
        <HowItWorks navigation={navigation} />

        {/* CTA Button */}
        <PressableScale
          testID="home-cta"
          onPress={handleNewProject}
          haptic="medium"
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel="Start a New Project"
          style={styles.startProjectButton}
        >
          <Text style={styles.startProjectText}>Start a New Project</Text>
        </PressableScale>

        {/* Section Header */}
        <Text style={styles.sectionHeader}>Recent Projects</Text>

        {/* Project Cards */}
        <View style={styles.projectsSection}>
          {recent.map((project) => (
            <ProjectCard key={project.id} project={project} navigation={navigation} />
          ))}
          {recent.length === 0 && (
            <Text style={styles.emptyText}>No recent projects yet</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProjectCard({ project, navigation }) {
  const handlePress = () => {
    navigation.navigate('Projects', { screen: 'ProjectDetails', params: { id: project.id } });
  };

  const statusText = project.status === 'plan_ready' 
    ? 'Plan ready' 
    : project.status === 'preview_ready' 
      ? 'Preview ready' 
      : 'In progress';

  return (
    <PressableScale
      onPress={handlePress}
      haptic="light"
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${project.name || 'Untitled Project'}, ${statusText}`}
      style={styles.projectCard}
    >
      {/* Thumbnail Placeholder */}
      <View style={styles.thumbnailPlaceholder} />
      
      {/* Content */}
      <View style={styles.cardContent}>
        {/* Title */}
        <Text style={styles.cardTitle}>{project.name || 'Untitled Project'}</Text>
        
        {/* Subtitle */}
        <Text style={styles.cardSubtitle}>{statusText}</Text>
      </View>
      
      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  welcomeTitle: {
    fontFamily: typography.fontFamily.manropeBold,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.interMedium,
    color: 'rgba(15,23,42,0.6)',
    marginBottom: 8,
  },
  startProjectButton: {
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
    paddingHorizontal: 32,
  },
  startProjectText: {
    color: colors.onBrand,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: typography.fontFamily.manropeBold,
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#0F172A',
    marginTop: 22,
    marginBottom: 16,
  },
  projectsSection: {
    gap: 16,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
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
  emptyText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
});

const hiwStyles = StyleSheet.create({
  section: { 
    marginTop: 8, 
    marginBottom: 20, 
    paddingHorizontal: 16,
  },
  title: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1B133C', 
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
});