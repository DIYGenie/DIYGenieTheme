import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { brand, colors } from '../../theme/colors.ts';
import { spacing, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { listProjects } from '../lib/api';
import { useUser } from '../lib/useUser';

const screenW = Dimensions.get('window').width;
const arrowsW = 10 * 3;
const gapsW   = 8  * 3;
const sidePad = 24 * 2;
const chipWidth = Math.max(74, Math.floor((screenW - arrowsW - gapsW - sidePad) / 4));
const isNarrow = screenW < 390;
const isVeryNarrow = screenW < 360;

function HowItWorksGrid({ navigation }) {
  const items = [
    { id: 1, icon: 'create-outline', label: 'Describe', section: 'desc', a11yLabel: 'Describe your project', a11yHint: 'Focus on project description field' },
    { id: 2, icon: 'image-outline', label: 'Room scan', section: 'media', a11yLabel: 'Room scan (or upload photo)', a11yHint: 'Open room scanner or choose a photo on web' },
    { id: 3, icon: 'sparkles-outline', label: 'AI preview', section: 'preview', a11yLabel: 'AI preview', a11yHint: 'Scroll to design suggestions' },
    { id: 4, icon: 'list-outline', label: 'Build plan', section: 'plan', a11yLabel: 'Build plan', a11yHint: 'Scroll to plan creation buttons' },
  ];

  return (
    <View style={chipStyles.wrap}>
      <Text style={chipStyles.title}>How it works</Text>

      <View style={chipStyles.row}>
        {items.map((item, idx) => (
          <React.Fragment key={item.id}>
            <TouchableOpacity 
              style={[chipStyles.chip, { width: chipWidth }]} 
              activeOpacity={0.85}
              onPress={() => navigation.navigate('NewProject', { section: item.section })}
              accessibilityLabel={item.a11yLabel}
              accessibilityHint={item.a11yHint}
              accessibilityRole="button"
            >
              <Ionicons name={item.icon} size={18} color={colors.brand} />
              <Text style={[chipStyles.chipLabel, { maxWidth: chipWidth - 12 }]} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>

            {idx < items.length - 1 && (
              <View pointerEvents="none" style={chipStyles.arrowWrap}>
                <Ionicons name="chevron-forward" size={12} color="rgba(110,64,255,0.45)" />
              </View>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { userId } = useUser();
  const isFocused = useIsFocused();
  const [recent, setRecent] = useState([]);
  const insets = useSafeAreaInsets();

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
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <Text style={styles.welcomeTitle}>Welcome back, Tye</Text>
        <Text style={styles.welcomeSubtitle}>Ready to start your next DIY project?</Text>

        {/* How it works grid */}
        <HowItWorksGrid navigation={navigation} />

        {/* CTA Button */}
        <TouchableOpacity testID="home-cta" style={styles.startProjectButton} onPress={handleNewProject}>
          <Text style={styles.startProjectText}>Start a New Project</Text>
        </TouchableOpacity>

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

  return (
    <TouchableOpacity style={styles.projectCard} onPress={handlePress}>
      {/* Thumbnail Placeholder */}
      <View style={styles.thumbnailPlaceholder} />
      
      {/* Content */}
      <View style={styles.cardContent}>
        {/* Title */}
        <Text style={styles.cardTitle}>{project.name || 'Untitled Project'}</Text>
        
        {/* Subtitle */}
        <Text style={styles.cardSubtitle}>
          {project.status === 'plan_ready' ? 'Plan ready' : project.status === 'preview_ready' ? 'Preview ready' : 'In progress'}
        </Text>
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
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  welcomeTitle: {
    fontSize: isVeryNarrow ? 26 : 28,
    fontFamily: typography.fontFamily.manropeBold,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.interMedium,
    color: 'rgba(15,23,42,0.6)',
    marginBottom: 14,
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
    marginTop: 16,
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
  emptyText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
});

const chipStyles = StyleSheet.create({
  wrap: { 
    marginTop: 8,
    marginBottom: 18,
  },
  title: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: colors.ink900, 
    marginBottom: 10,
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
  },
  chip: {
    minWidth: 82,
    height: 64, 
    borderRadius: 12,
    backgroundColor: colors.brand50, 
    borderWidth: 1,
    borderColor: 'rgba(110,64,255,0.12)',
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 8, 
    paddingHorizontal: 8,
  },
  chipLabel: { 
    fontSize: 11, 
    lineHeight: 14, 
    fontWeight: '600', 
    color: colors.ink700, 
    marginTop: 6, 
    textAlign: 'center',
  },
  arrowWrap: { 
    width: 10, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginHorizontal: 4,
  },
});