import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { View, Image, ActivityIndicator, Pressable, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeBack } from '../lib/useSafeBack';
import { fetchProjectById, fetchLatestScanForProject, fetchProjectPlanMarkdown, requestProjectPreview } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { parsePlanMarkdown, Plan } from '../lib/plan';
import AccordionCard from '../components/ui/AccordionCard';
import { countLabel, stepsTimeCost } from '../lib/planLabels';
import Toast from '../components/Toast';
import { saveImageToPhotos } from '../lib/media';
import { Ionicons } from '@expo/vector-icons';
import DetailCard from '../components/DetailCard';
import { getCachedPlan, setCachedPlan } from '../lib/planCache';

type RouteParams = { id: string };
type R = RouteProp<Record<'ProjectDetails', RouteParams>, 'ProjectDetails'>;

export default function ProjectDetails() {
  const route = useRoute<R>();
  const navigation = useNavigation();
  const safeBack = useSafeBack();
  const projectId = route.params?.id;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [scan, setScan] = useState<{ scanId: string; imageUrl: string } | null>(null);
  const [planObj, setPlanObj] = useState<Plan | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        fetchProjectById(projectId, { signal: controller.signal, timeoutMs: 8000 }),
        fetchLatestScanForProject(projectId),
      ]);
      
      if (!controller.signal.aborted) {
        setProject(p);
        setScan(s);
        
        const ready = /ready/.test(String(p?.plan_status || p?.status || '').toLowerCase()) && 
                     !/requested|building|queued|pending/.test(String(p?.plan_status || p?.status || '').toLowerCase());
        
        if (ready) {
          try {
            // Try cache first
            const cached = await getCachedPlan(projectId);
            if (cached?.plan && !controller.signal.aborted) {
              setPlanObj(cached.plan);
              console.log('[details] loaded from cache');
            }
            
            // Then fetch fresh
            const { getLocalPlanMarkdown } = await import('../lib/localPlan');
            const local = await getLocalPlanMarkdown(projectId);
            let md = local;
            if (!md) md = await fetchProjectPlanMarkdown(projectId, { tolerate409: true });
            if (md && !controller.signal.aborted) {
              const parsed = parsePlanMarkdown(md);
              await setCachedPlan(projectId, parsed);
              setPlanObj(parsed);
              console.log('[details] plan ready', {
                sections: {
                  materials: parsed.materials?.length ?? 0,
                  cuts: parsed.cuts?.length ?? 0,
                  tools: parsed.tools?.length ?? 0,
                  steps: parsed.steps?.length ?? 0
                }
              });
            }
          } catch (e) {
            if ((e as any)?.name !== 'AbortError') console.log('[plan fetch error]', String(e));
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.log('[ProjectDetails load error]', String(e));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [projectId]);

  const previewUrl = project?.plan?.preview_url ?? null;

  const handleSavePreview = async () => {
    if (!previewUrl) return;
    const result = await saveImageToPhotos(previewUrl);
    if (result.success) {
      setToast({ visible: true, message: result.message, type: 'success' });
    } else {
      Alert.alert('Error', result.message);
    }
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  const onGeneratePreview = async () => {
    if (!projectId) return;
    setPreviewLoading(true);
    const r = await requestProjectPreview(projectId);
    setPreviewLoading(false);
    
    // Handle 409 preview already used
    if (r.status === 409 && r.body?.error === 'preview_already_used') {
      console.log('[preview] already generated');
      Alert.alert('Preview already generated', 'Your project preview is ready to view.');
      load(); // Refresh to show preview
      return;
    }
    
    if (r.ok) {
      setToast({ visible: true, message: 'Preview requested. This may take a moment.', type: 'success' });
      // Refresh project to reflect "preview requested/plan requested" state
      load();
    } else {
      setToast({ visible: true, message: 'Could not request preview. Try again.', type: 'error' });
      console.log('[preview error]', r.status, r.body);
    }
  };

  const isPlanReady = !!planObj;
  
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <Pressable onPress={safeBack} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontWeight: '600' }}>Back</Text>
        </Pressable>
      ),
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', maxWidth: 260 }}>
          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700' }}>
            {project?.name || 'Project'}
          </Text>
          {isPlanReady && (
            <View style={{ marginLeft: 8 }}>
              <StatusBadge status="Plan ready" />
            </View>
          )}
        </View>
      ),
    });
  }, [navigation, safeBack, project?.name, isPlanReady]);

  useEffect(() => {
    load();
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        abortRef.current?.abort();
      };
    }, [load])
  );

  const statusReady = /ready/.test(String(project?.plan_status || project?.status || '').toLowerCase());
  const isBuilding = /requested|building|queued|pending/.test(String(project?.plan_status || project?.status || '').toLowerCase());

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 64 }}>
      {loading ? (
        <View style={{ paddingTop: 40 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          {/* Hero image - prefers plan.preview_url, falls back to latest scan */}
          <View style={{ marginBottom: 16 }}>
            {previewUrl ? (
              <>
                <View style={{ position: 'relative' }}>
                  <Image
                    source={{ uri: previewUrl }}
                    style={{ width: '100%', height: 240, borderRadius: 16, backgroundColor: '#EEE' }}
                    resizeMode="cover"
                  />
                  <View style={{ 
                    position: 'absolute', 
                    top: 12, 
                    right: 12, 
                    backgroundColor: '#7C3AED', 
                    paddingHorizontal: 10, 
                    paddingVertical: 4, 
                    borderRadius: 8 
                  }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Preview</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={handleSavePreview}
                  style={{ 
                    marginTop: 12, 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#F3F4F6',
                    paddingVertical: 10,
                    borderRadius: 10
                  }}
                >
                  <Ionicons name="download-outline" size={18} color="#6B7280" />
                  <Text style={{ color: '#374151', fontWeight: '600', marginLeft: 6 }}>Save to Photos</Text>
                </TouchableOpacity>
              </>
            ) : scan?.imageUrl ? (
              <Image
                source={{ uri: scan.imageUrl }}
                style={{ width: '100%', height: 240, borderRadius: 16, backgroundColor: '#EEE' }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: '100%',
                  height: 240,
                  borderRadius: 16,
                  backgroundColor: '#F2F2F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#6B7280' }}>No scan image yet</Text>
              </View>
            )}
          </View>

          {/* Plan status card */}
          <View style={{ marginBottom: 16, backgroundColor: '#F6F5FF', borderRadius: 16, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', lineHeight: 24, marginBottom: 8 }}>Plan</Text>
            <Text style={{ color: '#4B5563', fontSize: 15 }}>
              {isBuilding 
                ? 'Plan is building…' 
                : planObj 
                  ? 'Plan is ready. Browse the sections below or open the full guide.'
                  : 'Plan is ready — loading details…'}
            </Text>
          </View>

          {/* Generate AI Preview CTA - only show when project exists and preview isn't ready and no preview */}
          {!!projectId && !statusReady && !isBuilding && !previewUrl && (
            <View style={{ marginBottom: 16 }}>
              <Pressable
                onPress={onGeneratePreview}
                disabled={previewLoading}
                style={{
                  backgroundColor: '#7C3AED',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  opacity: previewLoading ? 0.7 : 1,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>
                  {previewLoading ? 'Requesting…' : 'Generate AI Preview'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Info cards (only if plan is ready) */}
          {planObj && (
            <>
              <View style={{ gap: 12, marginBottom: 16 }}>
                <DetailCard 
                  title="Overview" 
                  subtitle={planObj?.overview ? (planObj.overview.slice(0, 80) + (planObj.overview.length > 80 ? '...' : '')) : 'High-level summary'} 
                  onPress={() => Alert.alert('Overview', planObj?.overview || 'No overview available')} 
                />
                <DetailCard 
                  title="Materials" 
                  subtitle={`${planObj?.materials?.length || 0} items`} 
                  onPress={() => (navigation as any).navigate('DetailedInstructions', { id: projectId })} 
                />
                <DetailCard 
                  title="Cuts" 
                  subtitle={`${planObj?.cuts?.length || 0} parts`} 
                  onPress={() => (navigation as any).navigate('DetailedInstructions', { id: projectId })} 
                />
                <DetailCard 
                  title="Tools" 
                  subtitle={`${planObj?.tools?.length || 0} tools`} 
                  onPress={() => (navigation as any).navigate('DetailedInstructions', { id: projectId })} 
                />
                <DetailCard 
                  title="Steps" 
                  subtitle={`${planObj?.steps?.length || 0} steps`} 
                  onPress={() => (navigation as any).navigate('DetailedInstructions', { id: projectId })} 
                />
                <DetailCard 
                  title="Time & Cost" 
                  subtitle={`${planObj?.time_estimate_hours || '—'} hrs • $${planObj?.cost_estimate_usd || '—'}`} 
                  onPress={() => Alert.alert('Time & Cost', `Estimated time: ${planObj?.time_estimate_hours || '—'} hrs\nEstimated cost: $${planObj?.cost_estimate_usd || '—'}`)} 
                />
              </View>

              <Pressable
                onPress={() => (navigation as any).navigate('DetailedInstructions', { id: projectId })}
                style={{ 
                  backgroundColor: '#7C3AED', 
                  height: 52, 
                  borderRadius: 16, 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Get detailed instructions</Text>
              </Pressable>
            </>
          )}
        </>
      )}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </ScrollView>
  );
}
