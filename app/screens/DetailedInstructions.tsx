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

// -- Safe text helpers (local to this screen) --
const notNil = (v: any) => v !== null && v !== undefined;

const joinText = (...parts: (string | null | undefined)[]) =>
  parts.filter(p => typeof p === 'string' && p.length > 0).join(' ');

const fmtMoney = (n: number | null | undefined) =>
  notNil(n) ? `$${Number(n).toFixed(2).replace(/\.00$/, '')}` : null;

const fmtQtyUnit = (qty: number | string | null | undefined, unit?: string | null) => {
  const q = notNil(qty) ? String(qty) : null;
  const u = unit ? String(unit) : null;
  return joinText(q, u);
};

const fmtDim = (w?: number | null, h?: number | null) =>
  notNil(w) && notNil(h) ? `${w}" x ${h}"` : null;

const TextIf: React.FC<{ style?: any; children?: string | null }> = ({ style, children }) => {
  if (!children) return null;
  return <Text style={style}>{children}</Text>;
};

function RowText({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[{ fontSize: 14, color: '#374151' }, style]}>{children}</Text>;
}

export default function DetailedInstructions() {
  const { params } = useRoute<R>();
  const [project, setProject] = React.useState<any>(null);
  const [planData, setPlanData] = React.useState<PlanResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [previewTab, setPreviewTab] = React.useState<'before'|'after'>('after');
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

  const plan = project?.plan ?? {};

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
    <ScrollView ref={scrollViewRef} style={{ flex: 1, backgroundColor: '#FAFAFA' }} contentContainerStyle={{ paddingBottom: 100, paddingTop: 60 }}>
      {/* Summary Card */}
      <View style={{ backgroundColor: '#6F42F5', padding: 16, borderRadius: 16, margin: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: 'white' }}>
          {planData?.summary?.title || project?.name || 'DIY Project'}
        </Text>
        <Text style={{ fontSize: 16, color: 'white', opacity: 0.9, marginTop: 6 }}>
          Step-by-step builder's guide
        </Text>
        
        {/* Stats row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <TextIf style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
            {notNil(planData?.summary?.estTimeHours) ? `${planData!.summary!.estTimeHours} hrs`
             : notNil(plan?.time_estimate_hours) ? `${plan!.time_estimate_hours} hrs`
             : null}
          </TextIf>

          <TextIf style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
            {fmtMoney(planData?.summary?.estCostUsd)}
          </TextIf>

          <TextIf style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
            {totalSteps > 0 ? `${totalSteps} steps` : null}
          </TextIf>
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

      {/* Hero Image - Disabled: Show Before/After only */}
      {/* {planData?.summary?.heroImageUrl && (
        <View style={{ marginTop: 16, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' }}>
          <Image 
            source={{ uri: planData.summary.heroImageUrl }} 
            style={{ width: '100%', height: 220 }} 
            resizeMode="cover" 
          />
        </View>
      )} */}

      {/* Preview with Before/After Toggle */}
      {(() => {
        const beforeUri = project?.before || planData?.preview?.beforeUrl;
        const afterUri = project?.preview || planData?.preview?.afterUrl || plan?.preview_image_url;
        
        if (!beforeUri && !afterUri) return null;
        
        return (
          <View style={{ backgroundColor: 'white', marginTop: 16, marginHorizontal: 16, borderRadius: 16, padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="images-outline" size={24} color="#7C3AED" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Preview</Text>
            </View>
            
            {/* Toggle Bar */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F1EEFF', borderRadius: 10, padding: 4, marginBottom: 12 }}>
              {(['before', 'after'] as const).map(tab => (
                <Pressable 
                  key={tab} 
                  onPress={() => setPreviewTab(tab)} 
                  style={{ 
                    flex: 1, 
                    paddingVertical: 10, 
                    borderRadius: 8, 
                    backgroundColor: previewTab === tab ? 'white' : 'transparent' 
                  }}
                >
                  <Text style={{ 
                    textAlign: 'center', 
                    fontWeight: previewTab === tab ? '700' : '500', 
                    color: '#3A2EB0' 
                  }}>
                    {tab === 'before' ? 'Before' : 'After'}
                  </Text>
                </Pressable>
              ))}
            </View>
            
            {/* Single Image Display */}
            {(() => {
              const activeUri = previewTab === 'before' ? beforeUri : afterUri;
              if (activeUri) {
                return (
                  <Image 
                    source={{ uri: activeUri }} 
                    style={{ width: '100%', height: 220, borderRadius: 16, backgroundColor: '#EEE' }} 
                    resizeMode="cover" 
                  />
                );
              }
              return (
                <Text style={{ color: '#777', fontSize: 15, textAlign: 'center', paddingVertical: 40 }}>
                  No {previewTab} image available.
                </Text>
              );
            })()}
          </View>
        );
      })()}

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

        {/* Safety Warnings - Compact */}
        {(planData?.safety?.notes && planData.safety.notes.length > 0) || (plan.safety_warnings && plan.safety_warnings.length > 0) ? (
          <View style={{ marginTop: 12, backgroundColor: '#FEF2F2', borderLeftWidth: 3, borderLeftColor: '#EF4444', padding: 12, borderRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="warning" size={18} color="#DC2626" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#991B1B', marginLeft: 6 }}>Safety First</Text>
            </View>
            {(planData?.safety?.notes || plan.safety_warnings || []).map((warning: string, i: number) => (
              <Text key={i} style={{ fontSize: 14, color: '#7F1D1D', lineHeight: 18, marginTop: 2 }}>
                {warning}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Permits - Compact */}
        {planData?.permits && (planData.permits.needed || planData.permits.note) && (
          <View style={{ marginTop: 12, backgroundColor: '#FEF3C7', borderLeftWidth: 3, borderLeftColor: '#F59E0B', padding: 12, borderRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="document-text" size={18} color="#D97706" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#92400E', marginLeft: 6 }}>Permits Required</Text>
            </View>
            <Text style={{ fontSize: 14, color: '#78350F', lineHeight: 18 }}>
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
          <>
            {planData.materials.map((m, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < planData.materials!.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: '#111827' }}>
                    {joinText(fmtQtyUnit(m.qty, m.unit), m.name)}
                  </Text>
                </View>
                <TextIf style={{ fontSize: 15, fontWeight: '600', color: '#059669', marginLeft: 12 }}>
                  {fmtMoney(m.subtotalUsd)}
                </TextIf>
              </View>
            ))}
            
            {(() => {
              const subtotal = planData.materials.reduce((sum, m) => sum + (m.subtotalUsd || 0), 0);
              if (subtotal > 0) {
                return (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 2, borderTopColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Materials Subtotal</Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#059669' }}>{fmtMoney(subtotal)}</Text>
                  </View>
                );
              }
              return null;
            })()}
          </>
        ) : plan.materials && plan.materials.length > 0 ? (
          plan.materials.map((m: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < plan.materials.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: '#111827' }}>{m.name}</Text>
                <TextIf style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  {fmtQtyUnit(m.qty, m.unit)}
                </TextIf>
              </View>
              <TextIf style={{ fontSize: 16, fontWeight: '600', color: '#059669' }}>
                {fmtMoney(m.price)}
              </TextIf>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 15, color: '#9CA3AF' }}>No materials yet.</Text>
        )}
      </View>

      {/* Tools Section */}
      <View ref={refs.tools} style={{ backgroundColor: 'white', marginTop: 16, marginHorizontal: 16, borderRadius: 16, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Feather name="tool" size={24} color="#7C3AED" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Tools</Text>
        </View>
        
        {planData?.tools ? (
          <>
            {planData.tools.required && planData.tools.required.length > 0 && (
              <>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>Required</Text>
                {planData.tools.required.map((tool, i) => (
                  <View key={`req-${i}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                    <Text style={{ fontSize: 15, color: '#111827' }}>{tool}</Text>
                  </View>
                ))}
              </>
            )}
            
            {planData.tools.optional && planData.tools.optional.length > 0 && (
              <>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginTop: planData.tools.required && planData.tools.required.length > 0 ? 12 : 0, marginBottom: 8 }}>Optional</Text>
                {planData.tools.optional.map((tool, i) => (
                  <View key={`opt-${i}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                    <Text style={{ fontSize: 15, color: '#6B7280' }}>{tool}</Text>
                  </View>
                ))}
              </>
            )}
            
            {(!planData.tools.required || planData.tools.required.length === 0) && (
              <>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>Required</Text>
                <Text style={{ fontSize: 15, color: '#9CA3AF' }}>None listed.</Text>
              </>
            )}
            
            {(!planData.tools.optional || planData.tools.optional.length === 0) && (
              <>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginTop: 12, marginBottom: 8 }}>Optional</Text>
                <Text style={{ fontSize: 15, color: '#9CA3AF' }}>None listed.</Text>
              </>
            )}
          </>
        ) : plan.tools && plan.tools.length > 0 ? (
          plan.tools.map((tool: any, i: number) => {
            const toolObj = typeof tool === 'string' ? { name: tool } : tool;
            return (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < plan.tools.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                <Text style={{ fontSize: 15, color: '#111827', flex: 1 }}>{toolObj.name}</Text>
                <TextIf style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>
                  {toolObj.rentalPrice ? `~${fmtMoney(toolObj.rentalPrice)}` : null}
                </TextIf>
              </View>
            );
          })
        ) : (
          <>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>Required</Text>
            <Text style={{ fontSize: 15, color: '#9CA3AF' }}>None listed.</Text>
          </>
        )}
      </View>

      {/* Cut List Section */}
      <View ref={refs.cuts} style={{ backgroundColor: 'white', marginTop: 16, marginHorizontal: 16, borderRadius: 16, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <MaterialCommunityIcons name="content-cut" size={24} color="#7C3AED" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Cut List</Text>
        </View>
        
        {planData?.cutList?.items && planData.cutList.items.length > 0 ? (
          <>
            {/* Table Header */}
            <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: '#E5E7EB', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', flex: 2 }}>BOARD</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', flex: 2, textAlign: 'center' }}>DIMENSIONS</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', flex: 1, textAlign: 'right' }}>QTY</Text>
            </View>
            
            {planData.cutList.items.map((cut, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < planData.cutList.items!.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                <Text style={{ fontSize: 15, color: '#111827', flex: 2 }}>{cut.board}</Text>
                <Text style={{ fontSize: 15, color: '#6B7280', flex: 2, textAlign: 'center' }}>{cut.dims}</Text>
                <Text style={{ fontSize: 15, color: '#111827', fontWeight: '600', flex: 1, textAlign: 'right' }}>{cut.qty}</Text>
              </View>
            ))}
            
            {planData.cutList.layoutSvgUrl && (
              <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 }}>
                <Image 
                  source={{ uri: planData.cutList.layoutSvgUrl }} 
                  style={{ width: '100%', height: 200, borderRadius: 8, backgroundColor: '#F9FAFB' }} 
                  resizeMode="contain" 
                />
                <Pressable 
                  onPress={() => Alert.alert('Cut Layout', planData.cutList.layoutSvgUrl || 'Layout diagram available')}
                  style={{ marginTop: 12, padding: 10, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#7C3AED' }}>View full layout</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : plan.cuts && plan.cuts.length > 0 ? (
          plan.cuts.map((cut: any, i: number) => {
            const dimOrSize = fmtDim(cut.width, cut.height) ?? (cut.size ?? null);
            const qty = notNil(cut.qty) ? String(cut.qty) : '1';
            return (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < plan.cuts.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                <Text style={{ fontSize: 15, color: '#111827', flex: 1 }}>{cut.part}</Text>
                <Text style={{ fontSize: 15, color: '#6B7280', fontWeight: '500' }}>
                  {joinText(dimOrSize, `x${qty}`)}
                </Text>
              </View>
            );
          })
        ) : (
          <>
            {/* Table Header */}
            <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: '#E5E7EB', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', flex: 2 }}>BOARD</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', flex: 2, textAlign: 'center' }}>DIMENSIONS</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', flex: 1, textAlign: 'right' }}>QTY</Text>
            </View>
            <Text style={{ fontSize: 15, color: '#9CA3AF', marginTop: 8 }}>No cuts listed.</Text>
          </>
        )}
      </View>

      {/* Build Steps */}
      <View ref={refs.steps} style={{ marginTop: 24, marginHorizontal: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12, letterSpacing: -0.5 }}>Build Steps</Text>
        
        {/* Progress Bar */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280' }}>Progress</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#7C3AED' }}>0/{totalSteps}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: '0%', backgroundColor: '#7C3AED' }} />
          </View>
        </View>
        
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
          <Text style={{ fontSize: 15, color: '#9CA3AF' }}>No build steps yet.</Text>
        )}
      </View>

      {/* Totals Footer */}
      {(() => {
        const materialsSubtotal = planData?.materials?.reduce((sum, m) => sum + (m.subtotalUsd || 0), 0) || 0;
        const estCost = planData?.summary?.estCostUsd;
        
        if (estCost || materialsSubtotal > 0) {
          return (
            <View style={{ backgroundColor: 'white', marginTop: 24, marginHorizontal: 16, borderRadius: 16, padding: 20, borderWidth: 2, borderColor: '#7C3AED' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Total Estimate</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ fontSize: 15, color: '#6B7280' }}>
                  {estCost ? 'Estimated Cost' : 'Materials Cost'}
                </Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: '#7C3AED' }}>
                  {estCost ? fmtMoney(estCost) : `~${fmtMoney(materialsSubtotal)}`}
                </Text>
              </View>
              {!estCost && materialsSubtotal > 0 && (
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' }}>
                  ~ Based on materials only
                </Text>
              )}
            </View>
          );
        }
        return null;
      })()}

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
