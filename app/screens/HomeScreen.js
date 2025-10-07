import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { brand, colors } from '../../theme/colors.ts';
import { spacing, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { listProjects } from '../lib/api';
import { useUser } from '../lib/useUser';

function HowItWorksGrid({ navigation }) {
  const [howW, setHowW] = React.useState(0);
  
  const GAP = 6;
  const ARROW_W = 10;
  const ITEMS = 7;
  const gapsTotal = GAP * (ITEMS - 1);
  const arrowsTotal = ARROW_W * 3;
  const CHIP_W = howW > 0
    ? Math.floor((howW - gapsTotal - arrowsTotal) / 4)
    : 90;

  const items = [
    { id: 1, icon: 'create-outline', label: 'Describe', section: 'desc', a11yLabel: 'Describe', a11yHint: 'Focus on project description field' },
    { id: 2, icon: 'image-outline', label: 'Scan', section: 'media', a11yLabel: 'Scan', a11yHint: 'Open room scanner or choose a photo on web' },
    { id: 3, icon: 'sparkles-outline', label: 'Preview', section: 'preview', a11yLabel: 'Preview', a11yHint: 'Scroll to design suggestions' },
    { id: 4, icon: 'list-outline', label: 'Build', section: 'plan', a11yLabel: 'Build', a11yHint: 'Scroll to plan creation buttons' },
  ];

  const Arrow = () => (
    <View style={{ width: ARROW_W, marginHorizontal: GAP / 2 }}>
      <Text style={{ 
        textAlign: 'center', 
        opacity: 0.5,
        fontSize: 16,
        color: colors.ink700,
      }}>›</Text>
    </View>
  );

  const Chip = ({ icon, label, section, a11yLabel, a11yHint }) => (
    <TouchableOpacity
      style={{
        width: CHIP_W,
        minWidth: 84,
        borderRadius: 14,
        backgroundColor: 'rgba(138, 92, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(138,92,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginHorizontal: GAP / 2,
      }}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('NewProject', { section })}
      accessibilityLabel={a11yLabel}
      accessibilityHint={a11yHint}
      accessibilityRole="button"
    >
      <View style={{ marginBottom: 4 }}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <Text
        numberOfLines={1}
        ellipsizeMode="clip"
        allowFontScaling={false}
        style={{ 
          fontSize: 12,
          fontWeight: '600',
          color: colors.ink700,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={chipStyles.wrap}>
      <Text style={chipStyles.title}>How it works</Text>

      <View
        onLayout={(e) => setHowW(e.nativeEvent.layout.width)}
        style={{ paddingHorizontal: 8 }}
      >
        <View style={chipStyles.howRow}>
          <Chip 
            icon={items[0].icon} 
            label={items[0].label} 
            section={items[0].section}
            a11yLabel={items[0].a11yLabel}
            a11yHint={items[0].a11yHint}
          />
          <Arrow />
          <Chip 
            icon={items[1].icon} 
            label={items[1].label} 
            section={items[1].section}
            a11yLabel={items[1].a11yLabel}
            a11yHint={items[1].a11yHint}
          />
          <Arrow />
          <Chip 
            icon={items[2].icon} 
            label={items[2].label} 
            section={items[2].section}
            a11yLabel={items[2].a11yLabel}
            a11yHint={items[2].a11yHint}
          />
          <Arrow />
          <Chip 
            icon={items[3].icon} 
            label={items[3].label} 
            section={items[3].section}
            a11yLabel={items[3].a11yLabel}
            a11yHint={items[3].a11yHint}
          />
        </View>
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
    marginTop: 0,
  },
  title: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: colors.ink900, 
    marginTop: 8,
    marginBottom: 10,
  },
  howRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    marginTop: 10,
    marginBottom: 14,
  },
});