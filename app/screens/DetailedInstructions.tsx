import React, { useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Image, ActivityIndicator } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { fetchProjectById, fetchProjectPlan, fetchProjectPlanMarkdown } from '../lib/api';
import { parsePlanMarkdown } from '../lib/plan';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { PlanResponse } from '../types/plan';

type R = RouteProp<Record<'DetailedInstructions', { id: string; section?: string }>, 'DetailedInstructions'>;

export default function DetailedInstructions() {
  const { params } = useRoute<R>();
  const [project, setProject] = React.useState<any>(null);
  const [planData, setPlanData] = React.useState<PlanResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const refs = {
    overview: useRef<View>(null),
    materials: useRef<View>(null),
    cuts: useRef<View>(null),
    tools: useRef<View>(null),
    steps: useRef<View>(null),
  };

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch project data
        const p = await fetchProjectById(params.id);
        setProject(p);
        
        // Try to fetch plan from API
        const apiPlan = await fetchProjectPlan(params.id);
        
        if (apiPlan.ok) {
          console.log('[detailed instructions] API plan loaded');
          setPlanData(apiPlan);
        } else {
          console.log('[detailed instructions] API plan failed, trying fallback', apiPlan.error);
          
          // Fallback to markdown plan if API fails
          if (!p?.plan) {
            try {
              const md = await fetchProjectPlanMarkdown(params.id);
              if (md) {
                setProject((prev: any) => ({ ...(prev || {}), plan: parsePlanMarkdown(md) }));
              }
            } catch (e) {
              console.log('[detailed instructions] fallback error', e);
              setError(apiPlan.error || 'Failed to load plan');
            }
          }
        }
      } catch (e) {
        console.error('[detailed instructions] error', e);
        setError(e instanceof Error ? e.message : 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  React.useEffect(() => {
    const section = params.section;
    if (section && refs[section as keyof typeof refs]?.current && scrollViewRef.current) {
      setTimeout(() => {
        refs[section as keyof typeof refs]?.current?.measureLayout(
          scrollViewRef.current as any,
          (_x: number, y: number) => {
            scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
          },
          () => {}
        );
      }, 300);
    }
  }, [params.section, planData, project]);

  const plan = planData ? null : (project?.plan ?? {});

  async function saveSection(ref: React.RefObject<View>, name: string) {
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
    } catch (e) {
      console.error(`Failed to save ${name}:`, e);
      throw e;
    }
  }

  async function saveAll() {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { 
        Alert.alert('Permission needed', 'Please allow Photo access.'); 
        return; 
      }
      setSaving(true);
      
      const sectionsToSave: [React.RefObject<View>, string][] = [
        [refs.overview, 'Overview'],
        [refs.materials, 'Materials'],
        [refs.tools, 'Tools'],
      ];
      
      if ((planData?.cutList?.items && planData.cutList.items.length > 0) || (plan.cuts && plan.cuts.length > 0)) {
        sectionsToSave.push([refs.cuts, 'Cut List']);
      }
      
      sectionsToSave.push([refs.steps, 'Build Steps']);
      
      for (const [ref, name] of sectionsToSave) {
        await saveSection(ref, name);
      }
      
      Alert.alert('Saved', 'All sections saved to Photos.');
    } catch (e) {
      Alert.alert('Save failed', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const totalSteps = planData?.steps?.length || plan.steps?.length || 0;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6B7280' }}>Loading plan...</Text>
      </View>
    );
  }

  if (error && !plan && !planData) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '600', color: '#111827', textAlign: 'center' }}>
          Failed to Load Plan
        </Text>
        <Text style={{ marginTop: 8, fontSize: 15, color: '#6B7280', textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView ref={scrollViewRef} style={{ flex: 1, backgroundColor: '#FAFAFA' }} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={{ backgroundColor: '#7C3AED', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: 'white', marginBottom: 8 }}>
          {planData?.summary?.title || project?.name || 'Build Plan'}
        </Text>
        <Text style={{ fontSize: 16, color: 'white', opacity: 0.9 }}>
          Step-by-step builder's guide
        </Text>
        
        {/* Quick stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {plan.skill_level && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>🎯 {plan.skill_level}</Text>
            </View>
          )}
          {(planData?.summary?.estTimeHours || plan.time_estimate_hours) && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                ⏱ {planData?.summary?.estTimeHours || plan.time_estimate_hours} hrs
              </Text>
            </View>
          )}
          {planData?.summary?.estCostUsd && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                💰 ${planData.summary.estCostUsd}
              </Text>
            </View>
          )}
          {totalSteps > 0 && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{totalSteps} steps</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quota Blocking Banner */}
      {planData?.quota?.blocked && (
        <View style={{ 
          backgroundColor: '#FEF2F2', 
          marginHorizontal: 16, 
          marginTop: 16, 
          padding: 16, 
          borderRadius: 12, 
          borderLeftWidth: 4, 
          borderLeftColor: '#EF4444' 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="lock-closed" size={20} color="#DC2626" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#991B1B', marginLeft: 8 }}>Plan Limit Reached</Text>
          </View>
          <Text style={{ fontSize: 14, color: '#7F1D1D', lineHeight: 20 }}>
            {planData.quota.message || 'You\'ve reached your plan generation limit. Upgrade to continue creating projects.'}
          </Text>
        </View>
      )}

      {/* Hero Image */}
      {planData?.summary?.heroImageUrl && (
        <View style={{ marginTop: 16, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' }}>
          <Image 
            source={{ uri: planData.summary.heroImageUrl }} 
            style={{ width: '100%', height: 220 }} 
            resizeMode="cover" 
          />
        </View>
      )}

      {/* Preview Images */}
      {planData?.preview && (planData.preview.beforeUrl || planData.preview.afterUrl) && (
        <View style={{ backgroundColor: 'white', marginTop: 16, marginHorizontal: 16, borderRadius: 16, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="images-outline" size={24} color="#7C3AED" />
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Preview</Text>
          </View>
          
          {planData.preview.beforeUrl && (
            <View style={{ marginBottom: planData.preview.afterUrl ? 16 : 0 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>Before</Text>
              <Image 
                source={{ uri: planData.preview.beforeUrl }} 
                style={{ width: '100%', height: 180, borderRadius: 12 }} 
                resizeMode="cover" 
              />
            </View>
          )}
          
          {planData.preview.afterUrl && (
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>After</Text>
              <Image 
                source={{ uri: planData.preview.afterUrl }} 
                style={{ width: '100%', height: 180, borderRadius: 12 }} 
                resizeMode="cover" 
              />
            </View>
          )}
        </View>
      )}

      {/* Overview Section */}
      <View ref={refs.overview} style={{ backgroundColor: 'white', marginTop: 16, marginHorizontal: 16, borderRadius: 16, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="information-circle" size={24} color="#7C3AED" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Overview</Text>
        </View>
        
        {plan.overview ? (
          <Text style={{ fontSize: 15, color: '#374151', lineHeight: 22 }}>{plan.overview}</Text>
        ) : (
          <Text style={{ fontSize: 15, color: '#9CA3AF' }}>No overview available.</Text>
        )}

        {/* Safety Warnings */}
        {(planData?.safety?.notes && planData.safety.notes.length > 0) || (plan.safety_warnings && plan.safety_warnings.length > 0) ? (
          <View style={{ marginTop: 16, backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: '#EF4444', padding: 12, borderRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="warning" size={20} color="#DC2626" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#991B1B', marginLeft: 6 }}>Safety First</Text>
            </View>
            {(planData?.safety?.notes || plan.safety_warnings || []).map((warning: string, i: number) => (
              <Text key={i} style={{ fontSize: 14, color: '#7F1D1D', lineHeight: 20, marginTop: 4 }}>
                • {warning}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Permits */}
        {planData?.permits && (planData.permits.needed || planData.permits.note) && (
          <View style={{ marginTop: 16, backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: '#F59E0B', padding: 12, borderRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="document-text" size={20} color="#D97706" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#92400E', marginLeft: 6 }}>Permits Required</Text>
            </View>
            <Text style={{ fontSize: 14, color: '#78350F', lineHeight: 20 }}>
              {planData.permits.note || 'Check with your local building department before starting this project.'}
            </Text>
          </View>
        )}
      </View>

      {/* Materials Section */}
      <View ref={refs.materials} style={{ backgroundColor: 'white', marginTop: 16, marginHorizontal: 16, borderRadius: 16, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <MaterialCommunityIcons name="package-variant" size={24} color="#7C3AED" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Materials</Text>
        </View>
        
        {planData?.materials && planData.materials.length > 0 ? (
          planData.materials.map((m, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < planData.materials!.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: '#111827' }}>{m.name}</Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  {m.qty} {m.unit}
                </Text>
              </View>
              {m.subtotalUsd && <Text style={{ fontSize: 16, fontWeight: '600', color: '#059669' }}>${m.subtotalUsd.toFixed(2)}</Text>}
            </View>
          ))
        ) : plan.materials && plan.materials.length > 0 ? (
          plan.materials.map((m: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < plan.materials.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: '#111827' }}>{m.name}</Text>
                {m.qty && <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{m.qty}{m.unit ? ' ' + m.unit : ''}</Text>}
              </View>
              {m.price && <Text style={{ fontSize: 16, fontWeight: '600', color: '#059669' }}>${m.price}</Text>}
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 15, color: '#9CA3AF' }}>No materials listed.</Text>
        )}
      </View>

      {/* Tools Section */}
      <View ref={refs.tools} style={{ backgroundColor: 'white', marginTop: 16, marginHorizontal: 16, borderRadius: 16, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Feather name="tool" size={24} color="#7C3AED" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Tools</Text>
        </View>
        
        {planData?.tools?.required && planData.tools.required.length > 0 && (
          <>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>Required</Text>
            {planData.tools.required.map((tool, i) => (
              <View key={`req-${i}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 15, color: '#111827' }}>• {tool}</Text>
              </View>
            ))}
          </>
        )}
        
        {planData?.tools?.optional && planData.tools.optional.length > 0 && (
          <>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginTop: 12, marginBottom: 8 }}>Optional</Text>
            {planData.tools.optional.map((tool, i) => (
              <View key={`opt-${i}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 15, color: '#6B7280' }}>• {tool}</Text>
              </View>
            ))}
          </>
        )}
        
        {!planData?.tools && plan.tools && plan.tools.length > 0 ? (
          plan.tools.map((tool: any, i: number) => {
            const toolObj = typeof tool === 'string' ? { name: tool } : tool;
            return (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < plan.tools.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                <Text style={{ fontSize: 15, color: '#111827', flex: 1 }}>{toolObj.name}</Text>
                {toolObj.rentalPrice && (
                  <Text style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>~${toolObj.rentalPrice}</Text>
                )}
              </View>
            );
          })
        ) : !planData?.tools ? (
          <Text style={{ fontSize: 15, color: '#9CA3AF' }}>No tools listed.</Text>
        ) : null}
      </View>

      {/* Cut List Section */}
      {((planData?.cutList?.items && planData.cutList.items.length > 0) || (plan.cuts && plan.cuts.length > 0)) && (
        <View ref={refs.cuts} style={{ backgroundColor: 'white', marginTop: 16, marginHorizontal: 16, borderRadius: 16, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <MaterialCommunityIcons name="content-cut" size={24} color="#7C3AED" />
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Cut List</Text>
          </View>
          
          {planData?.cutList?.items ? (
            <>
              {planData.cutList.items.map((cut, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < planData.cutList.items!.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                  <Text style={{ fontSize: 15, color: '#111827', flex: 1 }}>{cut.board}</Text>
                  <Text style={{ fontSize: 15, color: '#6B7280', fontWeight: '500' }}>
                    {cut.dims} × {cut.qty}
                  </Text>
                </View>
              ))}
              
              {planData.cutList.layoutSvgUrl && (
                <Pressable 
                  onPress={() => Alert.alert('Cut Layout', 'Opening layout diagram...')}
                  style={{ marginTop: 12, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#7C3AED' }}>View Cut Layout Diagram</Text>
                </Pressable>
              )}
            </>
          ) : plan.cuts ? (
            plan.cuts.map((cut: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < plan.cuts.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                <Text style={{ fontSize: 15, color: '#111827', flex: 1 }}>{cut.part}</Text>
                <Text style={{ fontSize: 15, color: '#6B7280', fontWeight: '500' }}>
                  {cut.width && cut.height ? `${cut.width}" × ${cut.height}"` : cut.size} ×{cut.qty ?? 1}
                </Text>
              </View>
            ))
          ) : null}
        </View>
      )}

      {/* Build Steps */}
      <View ref={refs.steps} style={{ marginTop: 24, marginHorizontal: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 20, letterSpacing: -0.5 }}>Build Steps</Text>
        
        {planData?.steps && planData.steps.length > 0 ? (
          planData.steps.map((step, i) => (
            <View key={i} style={{ marginBottom: 20 }}>
              <View style={{ 
                backgroundColor: 'white', 
                borderRadius: 20, 
                overflow: 'hidden', 
                shadowColor: '#7C3AED', 
                shadowOpacity: 0.1, 
                shadowRadius: 16, 
                shadowOffset: { width: 0, height: 4 }, 
                elevation: 5,
                borderWidth: 1,
                borderColor: '#F3F4F6'
              }}>
                {/* Step Header */}
                <View style={{ backgroundColor: '#FAFAFA', padding: 18, borderBottomWidth: 2, borderBottomColor: '#F3F4F6' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 20, 
                      backgroundColor: '#7C3AED', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      shadowColor: '#7C3AED',
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 }
                    }}>
                      <Text style={{ color: 'white', fontSize: 18, fontWeight: '800' }}>{i + 1}</Text>
                    </View>
                    <Text style={{ 
                      fontSize: 17, 
                      fontWeight: '700', 
                      color: '#111827', 
                      flex: 1, 
                      lineHeight: 24,
                      letterSpacing: -0.2
                    }}>
                      {step.title}
                    </Text>
                  </View>
                </View>

                {/* Diagram if available */}
                {step.diagramUrl && (
                  <Image source={{ uri: step.diagramUrl }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
                )}

                {/* Step Content */}
                <View style={{ padding: 16 }}>
                  <Text style={{ fontSize: 15, color: '#1F2937', lineHeight: 24 }}>{step.text}</Text>
                </View>
              </View>
            </View>
          ))
        ) : plan.steps && plan.steps.length > 0 ? (
          plan.steps.map((step: any, i: number) => (
            <View key={i} style={{ marginBottom: 20 }}>
              <View style={{ 
                backgroundColor: 'white', 
                borderRadius: 20, 
                overflow: 'hidden', 
                shadowColor: '#7C3AED', 
                shadowOpacity: 0.1, 
                shadowRadius: 16, 
                shadowOffset: { width: 0, height: 4 }, 
                elevation: 5,
                borderWidth: 1,
                borderColor: '#F3F4F6'
              }}>
                <View style={{ backgroundColor: '#FAFAFA', padding: 18, borderBottomWidth: 2, borderBottomColor: '#F3F4F6' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
                      <View style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 20, 
                        backgroundColor: '#7C3AED', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        shadowColor: '#7C3AED',
                        shadowOpacity: 0.4,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        marginTop: 2
                      }}>
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: '800' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ 
                        fontSize: 17, 
                        fontWeight: '700', 
                        color: '#111827', 
                        marginLeft: 14, 
                        flex: 1, 
                        lineHeight: 24,
                        letterSpacing: -0.2
                      }}>
                        {step.title || `Step ${i + 1}`}
                      </Text>
                    </View>
                  </View>
                </View>

                {step.photo_url && (
                  <Image source={{ uri: step.photo_url }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
                )}

                <View style={{ padding: 16 }}>
                  {step.body && (
                    <Text style={{ fontSize: 15, color: '#1F2937', lineHeight: 24 }}>{step.body}</Text>
                  )}
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 15, color: '#9CA3AF' }}>No build steps available.</Text>
        )}
      </View>

      {/* Save All Button */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
        <Pressable
          onPress={saveAll}
          disabled={saving}
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#6D28D9' : '#7C3AED',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            opacity: saving ? 0.7 : 1
          })}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
            {saving ? 'Saving...' : 'Save All Sections to Photos'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
