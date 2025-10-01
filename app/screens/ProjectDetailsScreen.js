import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchProject, previewProject, buildWithoutPreview, getEntitlements } from '../lib/api';
import { useUser } from '../lib/useUser';
import Toast from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function ProjectDetailsScreen({ navigation, route }) {
  const { id } = route.params;
  const { userId } = useUser();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entitlements, setEntitlements] = useState({ remaining: 0, previewAllowed: false });
  const [isRequestingPreview, setIsRequestingPreview] = useState(false);
  const [isBuildingPlan, setIsBuildingPlan] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    loadProject();
    if (userId) loadEntitlements();
  }, [id, userId]);

  const loadEntitlements = async () => {
    try {
      const data = await getEntitlements(userId);
      setEntitlements({
        remaining: data.remaining || 0,
        previewAllowed: data.previewAllowed || false,
      });
    } catch (error) {
      console.error('Failed to load entitlements:', error);
    }
  };

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await fetchProject(id);
      setProject(data);
    } catch (error) {
      console.error('Failed to load project:', error);
      setToast({
        visible: true,
        message: error.message || 'Failed to load project',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const openPlan = () => {
    if (!project) {
      showToast('Project not found', 'error');
      return;
    }
    
    if (!['plan_ready', 'ready'].includes(project.status) && !project.plan && !project.plan_text) {
      showToast('Plan not ready yet', 'error');
      return;
    }
    
    navigation.navigate('Plan', { id: project.id });
  };

  const handleGeneratePreview = async () => {
    if (isRequestingPreview) return;
    
    try {
      setIsRequestingPreview(true);
      await previewProject(project.id, userId);
      showToast('Preview requested', 'success');
      navigation.navigate('Projects');
    } catch (error) {
      console.error('Failed to request preview:', error);
      showToast(error.message || 'Failed to request preview', 'error');
    } finally {
      setIsRequestingPreview(false);
    }
  };

  const handleBuildWithoutPreview = async () => {
    if (isBuildingPlan) return;
    
    try {
      setIsBuildingPlan(true);
      await buildWithoutPreview(project.id, userId);
      showToast('Plan requested', 'success');
      navigation.navigate('Projects');
    } catch (error) {
      console.error('Failed to request plan:', error);
      showToast(error.message || 'Failed to request plan', 'error');
    } finally {
      setIsBuildingPlan(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading project...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Project not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasInputImage = !!project.input_image_url;
  const hasPreview = !!project.preview_url;
  const hasPlan = ['plan_ready', 'ready'].includes(project.status) || !!project.plan;
  const isProcessing = ['preview_requested', 'plan_requested'].includes(project.status);

  const isFormValid = (project.description?.trim()?.length ?? 0) >= 10 && !!project.budget && !!project.skill;
  const remaining = Number(entitlements?.remaining ?? 0);
  const previewAllowed = Boolean(entitlements?.previewAllowed);
  const canPreview = isFormValid && remaining > 0 && previewAllowed && hasInputImage && !hasPreview && !hasPlan;
  const canBuild = isFormValid && remaining > 0 && hasInputImage && !hasPlan;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.projectName}>{project.name || 'Untitled Project'}</Text>
            <StatusBadge status={project.status} hasInputImage={hasInputImage} />
          </View>

          {(project.budget || project.skill) && (
            <View style={styles.metaRow}>
              {project.budget && (
                <View style={styles.metaItem}>
                  <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{project.budget}</Text>
                </View>
              )}
              {project.skill && (
                <View style={styles.metaItem}>
                  <Ionicons name="star-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{project.skill}</Text>
                </View>
              )}
            </View>
          )}

          {project.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{project.description}</Text>
            </View>
          )}

          {hasInputImage && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Room Photo</Text>
              <View style={styles.photoCard}>
                <Image source={{ uri: project.input_image_url }} style={styles.photoImage} resizeMode="cover" />
              </View>
            </View>
          )}

          {!hasInputImage && (
            <View style={styles.section}>
              <View style={styles.placeholderCard}>
                <Ionicons name="image-outline" size={48} color={colors.muted} />
                <Text style={styles.placeholderText}>No photo uploaded</Text>
              </View>
            </View>
          )}

          {hasInputImage && !hasPreview && !hasPlan && !isProcessing && (
            <View style={styles.actionButtons}>
              <Pressable
                onPress={handleGeneratePreview}
                disabled={!canPreview || isRequestingPreview}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!canPreview || isRequestingPreview) && styles.primaryButtonDisabled,
                  { transform: [{ scale: pressed && canPreview ? 0.98 : 1 }] }
                ]}
              >
                {isRequestingPreview ? (
                  <>
                    <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Requesting...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Generate AI Preview</Text>
                  </>
                )}
              </Pressable>

              {!previewAllowed && (
                <View style={styles.hintContainer}>
                  <Text style={styles.hintText}>
                    Preview isn't included in your current plan.{' '}
                    <Text style={styles.hintLink} onPress={() => navigation.navigate('Profile')}>
                      Upgrade
                    </Text>
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleBuildWithoutPreview}
                disabled={!canBuild || isBuildingPlan}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  (!canBuild || isBuildingPlan) && { opacity: 0.5 },
                  { transform: [{ scale: pressed && canBuild ? 0.98 : 1 }] }
                ]}
              >
                {isBuildingPlan ? (
                  <>
                    <ActivityIndicator size="small" color={colors.textPrimary} style={{ marginRight: 8 }} />
                    <Text style={styles.secondaryButtonText}>Requesting...</Text>
                  </>
                ) : (
                  <Text style={styles.secondaryButtonText}>Build Plan Without Preview</Text>
                )}
              </Pressable>
            </View>
          )}

          {hasPreview && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI Preview</Text>
              <View style={styles.photoCard}>
                <Image source={{ uri: project.preview_url }} style={styles.photoImage} resizeMode="cover" />
              </View>
            </View>
          )}

          {isProcessing && (
            <View style={styles.processingHint}>
              <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={styles.processingText}>
                {project.status === 'preview_requested' ? 'Generating preview...' : 'Building plan...'}
              </Text>
            </View>
          )}

          {hasPlan && (
            <TouchableOpacity style={styles.openPlanButton} onPress={openPlan}>
              <Ionicons name="document-text-outline" size={20} color="#FFF" />
              <Text style={styles.openPlanText}>Open Plan</Text>
              <Ionicons name="chevron-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.muted,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  projectName: {
    fontSize: 22,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  metaText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  photoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  photoImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  placeholderCard: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    marginTop: 12,
  },
  processingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.bg,
    borderRadius: 12,
    marginBottom: 16,
  },
  processingText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
  },
  openPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  openPlanText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.white,
    marginLeft: 8,
    marginRight: 8,
  },
  actionButtons: {
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.muted,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.white,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.accent,
  },
  hintContainer: {
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  hintLink: {
    color: colors.accent,
    fontFamily: typography.fontFamily.manropeBold,
    textDecorationLine: 'underline',
  },
});
