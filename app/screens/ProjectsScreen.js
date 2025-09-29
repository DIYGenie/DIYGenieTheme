import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { listProjects, ApiError } from '../lib/api';
import { supabase } from '../lib/storage';

export default function ProjectsScreen({ navigation, route }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [projects, setProjects] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const userId = '00000000-0000-0000-0000-000000000001';

  const fetchProjects = async () => {
    try {
      const data = await listProjects(userId);
      setProjects(data);
      setNetworkError(false);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      if (error instanceof ApiError && error.status === 0) {
        setNetworkError(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch on mount and when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.refresh) {
        fetchProjects();
        // Clear the refresh param
        navigation.setParams({ refresh: undefined });
      }
    }, [route.params?.refresh])
  );

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects();
  };

  const handleFilterPress = (filter) => {
    setActiveFilter(filter);
  };

  const handleStartProject = () => {
    navigation.navigate('NewProject');
  };

  const filteredProjects = projects.filter(project => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Active') return project.status === 'active';
    if (activeFilter === 'Completed') return project.status === 'completed';
    return true;
  });

  const showEmptyState = filteredProjects.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Projects</Text>
          <Text style={styles.subtitle}>Manage all your DIY projects in one place</Text>
          {networkError && __DEV__ && (
            <View style={{ backgroundColor: '#FEF3C7', padding: 8, borderRadius: 8, marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: '#92400E', textAlign: 'center' }}>
                Can't reach server. Check BASE_URL or CORS.
              </Text>
            </View>
          )}
        </View>

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

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {['All', 'Active', 'Completed'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterPill,
                activeFilter === filter ? styles.filterPillActive : styles.filterPillInactive
              ]}
              onPress={() => handleFilterPress(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter ? styles.filterTextActive : styles.filterTextInactive
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Projects List or Empty State */}
        {showEmptyState ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIllustration}>
              <Ionicons name="folder-outline" size={64} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No projects yet</Text>
            <Text style={styles.emptySubtitle}>Start by scanning your room or uploading a photo.</Text>
            <TouchableOpacity style={styles.startProjectButton} onPress={handleStartProject}>
              <Text style={styles.startProjectText}>Start Your First Project</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.projectsList}>
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProjectCard({ project }) {
  const hasPreview = project.preview_url;
  const isPreviewRequested = project.status === 'preview_requested' || project.status === 'pending';
  const projectName = project.name || project.title || 'Untitled Project';
  
  return (
    <TouchableOpacity style={styles.projectCard}>
      {/* Thumbnail */}
      {hasPreview ? (
        <Image 
          source={{ uri: project.preview_url }} 
          style={styles.thumbnailImage}
          resizeMode="cover"
        />
      ) : isPreviewRequested ? (
        <View style={styles.thumbnailSkeleton}>
          <ActivityIndicator size="small" color="#F59E0B" />
        </View>
      ) : (
        <View style={styles.thumbnailPlaceholder} />
      )}
      
      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{projectName}</Text>
        
        {isPreviewRequested && !hasPreview ? (
          <View style={styles.previewChip}>
            <Text style={styles.previewChipText}>Preview requested</Text>
          </View>
        ) : (
          <Text style={styles.cardSubtitle}>
            {project.status === 'completed' 
              ? 'Completed' 
              : project.stepsRemaining 
              ? `${project.stepsRemaining} steps remaining`
              : 'In progress'
            }
          </Text>
        )}
        
        {/* Progress Bar - only show if progress exists */}
        {project.progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${project.progress * 100}%` }
                ]} 
              />
            </View>
          </View>
        )}
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
  headerSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.interMedium,
    color: '#475569',
    lineHeight: 21, // 1.5 line height
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    height: 44,
    marginTop: 16,
    marginBottom: 16,
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
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  filterPill: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterPillActive: {
    backgroundColor: '#F59E0B',
  },
  filterPillInactive: {
    backgroundColor: '#F3F4F6',
  },
  filterText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.manropeBold,
  },
  filterTextActive: {
    color: colors.white,
  },
  filterTextInactive: {
    color: '#374151',
  },
  projectsList: {
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
    width: 64,
    height: 64,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    marginRight: spacing.md,
  },
  thumbnailImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: spacing.md,
  },
  thumbnailSkeleton: {
    width: 64,
    height: 64,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  previewChipText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#D97706',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: '#475569',
    marginBottom: 8,
  },
  progressContainer: {
    width: '100%',
  },
  progressBackground: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIllustration: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  startProjectButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
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
  startProjectText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#F59E0B',
  },
});