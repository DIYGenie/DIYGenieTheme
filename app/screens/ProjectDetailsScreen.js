import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import SummaryCard from '../components/SummaryCard';
import PlanOutline from '../components/PlanOutline';
import { getPlanStubs } from '../lib/planStubs';
import { ScreenScroll, ButtonPrimary, Badge, Card, SectionTitle, ui, space, colors } from '../ui/components';

export default function ProjectDetailsScreen({ navigation, route }) {
  const { id } = route.params;
  const { userId } = useUser();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entitlements, setEntitlements] = useState({ remaining: 0, previewAllowed: false });
  const [isRequestingPreview, setIsRequestingPreview] = useState(false);
  const [isBuildingPlan, setIsBuildingPlan] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const planData = useMemo(() => getPlanStubs(project?.id), [project?.id]);

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
    
    navigation.navigate('OpenPlan', { id: project.id });
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
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[ui.sub, { marginTop: 16 }]}>Loading project...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={ui.h1}>Project not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasInputImage = !!project?.input_image_url;
  const hasPreview = !!project?.preview_url;
  const hasPlan = project && (['plan_ready', 'ready'].includes(project.status) || !!project.plan);
  const isProcessing = project && ['preview_requested', 'plan_requested'].includes(project.status);

  const isFormValid = project && (project.description?.trim()?.length ?? 0) >= 10 && !!project.budget && !!project.skill;
  const remaining = Number(entitlements?.remaining ?? 0);
  const previewAllowed = Boolean(entitlements?.previewAllowed);
  const canPreview = isFormValid && remaining > 0 && previewAllowed && hasInputImage && !hasPreview && !hasPlan;
  const canBuild = isFormValid && remaining > 0 && hasInputImage && !hasPlan;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScreenScroll>
        <Text style={[ui.h1, { marginBottom: space.xs }]}>{project.name || 'Untitled Project'}</Text>

        <Badge
          text={project.status === "plan_ready" ? "Plan ready" : project.status || "In progress"}
          tone={project.status === "plan_ready" ? "success" : "muted"}
          style={{ marginBottom: space.md }}
        />

        {(project.budget || project.skill) && (
          <View style={styles.metaRow}>
            {project.budget && (
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={16} color={colors.sub} />
                <Text style={[ui.sub, { marginLeft: 6 }]}>{project.budget}</Text>
              </View>
            )}
            {project.skill && (
              <View style={styles.metaItem}>
                <Ionicons name="star-outline" size={16} color={colors.sub} />
                <Text style={[ui.sub, { marginLeft: 6 }]}>{project.skill}</Text>
              </View>
            )}
          </View>
        )}

        {project.description && (
          <View style={styles.section}>
            <Text style={[ui.h2, { marginBottom: 12 }]}>Description</Text>
            <Text style={[ui.p, { lineHeight: 22 }]}>{project.description}</Text>
          </View>
        )}

        {hasInputImage && (
          <View style={styles.section}>
            <Text style={[ui.h2, { marginBottom: 12 }]}>Room Photo</Text>
            <View style={styles.photoCard}>
              <Image source={{ uri: project.input_image_url }} style={styles.photoImage} resizeMode="cover" />
            </View>
          </View>
        )}

        {!hasInputImage && (
          <View style={styles.section}>
            <View style={styles.placeholderCard}>
              <Ionicons name="image-outline" size={48} color={colors.sub} />
              <Text style={[ui.sub, { marginTop: 12 }]}>No photo uploaded</Text>
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
                <Text style={[ui.sub, { textAlign: 'center' }]}>
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
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
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
            <Text style={[ui.h2, { marginBottom: 12 }]}>AI Preview</Text>
            <View style={styles.photoCard}>
              <Image source={{ uri: project.preview_url }} style={styles.photoImage} resizeMode="cover" />
            </View>
          </View>
        )}

        {isProcessing && (
          <View style={styles.processingHint}>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={ui.sub}>
              {project.status === 'preview_requested' ? 'Generating preview...' : 'Building plan...'}
            </Text>
          </View>
        )}

        {hasPlan && (
          <>
            <ButtonPrimary 
              title="📄 Open Plan" 
              onPress={openPlan} 
              style={{ marginTop: space.md }} 
            />
            <Card style={{ marginTop: space.md }}>
              <SectionTitle>Summary</SectionTitle>
              <Text style={ui.p}>Description: {project?.name || "—"}</Text>
              <Text style={ui.p}>Budget: {project?.budget || "—"}</Text>
              <Text style={ui.p}>Skill: {project?.skill || "—"}</Text>
              <Text style={ui.p}>Status: {project?.status || "—"}</Text>
              <Text style={ui.p}>Photo: {project?.input_image_url ? "Attached" : "Missing"}</Text>
            </Card>
            <PlanOutline planData={planData} />
          </>
        )}
      </ScreenScroll>

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
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
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
    fontWeight: '700',
    color: colors.text,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  photoCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  placeholderCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  processingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtons: {
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.border,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  hintContainer: {
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  hintLink: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
