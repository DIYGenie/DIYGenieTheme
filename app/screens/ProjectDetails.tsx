import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { View, Image, ActivityIndicator, Pressable, Text, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeBack } from '../lib/useSafeBack';
import { fetchProjectById, fetchLatestScanForProject, fetchProjectPlanMarkdown, requestProjectPreview } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { parsePlanMarkdown, Plan } from '../lib/plan';
import Toast from '../components/Toast';
import { saveImageToPhotos } from '../lib/media';
import { getCachedPlan, setCachedPlan } from '../lib/planCache';
import SectionCard from '../components/SectionCard';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

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
          {isPlanReady && (
            <View style={{ paddingLeft: 4 }}>
              <StatusBadge status="ready" />
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

  const copyText = async (txt: string) => {
    if (!txt) return;
    await Clipboard.setStringAsync(txt);
    console.log('[copy] ok');
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
          {/* 16:9 Preview block */}
          <View style={{ marginBottom: 20 }}>
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
              </>
            ) : (
              <View
                style={{
                  aspectRatio: 16/9,
                  borderRadius: 16,
                  backgroundColor: '#E9D5FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="image-outline" size={48} color="#A78BFA" />
                <Text style={{ color: '#7C3AED', marginTop: 8, fontSize: 14 }}>No preview yet</Text>
              </View>
            )}
          </View>

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

              {/* 4. Build Steps (with checkboxes - will be implemented next) */}
              <SectionCard
                icon={<Feather name="check-square" size={22} color="#6D28D9" />}
                title="Build Steps"
                countBadge={planObj.steps?.length || 0}
                summary={`${planObj.steps?.length || 0} steps`}
                onNavigate={() => {
                  console.log('[details] nav section=steps');
                  (navigation as any).navigate('DetailedInstructions', { id: projectId, section: 'steps' });
                }}
                defaultOpen
              >
                {planObj.steps?.length ? (
                  <>
                    <View style={{ marginBottom: 16 }}>
                      {planObj.steps.slice(0, 10).map((step: any, i: number) => {
                        const stepTitle = typeof step === 'string' ? step : (step.title || `Step ${i + 1}`);
                        const stepTime = typeof step === 'object' ? step.estimatedTime || step.time_minutes : null;
                        
                        return (
                          <View key={i} style={{ marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                              <Text style={{ fontSize: 15, fontWeight: '600', color: '#6D28D9' }}>{i + 1}.</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, color: '#374151', lineHeight: 22 }}>{stepTitle}</Text>
                                {stepTime && (
                                  <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
                                    ⏱ {typeof stepTime === 'number' ? `${stepTime} min` : stepTime}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Pressable
                        onPress={() => (navigation as any).navigate('DetailedInstructions', { id: projectId })}
                        style={{ flex: 1, backgroundColor: '#6D28D9', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                      >
                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Start Building</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          const text = planObj.steps.map((s: any, i: number) => 
                            `${i + 1}. ${typeof s === 'string' ? s : s.title}`
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
