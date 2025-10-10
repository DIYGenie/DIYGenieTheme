import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { View, Image, ActivityIndicator, Pressable, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeBack } from '../lib/useSafeBack';
import { fetchProjectById, fetchLatestScanForProject, fetchProjectPlanMarkdown, requestProjectPreview } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { parsePlanMarkdown, Plan } from '../lib/plan';
import Toast from '../components/Toast';
import { saveImageToPhotos } from '../lib/media';
import { Ionicons } from '@expo/vector-icons';
import { getCachedPlan, setCachedPlan } from '../lib/planCache';
import PlanSummaryList from '../components/PlanSummaryList';

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
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {loading ? (
        <View style={{ paddingTop: 40 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          {/* 16:9 Preview block */}
          <View style={{ marginBottom: 16 }}>
            {previewUrl ? (
              <>
                <View style={{ position: 'relative', aspectRatio: 16/9, borderRadius: 16, overflow: 'hidden', backgroundColor: '#EEE' }}>
                  <Image
                    source={{ uri: previewUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    onPress={handleSavePreview}
                    style={{ 
                      position: 'absolute', 
                      top: 12, 
                      right: 12, 
                      backgroundColor: 'rgba(0,0,0,0.6)', 
                      paddingHorizontal: 12, 
                      paddingVertical: 6, 
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons name="download-outline" size={16} color="white" />
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>Save image</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ marginTop: 8, fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
                  Visual mockup generated from your scan
                </Text>
              </>
            ) : (
              <View
                style={{
                  aspectRatio: 16/9,
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

          {/* Single CTA button */}
          {!!planObj ? (
            <View style={{ marginBottom: 20 }}>
              <Pressable
                onPress={() => (navigation as any).navigate('DetailedInstructions', { id: projectId })}
                style={{
                  backgroundColor: '#7C3AED',
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: 'center',
                  shadowColor: '#7C3AED',
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  shadowOffset: { height: 4, width: 0 },
                  elevation: 4,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 17, marginBottom: 4 }}>
                  Open Detailed Build Plan
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                  Document-style guide with every step and detail
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Building status banner */}
          {isBuilding && (
            <View style={{ marginBottom: 16, backgroundColor: '#F3E8FF', borderRadius: 16, padding: 16 }}>
              <Text style={{ color: '#7C3AED', fontSize: 15, textAlign: 'center' }}>
                Plan is building…
              </Text>
            </View>
          )}

          {/* Expandable summary list when plan is available */}
          {!!planObj && <PlanSummaryList plan={planObj} />}

          {/* Generate AI Preview CTA - only show when project exists and preview isn't ready and no preview */}
          {!!projectId && !statusReady && !isBuilding && !previewUrl && (
            <View style={{ marginTop: 16 }}>
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
        </>
      )}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </ScrollView>
    </View>
  );
}
