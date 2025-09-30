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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fetchProject, requestPreview, buildWithoutPreview } from '../lib/api';
import { useUser } from '../lib/useUser';
import Toast from '../components/Toast';
import axios from 'axios';

const BASE = process.env.EXPO_PUBLIC_BASE_URL;

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
      const r = await axios.get(`${BASE}/me/entitlements/${userId}`);
      setEntitlements({
        remaining: r.data.remaining || 0,
        previewAllowed: r.data.previewAllowed || false,
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

  const handleOpenPlan = () => {
    if (!project?.plan) {
      showToast('Plan not available yet', 'error');
      return;
    }
    navigation.navigate('Plan', { id: project.id });
  };

  const handleGeneratePreview = async () => {
    if (isRequestingPreview) return;
    
    try {
      setIsRequestingPreview(true);
      await requestPreview(project.id);
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
      await buildWithoutPreview(project.id);
      showToast('Plan requested', 'success');
      navigation.navigate('Projects');
    } catch (error) {
      console.error('Failed to request plan:', error);
      showToast(error.message || 'Failed to request plan', 'error');
    } finally {
      setIsBuildingPlan(false);
    }
  };

  const getStatusBadge = (status, hasInputImage) => {
    let badgeText = '';
    let badgeColor = '#6B7280';

    if (status === 'draft' && !hasInputImage) {
      badgeText = 'Awaiting photo';
      badgeColor = '#6B7280';
    } else if (status === 'preview_requested') {
      badgeText = 'Preview requested';
      badgeColor = '#F59E0B';
    } else if (status === 'preview_ready') {
      badgeText = 'Preview ready';
      badgeColor = '#10B981';
    } else if (status === 'plan_requested') {
      badgeText = 'Plan requested';
      badgeColor = '#F59E0B';
    } else if (status === 'plan_ready') {
      badgeText = 'Plan ready';
      badgeColor = '#10B981';
    } else if (status === 'ready') {
      badgeText = 'Plan ready';
      badgeColor = '#10B981';
    }

    if (!badgeText) return null;

    return (
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Text style={styles.badgeText}>{badgeText}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#8B5CF6', '#3B82F6']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Project Details</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.loadingText}>Loading project...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!project) {
    return (
      <LinearGradient colors={['#8B5CF6', '#3B82F6']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Project Details</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Project not found</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const hasInputImage = !!project.input_image_url;
  const hasPreview = !!project.preview_url;
  const hasPlan = ['plan_ready', 'ready'].includes(project.status) || !!project.plan;
  const isProcessing = ['preview_requested', 'plan_requested'].includes(project.status);

  // Gating logic for buttons
  const isFormValid = (project.description?.trim()?.length ?? 0) >= 10 && !!project.budget && !!project.skill;
  const remaining = Number(entitlements?.remaining ?? 0);
  const previewAllowed = Boolean(entitlements?.previewAllowed);
  const canPreview = isFormValid && remaining > 0 && previewAllowed && hasInputImage && !hasPreview && !hasPlan;
  const canBuild = isFormValid && remaining > 0 && hasInputImage && !hasPlan;

  return (
    <LinearGradient colors={['#8B5CF6', '#3B82F6']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text style={styles.projectName}>{project.name || 'Untitled Project'}</Text>
              {getStatusBadge(project.status, hasInputImage)}
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metaText}>{project.budget || 'N/A'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="star-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metaText}>{project.skill || 'N/A'}</Text>
              </View>
            </View>

            {project.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.descriptionText}>{project.description}</Text>
              </View>
            )}

            {hasInputImage && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Room Photo</Text>
                <Image source={{ uri: project.input_image_url }} style={styles.image} />
              </View>
            )}

            {!hasInputImage && (
              <View style={styles.section}>
                <View style={styles.placeholderImage}>
                  <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.placeholderText}>No photo uploaded</Text>
                </View>
              </View>
            )}

            {/* Action buttons - only show if not processing and no plan yet */}
            {hasInputImage && !hasPreview && !hasPlan && !isProcessing && (
              <View style={styles.actionButtons}>
                {/* Preview Button */}
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

                {/* Hint under preview button */}
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

                {/* Build Button */}
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
                      <ActivityIndicator size="small" color="#1F2937" style={{ marginRight: 8 }} />
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
                <Image source={{ uri: project.preview_url }} style={styles.image} />
              </View>
            )}

            {isProcessing && (
              <View style={styles.processingHint}>
                <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.processingText}>
                  {project.status === 'preview_requested' ? 'Generating preview...' : 'Building plan...'}
                </Text>
              </View>
            )}

            {hasPlan && (
              <TouchableOpacity style={styles.openPlanButton} onPress={handleOpenPlan}>
                <Ionicons name="document-text-outline" size={20} color="#FFF" />
                <Text style={styles.openPlanText}>Open Plan</Text>
                <Ionicons name="chevron-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  errorText: {
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  projectName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
    marginRight: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  placeholderImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 12,
  },
  processingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
  },
  processingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  openPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  openPlanText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
    marginRight: 8,
  },
  actionButtons: {
    marginTop: 16,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(249, 115, 22, 0.5)',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  hintContainer: {
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  hintLink: {
    color: '#F97316',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
