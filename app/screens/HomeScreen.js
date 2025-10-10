import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Linking, Platform, Alert, InteractionManager, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { brand, colors } from '../../theme/colors.ts';
import { spacing, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { fetchMyProjects, fetchProjectPlanMarkdown } from '../lib/api';
import { useUser } from '../lib/useUser';
import HowItWorksTile from '../components/HowItWorksTile';
import PressableScale from '../components/ui/PressableScale';
import ProjectCardSkeleton from '../components/home/ProjectCardSkeleton';
import EmptyState from '../components/ui/EmptyState';
import { useCameraPermission } from '../hooks/useCameraPermission';
import PrePermissionSheet from '../components/modals/PrePermissionSheet';
import { supabase } from '../lib/supabase';

function HowItWorks({ navigation }) {
  const { checkStatus, request } = useCameraPermission();
  const [showPermissionSheet, setShowPermissionSheet] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const handleScanPress = async () => {
    const status = await checkStatus();
    
    if (status === 'granted') {
      navigation.navigate('Scan');
    } else {
      setPermissionDenied(false);
      setShowPermissionSheet(true);
    }
  };

  const handleContinue = async () => {
    const result = await request();
    
    if (result === 'granted') {
      setShowPermissionSheet(false);
      setPermissionDenied(false);
      navigation.navigate('Scan');
    } else {
      setPermissionDenied(true);
    }
  };

  const handleOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openSettings();
    } else {
      Linking.openSettings();
    }
    setShowPermissionSheet(false);
  };

  const handleClose = () => {
    setShowPermissionSheet(false);
    setPermissionDenied(false);
  };

  return (
    <>
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
            onPress={handleScanPress}
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

      <PrePermissionSheet
        visible={showPermissionSheet}
        title={permissionDenied ? "Camera access needed" : "Use your camera to scan the room"}
        subtitle={permissionDenied 
          ? "Camera access was denied. Please enable it in Settings to use the room scanner."
          : "We'll measure and place your project preview. We never store video without your OK."
        }
        iconName="camera-outline"
        primaryLabel={permissionDenied ? "Open Settings" : "Continue"}
        secondaryLabel={permissionDenied ? "Close" : "Not now"}
        onPrimary={permissionDenied ? handleOpenSettings : handleContinue}
        onSecondary={handleClose}
      />
    </>
  );
}

export default function HomeScreen({ navigation }) {
  const { userId } = useUser();
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const isVeryNarrow = winW < 360;

  // Use the same unified loader and then slice to "recent"
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchMyProjects();
      setRecent(items.slice(0, 5)); // show top 5 newest
    } catch (e) {
      console.log('[home recent load error]', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pull-to-refresh state + handler
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // Keep "Recent Projects" fresh when returning to Home
  useFocusEffect(
    useCallback(() => {
      if (typeof load === 'function') {
        console.log('[home] focus → refetch recent projects');
        load();
      }
      return () => {};
    }, [load])
  );

  const handleNewProject = () => {
    navigation.navigate('NewProject');
  };

  const handlePingSupabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('room_scans').select('id').limit(1);

      if (error) {
        Alert.alert('Supabase ERROR', error.message);
        console.error('Supabase error:', error);
        return;
      }

      const userId = user?.id || 'none';
      const message = `Supabase OK • user: ${userId} • room_scans sample loaded`;
      Alert.alert('Supabase Connection', message);
      console.log('Supabase ping result:', { user, data });
    } catch (err) {
      Alert.alert('Supabase ERROR', err.message || 'Unknown error');
      console.error('Supabase ping failed:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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

        {/* Dev-only Supabase Ping Button */}
        {__DEV__ && (
          <PressableScale
            testID="ping-supabase"
            onPress={handlePingSupabase}
            haptic="light"
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel="Ping Supabase (dev)"
            style={styles.devButton}
          >
            <Text style={styles.devButtonText}>Ping Supabase (dev)</Text>
          </PressableScale>
        )}

        {/* Section Header */}
        <Text style={styles.sectionHeader}>Recent Projects</Text>

        {/* Project Cards / Loading / Empty State */}
        {loading ? (
          <ProjectCardSkeleton count={2} />
        ) : recent.length === 0 ? (
          <EmptyState
            title="No projects yet"
            subtitle="Start your first DIY and it'll show up here."
            primaryLabel="Start a New Project"
            onPrimary={handleNewProject}
          />
        ) : (
          <View style={styles.projectsSection}>
            {recent.map((project) => (
              <ProjectCard key={project.id} project={project} navigation={navigation} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProjectCard({ project, navigation }) {
  const handlePress = async () => {
    const id = project?.id || project?.project_id;
    if (!id) return;

    const parent = navigation.getParent?.('root-tabs') || navigation.getParent?.();

    try {
      await fetchProjectPlanMarkdown(id);
      if (parent?.navigate) {
        parent.navigate('Projects', { screen: 'ProjectsList' });
        InteractionManager.runAfterInteractions(() => {
          parent.navigate('Projects', { screen: 'ProjectDetails', params: { id } });
        });
      } else {
        navigation.navigate('Projects', { screen: 'ProjectsList' });
        InteractionManager.runAfterInteractions(() => {
          navigation.navigate('Projects', { screen: 'ProjectDetails', params: { id } });
        });
      }
    } catch (e) {
      if (parent?.navigate) {
        parent.navigate('Projects', { screen: 'PlanWaiting', params: { id } });
      } else {
        navigation.navigate('Projects', { screen: 'PlanWaiting', params: { id } });
      }
    }
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
  devButton: {
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    width: '100%',
  },
  devButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.fontFamily.inter,
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