import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { View, Image, ActivityIndicator, Pressable, Text, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeBack } from '../lib/useSafeBack';
import { fetchProjectById, fetchLatestScanForProject, fetchProjectPlanMarkdown, requestProjectPreview, fetchProjectProgress, updateProjectProgress, pollScanMeasurement, getMeasurement, MeasureResult } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { parsePlanMarkdown, Plan } from '../lib/plan';
import Toast from '../components/Toast';
import DimensionsCard from '../components/DimensionsCard';
import { saveImageToPhotos } from '../lib/media';
import { getCachedPlan, setCachedPlan } from '../lib/planCache';
import SectionCard from '../components/SectionCard';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type RouteParams = { id: string; justBuilt?: boolean };
type R = RouteProp<Record<'ProjectDetails', RouteParams>, 'ProjectDetails'>;

export default function ProjectDetails() {
  const route = useRoute<R>();
  const navigation = useNavigation();
  const safeBack = useSafeBack();
  const projectId = route.params?.id;
  const justBuilt = route.params?.justBuilt;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [scan, setScan] = useState<{ scanId: string; imageUrl: string; roi?: any; measureResult?: any } | null>(null);
  const [planObj, setPlanObj] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [offlineAvailable, setOfflineAvailable] = useState(false);
  const [measure, setMeasure] = useState<MeasureResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevProjectIdRef = useRef<string | undefined>(projectId);
  const scanId = project?.last_scan_id || project?.scan_id || project?.scan?.id;

  // Reset plan state when projectId changes
  useEffect(() => {
    if (prevProjectIdRef.current !== projectId) {
      setPlanObj(null);
      setOfflineAvailable(false);
      prevProjectIdRef.current = projectId;
    }
  }, [projectId]);

  // Poll for measurement once on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!project?.id || !scanId) return;
      try {
        const m = await getMeasurement(project.id, scanId);
        if (mounted) setMeasure(m);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [project?.id, scanId]);

  const loadPlanIfNeeded = useCallback(async () => {
    if (!projectId || !project) return;
    
    const ready = /ready/.test(String(project?.plan_status || project?.status || '').toLowerCase()) && 
                 !/requested|building|queued|pending/.test(String(project?.plan_status || project?.status || '').toLowerCase());
    
    if (ready && !planObj) {
      console.log('[plan] first-fetch start');
      setPlanLoading(true);
      try {
        const { getLocalPlanMarkdown } = await import('../lib/localPlan');
        const local = await getLocalPlanMarkdown(projectId);
        let md = local;
        if (!md) md = await fetchProjectPlanMarkdown(projectId, { tolerate409: true, cacheBust: true });
        if (md) {
          const parsed = parsePlanMarkdown(md);
          await setCachedPlan(projectId, parsed);
          setPlanObj(parsed);
          setOfflineAvailable(true);
          console.log('[plan] first-fetch done', {
            sections: {
              materials: parsed.materials?.length ?? 0,
              cuts: parsed.cuts?.length ?? 0,
              tools: parsed.tools?.length ?? 0,
              steps: parsed.steps?.length ?? 0
            }
          });
        }
      } catch (e) {
        console.log('[plan] first-fetch error', String(e));
      } finally {
        setPlanLoading(false);
      }
    }
  }, [projectId, project, planObj]);

  const load = useCallback(async () => {
    if (!projectId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const [p, s, prog] = await Promise.all([
        fetchProjectById(projectId, { signal: controller.signal, timeoutMs: 8000 }),
        fetchLatestScanForProject(projectId),
        fetchProjectProgress(projectId).catch(() => ({ completed_steps: [], current_step_index: 0 })),
      ]);
      
      if (!controller.signal.aborted) {
        setProject(p);
        setScan(s);
        setCompletedSteps(prog.completed_steps || []);
        setCurrentStepIndex(prog.current_step_index || 0);
        
        const ready = /ready/.test(String(p?.plan_status || p?.status || '').toLowerCase()) && 
                     !/requested|building|queued|pending/.test(String(p?.plan_status || p?.status || '').toLowerCase());
        
        if (ready) {
          try {
            // Try cache first
            const cached = await getCachedPlan(projectId);
            if (cached?.plan && !controller.signal.aborted) {
              setPlanObj(cached.plan);
              setOfflineAvailable(true);
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
              setOfflineAvailable(true);
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

  // Hero fallback logic: preview → scan → none
  const previewUrl = project?.preview_url ?? project?.plan?.preview_url ?? null;
  const scanUrl = scan?.imageUrl || null;
  const measureResult = scan?.measureResult || null;
  const roi = scan?.roi || null;

  let hero: 'preview' | 'scan' | 'none' = 'none';
  if (previewUrl) hero = 'preview';
  else if (scanUrl) hero = 'scan';
  
  console.log('[details] hero =', hero);

  const handleSaveImage = async () => {
    const imageUrl = hero === 'preview' ? previewUrl : scanUrl;
    if (!imageUrl) return;
    console.log('[preview] save-to-photos');
    const result = await saveImageToPhotos(imageUrl);
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
      setToast({ visible: true, message: 'Failed to request preview.', type: 'error' });
    }
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  const isPlanReady = !!planObj;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerBackVisible: true,
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 8 }}>
          {project?.name && (
            <View style={{ maxWidth: 180 }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
                {project.name}
              </Text>
            </View>
          )}
          {/* Offline badge temporarily hidden for polish */}
          {false && offlineAvailable && (
            <View style={{ backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: 'white' }}>OFFLINE ✓</Text>
            </View>
          )}
          {isPlanReady && (
            <View style={{ paddingLeft: 4 }}>
              <StatusBadge status="ready" />
            </View>
          )}
        </View>
      ),
    });
  }, [navigation, safeBack, project?.name, isPlanReady, offlineAvailable]);

  useEffect(() => {
    load();
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
      
      // Clear justBuilt param after first use
      if (justBuilt) {
        navigation.setParams({ justBuilt: undefined } as any);
      }
      
      return () => {
        abortRef.current?.abort();
      };
    }, [load, justBuilt, navigation])
  );

  // Load plan immediately when project is ready
  useFocusEffect(
    useCallback(() => {
      if (justBuilt || !planObj) {
        loadPlanIfNeeded();
      }
    }, [loadPlanIfNeeded, justBuilt, planObj])
  );

  // Poll for preview status when queued or processing
  useEffect(() => {
    if (!projectId || !project) return;
    
    const previewStatus = project.preview_status?.toLowerCase();
    const shouldPoll = previewStatus === 'queued' || previewStatus === 'processing';
    
    if (!shouldPoll) return;
    
    const abortController = new AbortController();
    let polling = true;
    
    const pollStatus = async () => {
      try {
        const u = await supabase.auth.getSession();
        const user_id = u?.data?.session?.user?.id;
        
        while (polling && !abortController.signal.aborted) {
          console.log('[preview] polling…');
          
          const r = await fetch(`https://api.diygenieapp.com/api/projects/${projectId}/preview/status?user_id=${user_id}`, {
            signal: abortController.signal
          });
          
          if (r.status === 200) {
            const result = await r.json();
            if (result.status === 'done' && result.url) {
              console.log('[preview] ready', { url: result.url });
              setProject((prev: any) => ({
                ...prev,
                preview_status: 'done',
                preview_url: result.url
              }));
              polling = false;
              console.log('[preview] stop');
              break;
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (err) {
        if ((err as any)?.name !== 'AbortError') {
          console.log('[preview] poll error', err);
        }
      }
    };
    
    pollStatus();
    
    return () => {
      polling = false;
      abortController.abort();
      console.log('[preview] stop');
    };
  }, [projectId, project?.preview_status]);

  const statusReady = /ready/.test(String(project?.plan_status || project?.status || '').toLowerCase());
  const isBuilding = /requested|building|queued|pending/.test(String(project?.plan_status || project?.status || '').toLowerCase());

  // Log plan state
  const planState = isBuilding ? 'building' : planLoading ? 'loading' : planObj ? 'ready' : 'none';
  console.log('[details] plan state =', planState);

  const copyText = async (txt: string) => {
    if (!txt) return;
    await Clipboard.setStringAsync(txt);
    console.log('[copy] ok');
  };

  const toggleStepComplete = async (stepIndex: number) => {
    if (!projectId) return;
    
    const isCompleted = completedSteps.includes(stepIndex);
    let newCompleted: number[];
    
    if (isCompleted) {
      newCompleted = completedSteps.filter(i => i !== stepIndex);
    } else {
      newCompleted = [...completedSteps, stepIndex].sort((a, b) => a - b);
    }
    
    setCompletedSteps(newCompleted);
    setCurrentStepIndex(stepIndex);
    
    try {
      await updateProjectProgress(projectId, {
        completed_steps: newCompleted,
        current_step_index: stepIndex
      });
      console.log('[progress] step', stepIndex, isCompleted ? 'unchecked' : 'checked');
    } catch (e) {
      console.error('[progress] update failed', e);
      setCompletedSteps(completedSteps);
    }
  };

  const fmtQty = (q?: number | string, u?: string) => {
    if (q == null || q === '') return '';
    return u ? `${q} ${u}` : String(q);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F3FF' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {loading ? (
        <View style={{ paddingTop: 40 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          {/* Single Hero Image - Priority: preview → scan → none */}
          {(hero === 'preview' || hero === 'scan') && (
            <View style={{ marginBottom: 20 }}>
              {hero === 'preview' ? (
                <View style={{ position: 'relative', aspectRatio: 16/9, borderRadius: 16, overflow: 'hidden', backgroundColor: '#EEE', 
                  shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                  <Image
                    source={{ uri: previewUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    onPress={handleSaveImage}
                    accessibilityLabel="Save image"
                    style={{ 
                      position: 'absolute', 
                      top: 12, 
                      right: 12, 
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Ionicons name="download-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                  
                  {/* ROI overlay for preview */}
                  {measure?.roi && (() => {
                    const labelTop = `${Math.max(0, (measure.roi.y * 100) - 6)}%` as any;
                    return (
                      <View style={{ position:'absolute', left: 16, right: 16, top: 16, bottom: 16 }}>
                        <View
                          pointerEvents="none"
                          style={{
                            position:'absolute',
                            left: `${measure.roi.x * 100}%`,
                            top: `${measure.roi.y * 100}%`,
                            width: `${measure.roi.w * 100}%`,
                            height: `${measure.roi.h * 100}%`,
                            borderWidth: 2,
                            borderColor: 'rgba(255,255,255,0.9)',
                            backgroundColor: 'rgba(255,255,255,0.12)',
                            borderRadius: 8,
                          }}
                        />
                        <View style={{
                          position:'absolute',
                          left: `${measure.roi.x * 100}%`,
                          top: labelTop,
                          paddingHorizontal:8, paddingVertical:4, borderRadius:6,
                          backgroundColor:'rgba(0,0,0,0.55)'
                        }}>
                          <Text style={{color:'#fff', fontSize:12, fontWeight:'600'}}>
                            {Math.round(measure.width_in)}″ × {Math.round(measure.height_in)}″
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              ) : (
                <View style={{ position: 'relative', aspectRatio: 16/9, borderRadius: 16, overflow: 'hidden', backgroundColor: '#EEE',
                  shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                  <Image
                    source={{ uri: scanUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  
                  {/* Measurement badge if available */}
                  {measureResult && (
                    <View style={{ 
                      position: 'absolute', 
                      bottom: 12, 
                      left: 12, 
                      backgroundColor: 'rgba(124,58,237,0.9)', 
                      paddingHorizontal: 10, 
                      paddingVertical: 6, 
                      borderRadius: 8 
                    }}>
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                        {measureResult.width_in}" × {measureResult.height_in}"
                      </Text>
                    </View>
                  )}
                  
                  {/* Save to Photos button */}
                  <TouchableOpacity 
                    onPress={handleSaveImage}
                    accessibilityLabel="Save image"
                    style={{ 
                      position: 'absolute', 
                      top: 12, 
                      right: 12, 
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Ionicons name="download-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                  
                  {/* ROI overlay for scan */}
                  {measure?.roi && (() => {
                    const labelTop = `${Math.max(0, (measure.roi.y * 100) - 6)}%` as any;
                    return (
                      <View style={{ position:'absolute', left: 16, right: 16, top: 16, bottom: 16 }}>
                        <View
                          pointerEvents="none"
                          style={{
                            position:'absolute',
                            left: `${measure.roi.x * 100}%`,
                            top: `${measure.roi.y * 100}%`,
                            width: `${measure.roi.w * 100}%`,
                            height: `${measure.roi.h * 100}%`,
                            borderWidth: 2,
                            borderColor: 'rgba(255,255,255,0.9)',
                            backgroundColor: 'rgba(255,255,255,0.12)',
                            borderRadius: 8,
                          }}
                        />
                        <View style={{
                          position:'absolute',
                          left: `${measure.roi.x * 100}%`,
                          top: labelTop,
                          paddingHorizontal:8, paddingVertical:4, borderRadius:6,
                          backgroundColor:'rgba(0,0,0,0.55)'
                        }}>
                          <Text style={{color:'#fff', fontSize:12, fontWeight:'600'}}>
                            {Math.round(measure.width_in)}″ × {Math.round(measure.height_in)}″
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              )}
            </View>
          )}

          {/* Top CTA */}
          {!!planObj && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                console.log('[details] nav to full');
                (navigation as any).navigate('DetailedInstructions', { id: projectId });
              }}
              style={{
                borderRadius: 16, overflow: 'hidden', marginBottom: 16,
                shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6
              }}
            >
              <LinearGradient colors={['#7C3AED','#6D28D9']} start={{x:0,y:0}} end={{x:1,y:1}} style={{ padding: 18 }}>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>
                  Open Detailed Build Plan
                </Text>
                <Text style={{ color: 'white', opacity: 0.85 }}>
                  Document-style guide with every step and detail
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Building status banner */}
          {isBuilding && (
            <View style={{ marginBottom: 20, backgroundColor: '#F3E8FF', borderRadius: 16, padding: 18, alignItems: 'center' }}>
              <ActivityIndicator color="#6D28D9" />
              <Text style={{ color: '#6D28D9', fontSize: 15, marginTop: 8 }}>
                Plan is building…
              </Text>
            </View>
          )}

          {/* Plan loading skeleton */}
          {planLoading && !planObj && (
            <View style={{ marginBottom: 20, backgroundColor: '#F3E8FF', borderRadius: 16, padding: 18, alignItems: 'center' }}>
              <ActivityIndicator color="#6D28D9" />
              <Text style={{ color: '#6D28D9', fontSize: 15, marginTop: 8 }}>
                Loading plan…
              </Text>
            </View>
          )}

          {/* Section Cards */}
          {!!planObj && (
            <>
              {/* 1. Overview */}
              <SectionCard
                icon={<Ionicons name="information-circle-outline" size={22} color="#6D28D9" />}
                title="Overview"
                summary="Project summary"
                onNavigate={() => {
                  console.log('[details] nav section=overview');
                  (navigation as any).navigate('DetailedInstructions', { id: projectId, section: 'overview' });
                }}
              >
                <Text style={{ fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 12 }}>
                  {planObj.overview || 'No overview yet.'}
                </Text>
                
                {/* Time & Cost & Skill */}
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {planObj.skill_level && (
                    <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>🎯</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#6D28D9', textTransform: 'capitalize' }}>{planObj.skill_level}</Text>
                    </View>
                  )}
                  {planObj.time_estimate_hours && (
                    <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>⏱</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#6D28D9' }}>{planObj.time_estimate_hours} hrs</Text>
                    </View>
                  )}
                  {planObj.cost_estimate_usd && (
                    <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>💵</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#6D28D9' }}>${planObj.cost_estimate_usd}</Text>
                    </View>
                  )}
                </View>

                {/* Safety Warnings */}
                {planObj.safety_warnings && planObj.safety_warnings.length > 0 && (
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginTop: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 6 }}>⚠️ Safety First</Text>
                    {planObj.safety_warnings.map((warning, i) => (
                      <Text key={i} style={{ fontSize: 13, color: '#92400E', lineHeight: 18 }}>• {warning}</Text>
                    ))}
                  </View>
                )}
              </SectionCard>

              {/* Dimensions Card */}
              <DimensionsCard measure={measure} />

              {/* 2. Materials + Tools (combined shopping list) */}
              <SectionCard
                icon={<MaterialCommunityIcons name="cart-outline" size={22} color="#6D28D9" />}
                title="Materials + Tools"
                countBadge={(planObj.materials?.length || 0) + (planObj.tools?.length || 0)}
                summary="Shopping list"
                onNavigate={() => {
                  console.log('[details] nav section=shopping');
                  (navigation as any).navigate('DetailedInstructions', { id: projectId, section: 'shopping' });
                }}
              >
                {/* Materials section */}
                {planObj.materials && planObj.materials.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#6D28D9', marginBottom: 8 }}>Materials (Required)</Text>
                    {planObj.materials.map((m: any, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                        <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                          <Text style={{ color: '#6D28D9', fontSize: 18 }}>•</Text>
                          <Text style={{ fontSize: 15, color: '#374151', flex: 1 }}>
                            {m.name} {m.qty && <Text style={{ fontWeight: '600' }}>({m.qty}{m.unit ? ' ' + m.unit : ''})</Text>}
                          </Text>
                        </View>
                        {m.price && <Text style={{ fontSize: 15, fontWeight: '600', color: '#059669' }}>${m.price}</Text>}
                      </View>
                    ))}
                  </View>
                )}

                {/* Tools section */}
                {planObj.tools && planObj.tools.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#6D28D9', marginBottom: 8 }}>Tools</Text>
                    {planObj.tools.map((tool: any, i: number) => {
                      const toolObj = typeof tool === 'string' ? { name: tool } : tool;
                      const needToBuy = toolObj.have === false;
                      return (
                        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                          <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                            <Text style={{ color: '#6D28D9', fontSize: 18 }}>•</Text>
                            <Text style={{ fontSize: 15, color: '#374151', flex: 1 }}>{toolObj.name}</Text>
                          </View>
                          {needToBuy && toolObj.rentalPrice && (
                            <Text style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>
                              if needed ~${toolObj.rentalPrice}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Copy button */}
                <Pressable
                  onPress={() => {
                    const matText = (planObj.materials || []).map((m: any) => 
                      `• ${m.name}${m.qty ? ` (${m.qty}${m.unit ? ' ' + m.unit : ''})` : ''}${m.price ? ` - $${m.price}` : ''}`
                    ).join('\n');
                    const toolText = (planObj.tools || []).map((t: any) => {
                      const tool = typeof t === 'string' ? { name: t } : t;
                      return `• ${tool.name}${tool.rentalPrice ? ` (~$${tool.rentalPrice})` : ''}`;
                    }).join('\n');
                    const text = `MATERIALS:\n${matText}\n\nTOOLS:\n${toolText}`;
                    copyText(text);
                  }}
                  style={{ backgroundColor: '#EDE9FE', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 12 }}
                >
                  <Text style={{ color: '#6D28D9', fontWeight: '600', fontSize: 14 }}>Copy Shopping List</Text>
                </Pressable>
              </SectionCard>

              {/* 3. Cut List */}
              {planObj.cuts && planObj.cuts.length > 0 && (
                <SectionCard
                  icon={<MaterialCommunityIcons name="content-cut" size={22} color="#6D28D9" />}
                  title="Cut List"
                  countBadge={planObj.cuts?.length || 0}
                  summary="Cutting guide"
                  onNavigate={() => {
                    console.log('[details] nav section=cuts');
                    (navigation as any).navigate('DetailedInstructions', { id: projectId, section: 'cuts' });
                  }}
                >
                  <View>
                    {planObj.cuts.map((cut: any, i: number) => (
                      <View key={i} style={{ 
                        flexDirection: 'row', 
                        justifyContent: 'space-between', 
                        paddingVertical: 10, 
                        borderBottomWidth: i < planObj.cuts.length - 1 ? 1 : 0,
                        borderBottomColor: '#E5E7EB'
                      }}>
                        <Text style={{ fontSize: 15, color: '#374151', flex: 1 }}>{cut.part}</Text>
                        <Text style={{ fontSize: 15, color: '#6B7280', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                          {cut.width && cut.height ? `${cut.width}" × ${cut.height}"` : cut.size} ×{cut.qty ?? 1}
                        </Text>
                      </View>
                    ))}
                  </View>
                  
                  <Pressable
                    onPress={() => {
                      const text = planObj.cuts.map((c: any) => 
                        `${c.part}: ${c.width && c.height ? `${c.width}" × ${c.height}"` : c.size} (×${c.qty ?? 1})`
                      ).join('\n');
                      copyText(text);
                    }}
                    style={{ backgroundColor: '#EDE9FE', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 12 }}
                  >
                    <Text style={{ color: '#6D28D9', fontWeight: '600', fontSize: 14 }}>Copy Cut List</Text>
                  </Pressable>
                </SectionCard>
              )}

              {/* 4. Build Steps (with checkboxes and progress) */}
              <SectionCard
                icon={<Feather name="check-square" size={22} color="#6D28D9" />}
                title="Build Steps"
                countBadge={planObj.steps?.length || 0}
                summary={completedSteps.length > 0 ? `${Math.round((completedSteps.length / (planObj.steps?.length || 1)) * 100)}% complete` : `${planObj.steps?.length || 0} steps`}
                onNavigate={() => {
                  console.log('[details] nav section=steps');
                  (navigation as any).navigate('DetailedInstructions', { id: projectId, section: 'steps' });
                }}
                defaultOpen
              >
                {planObj.steps?.length ? (
                  <>
                    {/* Progress bar */}
                    {completedSteps.length > 0 && (
                      <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontSize: 13, color: '#6B7280' }}>Progress</Text>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#6D28D9' }}>
                            {completedSteps.length}/{planObj.steps.length} steps
                          </Text>
                        </View>
                        <View style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                          <View style={{ 
                            height: '100%', 
                            width: `${(completedSteps.length / planObj.steps.length) * 100}%`, 
                            backgroundColor: '#6D28D9' 
                          }} />
                        </View>
                      </View>
                    )}

                    <View style={{ marginBottom: 16 }}>
                      {planObj.steps.slice(0, 10).map((step: any, i: number) => {
                        const stepTitle = typeof step === 'string' ? step : (step.title || `Step ${i + 1}`);
                        const stepTime = typeof step === 'object' ? step.estimatedTime || step.time_minutes : null;
                        const isCompleted = completedSteps.includes(i);
                        
                        return (
                          <Pressable 
                            key={i} 
                            onPress={() => toggleStepComplete(i)}
                            style={{ marginBottom: 12 }}
                          >
                            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                              {/* Checkbox */}
                              <View style={{ 
                                width: 24, 
                                height: 24, 
                                borderRadius: 6, 
                                borderWidth: 2, 
                                borderColor: isCompleted ? '#6D28D9' : '#D1D5DB',
                                backgroundColor: isCompleted ? '#6D28D9' : 'transparent',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: 2
                              }}>
                                {isCompleted && <Ionicons name="checkmark" size={16} color="white" />}
                              </View>
                              
                              <View style={{ flex: 1 }}>
                                <Text style={{ 
                                  fontSize: 15, 
                                  color: isCompleted ? '#9CA3AF' : '#374151', 
                                  lineHeight: 22,
                                  textDecorationLine: isCompleted ? 'line-through' : 'none'
                                }}>
                                  {i + 1}. {stepTitle}
                                </Text>
                                {stepTime && (
                                  <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
                                    ⏱ {typeof stepTime === 'number' ? `${stepTime} min` : stepTime}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                    
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Pressable
                        onPress={() => (navigation as any).navigate('DetailedInstructions', { id: projectId })}
                        style={{ flex: 1, backgroundColor: '#6D28D9', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                      >
                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                          {completedSteps.length === 0 ? 'Start Building' : 'Continue Building'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          const text = planObj.steps.map((s: any, i: number) => 
                            `${completedSteps.includes(i) ? '✓' : '☐'} ${i + 1}. ${typeof s === 'string' ? s : s.title}`
                          ).join('\n');
                          copyText(text);
                        }}
                        style={{ flex: 1, backgroundColor: '#EDE9FE', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#6D28D9', fontWeight: '600', fontSize: 14 }}>Copy Steps</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No steps yet.</Text>
                )}
              </SectionCard>

              {/* 5. Finishing (only if applicable) */}
              {planObj.finishing && planObj.finishing.length > 0 && (
                <SectionCard
                  icon={<MaterialCommunityIcons name="shimmer" size={22} color="#6D28D9" />}
                  title="Finishing"
                  summary="Final touches"
                  onNavigate={() => {
                    console.log('[details] nav section=finishing');
                    (navigation as any).navigate('DetailedInstructions', { id: projectId, section: 'finishing' });
                  }}
                >
                  <View>
                    {planObj.finishing.map((item: any, i: number) => (
                      <View key={i} style={{ marginBottom: 12 }}>
                        {item.title && (
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
                            {item.title}
                          </Text>
                        )}
                        {item.description && (
                          <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 20 }}>
                            {item.description}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </SectionCard>
              )}
            </>
          )}

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
