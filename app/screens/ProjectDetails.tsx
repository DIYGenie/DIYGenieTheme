import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { View, Image, ActivityIndicator, Pressable, Text, ScrollView } from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeBack } from '../lib/useSafeBack';
import { fetchProjectById, fetchLatestScanForProject, fetchProjectPlanMarkdown } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { parsePlanMarkdown, Plan } from '../lib/plan';
import AccordionCard from '../components/ui/AccordionCard';
import { countLabel, stepsTimeCost } from '../lib/planLabels';

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
            const { getLocalPlanMarkdown } = await import('../lib/localPlan');
            const local = await getLocalPlanMarkdown(projectId);
            let md = local;
            if (!md) md = await fetchProjectPlanMarkdown(projectId, { tolerate409: true });
            if (md && !controller.signal.aborted) {
              const parsed = parsePlanMarkdown(md);
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
          {/* Hero image */}
          {scan?.imageUrl ? (
            <Image
              source={{ uri: scan.imageUrl }}
              style={{ width: '100%', height: 220, borderRadius: 16, backgroundColor: '#EEE', marginBottom: 16 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: 220,
                borderRadius: 16,
                backgroundColor: '#F2F2F2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ color: '#6B7280' }}>No scan image yet</Text>
            </View>
          )}

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

          {/* Accordion cards (only if plan is ready) */}
          {planObj && (
            <>
              <View style={{ gap: 12, marginBottom: 16 }}>
                <AccordionCard
                  testID="accordion-materials"
                  title="Materials"
                  subtitle={countLabel(planObj.materials?.length, 'item')}
                  initiallyOpen={true}
                >
                  {planObj.materials?.length ? (
                    <View style={{ gap: 6 }}>
                      {planObj.materials.slice(0, 50).map((m: any, i: number) => (
                        <Text key={i} style={{ fontSize: 15, lineHeight: 22 }}>
                          • {m.name}
                          {m.qty ? ` — ${m.qty}${m.unit ? ' ' + m.unit : ''}` : ''}
                          {m.note ? ` • ${m.note}` : ''}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ color: '#6B7280', fontSize: 15 }}>No materials listed.</Text>
                  )}
                </AccordionCard>

                <AccordionCard
                  testID="accordion-cuts"
                  title="Cut list"
                  subtitle={countLabel(planObj.cuts?.length, 'cut')}
                >
                  {planObj.cuts?.length ? (
                    <View style={{ gap: 6 }}>
                      {planObj.cuts.map((c: any, i: number) => (
                        <Text key={i} style={{ fontSize: 15, lineHeight: 22 }}>
                          • {c.part} — {c.width && c.height ? `${c.width}" × ${c.height}"` : c.size} ×{c.qty ?? 1}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ color: '#6B7280', fontSize: 15 }}>No cut list.</Text>
                  )}
                </AccordionCard>

                <AccordionCard
                  testID="accordion-tools"
                  title="Tools"
                  subtitle={countLabel(planObj.tools?.length, 'tool')}
                >
                  {planObj.tools?.length ? (
                    <View style={{ gap: 6 }}>
                      {planObj.tools.map((t: string, i: number) => (
                        <Text key={i} style={{ fontSize: 15, lineHeight: 22 }}>• {t}</Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ color: '#6B7280', fontSize: 15 }}>No tools listed.</Text>
                  )}
                </AccordionCard>

                <AccordionCard
                  testID="accordion-steps"
                  title="Step-by-step"
                  subtitle={countLabel(planObj.steps?.length, 'step')}
                >
                  {planObj.steps?.length ? (
                    <View style={{ gap: 8 }}>
                      {planObj.steps.map((s: any, i: number) => (
                        <View key={i}>
                          <Text style={{ fontSize: 15, fontWeight: '700', lineHeight: 22, marginBottom: 2 }}>
                            {i + 1}. {s.title ?? 'Step'}
                          </Text>
                          {s.body && (
                            <Text style={{ fontSize: 15, color: '#4B5563', lineHeight: 22 }}>
                              {s.body.slice(0, 100)}{s.body.length > 100 ? '...' : ''}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ color: '#6B7280', fontSize: 15 }}>No steps yet.</Text>
                  )}
                </AccordionCard>

                <AccordionCard
                  testID="accordion-time-cost"
                  title="Time & Cost"
                  subtitle={stepsTimeCost(planObj)}
                >
                  <Text style={{ fontSize: 15, lineHeight: 22, marginBottom: 4 }}>
                    Estimated time: {planObj.time_estimate_hours ?? '—'} hrs
                  </Text>
                  <Text style={{ fontSize: 15, lineHeight: 22 }}>
                    Estimated cost: {planObj.cost_estimate_usd ? `$${planObj.cost_estimate_usd}` : '—'}
                  </Text>
                </AccordionCard>
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
    </ScrollView>
  );
}
