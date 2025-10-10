import React, { useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Image } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { fetchProjectById, fetchProjectPlanMarkdown } from '../lib/api';
import { parsePlanMarkdown } from '../lib/plan';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

type R = RouteProp<Record<'DetailedInstructions', { id: string; section?: string }>, 'DetailedInstructions'>;

export default function DetailedInstructions() {
  const { params } = useRoute<R>();
  const [project, setProject] = React.useState<any>(null);
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
        const p = await fetchProjectById(params.id);
        setProject(p);
        
        if (!p?.plan) {
          try {
            const md = await fetchProjectPlanMarkdown(params.id);
            if (md) {
              setProject((prev: any) => ({ ...(prev || {}), plan: parsePlanMarkdown(md) }));
            }
          } catch (e) {
            console.log('[detailed instructions fetch error]', e);
          }
        }
      } catch (e) {
        console.log('[project fetch error]', e);
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
  }, [params.section, project]);

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
      
      if (plan.cuts && plan.cuts.length > 0) {
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

  const totalSteps = plan.steps?.length || 0;

  return (
    <ScrollView ref={scrollViewRef} style={{ flex: 1, backgroundColor: '#FAFAFA' }} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={{ backgroundColor: '#7C3AED', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: 'white', marginBottom: 8 }}>
          {project?.name || 'Build Plan'}
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
          {plan.time_estimate_hours && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>⏱ {plan.time_estimate_hours} hrs</Text>
            </View>
          )}
          {totalSteps > 0 && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{totalSteps} steps</Text>
            </View>
          )}
        </View>
      </View>

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
        {plan.safety_warnings && plan.safety_warnings.length > 0 && (
          <View style={{ marginTop: 16, backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: '#EF4444', padding: 12, borderRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="warning" size={20} color="#DC2626" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#991B1B', marginLeft: 6 }}>Safety First</Text>
            </View>
            {plan.safety_warnings.map((warning: string, i: number) => (
              <Text key={i} style={{ fontSize: 14, color: '#7F1D1D', lineHeight: 20, marginTop: 4 }}>
                • {warning}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Materials Section */}
      <View ref={refs.materials} style={{ backgroundColor: 'white', marginTop: 16, marginHorizontal: 16, borderRadius: 16, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <MaterialCommunityIcons name="package-variant" size={24} color="#7C3AED" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Materials</Text>
        </View>
        
        {plan.materials && plan.materials.length > 0 ? (
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
        
        {plan.tools && plan.tools.length > 0 ? (
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
        ) : (
          <Text style={{ fontSize: 15, color: '#9CA3AF' }}>No tools listed.</Text>
        )}
      </View>

      {/* Cut List Section */}
      {plan.cuts && plan.cuts.length > 0 && (
        <View ref={refs.cuts} style={{ backgroundColor: 'white', marginTop: 16, marginHorizontal: 16, borderRadius: 16, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <MaterialCommunityIcons name="content-cut" size={24} color="#7C3AED" />
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Cut List</Text>
          </View>
          
          {plan.cuts.map((cut: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < plan.cuts.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
              <Text style={{ fontSize: 15, color: '#111827', flex: 1 }}>{cut.part}</Text>
              <Text style={{ fontSize: 15, color: '#6B7280', fontWeight: '500' }}>
                {cut.width && cut.height ? `${cut.width}" × ${cut.height}"` : cut.size} ×{cut.qty ?? 1}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Build Steps */}
      <View ref={refs.steps} style={{ marginTop: 24, marginHorizontal: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 }}>Build Steps</Text>
        
        {plan.steps && plan.steps.length > 0 ? (
          plan.steps.map((step: any, i: number) => (
            <View key={i} style={{ marginBottom: 24 }}>
              {/* Step Card */}
              <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                {/* Step Header */}
                <View style={{ backgroundColor: '#F9FAFB', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginLeft: 12, flex: 1 }}>
                        {step.title || `Step ${i + 1}`}
                      </Text>
                    </View>
                    {step.time_minutes && (
                      <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#6D28D9' }}>{step.time_minutes} min</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Photo Placeholder */}
                {step.photo_url ? (
                  <Image source={{ uri: step.photo_url }} style={{ width: '100%', height: 200 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: '100%', height: 180, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="image-outline" size={48} color="#D1D5DB" />
                    <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 8 }}>Visual guide coming soon</Text>
                  </View>
                )}

                {/* Step Content */}
                <View style={{ padding: 16 }}>
                  {/* Purpose / What you're building */}
                  {step.purpose && (
                    <View style={{ backgroundColor: '#F0F9FF', padding: 12, borderRadius: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#0EA5E9' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0369A1', marginBottom: 4 }}>What you're building:</Text>
                      <Text style={{ fontSize: 14, color: '#075985', lineHeight: 20 }}>{step.purpose}</Text>
                    </View>
                  )}

                  {/* Materials needed for this step */}
                  {step.materials_needed && step.materials_needed.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <MaterialCommunityIcons name="package-variant" size={18} color="#7C3AED" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#7C3AED', marginLeft: 6 }}>Grab these materials:</Text>
                      </View>
                      {step.materials_needed.map((mat: string, idx: number) => (
                        <Text key={idx} style={{ fontSize: 14, color: '#374151', marginLeft: 24, lineHeight: 20 }}>• {mat}</Text>
                      ))}
                    </View>
                  )}

                  {/* Tools needed for this step */}
                  {step.tools_needed && step.tools_needed.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Feather name="tool" size={18} color="#7C3AED" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#7C3AED', marginLeft: 6 }}>Tools you'll need:</Text>
                      </View>
                      {step.tools_needed.map((tool: string, idx: number) => (
                        <Text key={idx} style={{ fontSize: 14, color: '#374151', marginLeft: 24, lineHeight: 20 }}>• {tool}</Text>
                      ))}
                    </View>
                  )}

                  {/* Instructions */}
                  {step.instructions && step.instructions.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      {step.instructions.map((instruction: string, idx: number) => (
                        <Text key={idx} style={{ fontSize: 15, color: '#1F2937', lineHeight: 24, marginBottom: 8 }}>
                          {instruction}
                        </Text>
                      ))}
                    </View>
                  )}
                  
                  {step.body && (
                    <Text style={{ fontSize: 15, color: '#1F2937', lineHeight: 24, marginBottom: 12 }}>{step.body}</Text>
                  )}

                  {/* Pro Tips */}
                  {step.pro_tips && step.pro_tips.length > 0 && (
                    <View style={{ backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#3B82F6' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name="bulb" size={18} color="#1D4ED8" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E40AF', marginLeft: 6 }}>Pro Tips:</Text>
                      </View>
                      {step.pro_tips.map((tip: string, idx: number) => (
                        <Text key={idx} style={{ fontSize: 14, color: '#1E40AF', lineHeight: 20, marginTop: 4 }}>• {tip}</Text>
                      ))}
                    </View>
                  )}

                  {/* Quality Checks */}
                  {step.checks && step.checks.length > 0 && (
                    <View style={{ backgroundColor: '#F0FDF4', padding: 12, borderRadius: 8, marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name="checkmark-circle" size={18} color="#059669" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#065F46', marginLeft: 6 }}>Quality checks:</Text>
                      </View>
                      {step.checks.map((check: string, idx: number) => (
                        <Text key={idx} style={{ fontSize: 14, color: '#065F46', lineHeight: 20, marginTop: 4 }}>✓ {check}</Text>
                      ))}
                    </View>
                  )}

                  {/* Common Mistakes / Pitfalls */}
                  {step.pitfalls && step.pitfalls.length > 0 && (
                    <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name="alert-circle" size={18} color="#DC2626" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#991B1B', marginLeft: 6 }}>Avoid these mistakes:</Text>
                      </View>
                      {step.pitfalls.map((pitfall: string, idx: number) => (
                        <Text key={idx} style={{ fontSize: 14, color: '#991B1B', lineHeight: 20, marginTop: 4 }}>⚠️ {pitfall}</Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Progress indicator between steps */}
              {i < totalSteps - 1 && (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <View style={{ width: 2, height: 20, backgroundColor: '#D1D5DB' }} />
                  <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, color: '#9CA3AF' }}>No build steps available yet.</Text>
          </View>
        )}
      </View>

      {/* Save Button */}
      <Pressable
        disabled={saving}
        onPress={saveAll}
        style={{ 
          backgroundColor: '#7C3AED', 
          marginHorizontal: 16, 
          marginTop: 24, 
          padding: 16, 
          borderRadius: 12, 
          alignItems: 'center',
          shadowColor: '#7C3AED',
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4
        }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
          {saving ? 'Saving...' : 'Save Build Plan to Photos'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
