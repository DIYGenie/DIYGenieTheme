import React, { useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { fetchProjectById, fetchProjectPlanMarkdown } from '../lib/api';
import { parsePlanMarkdown } from '../lib/plan';

type R = RouteProp<Record<'DetailedInstructions', { id: string }>, 'DetailedInstructions'>;

export default function DetailedInstructions() {
  const { params } = useRoute<R>();
  const [project, setProject] = React.useState<any>(null);
  const [saving, setSaving] = React.useState(false);

  const refs = {
    cover: useRef<View>(null),
    materials: useRef<View>(null),
    cuts: useRef<View>(null),
    tools: useRef<View>(null),
    steps: useRef<View>(null),
    summary: useRef<View>(null),
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

  const plan = project?.plan ?? {};

  async function saveSection(ref: React.RefObject<View>, name: string) {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow Photo access.'); return; }
      setSaving(true);
      const uri = await captureRef(ref, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', `${name} saved to Photos.`);
    } catch (e) {
      Alert.alert('Save failed', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function saveAll() {
    const order: [React.RefObject<View>, string][] = [
      [refs.cover, 'Cover'],
      [refs.materials, 'Materials'],
      [refs.cuts, 'Cut list'],
      [refs.tools, 'Tools'],
      [refs.steps, 'Steps'],
      [refs.summary, 'Summary'],
    ];
    for (const [r, n] of order) {
      await saveSection(r, n);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:16 }}>
      {/* Cover */}
      <View ref={refs.cover} collapsable={false} style={{ backgroundColor:'#fff', borderRadius:16, padding:16 }}>
        <Text style={{ fontSize:22, fontWeight:'800', marginBottom:4 }}>{project?.name ?? 'Project'}</Text>
        <Text>Detailed, step-by-step instructions.</Text>
      </View>

      {/* Materials */}
      <View ref={refs.materials} collapsable={false} style={{ backgroundColor:'#fff', borderRadius:16, padding:16 }}>
        <Text style={{ fontSize:18, fontWeight:'700', marginBottom:8 }}>Materials</Text>
        {(plan.materials?.length ? plan.materials : []).map((m:any, i:number) => (
          <Text key={i}>• {m.name}{m.qty ? ` — ${m.qty}${m.unit ? ` ${m.unit}` : ''}` : ''}</Text>
        ))}
        {!plan.materials?.length && <Text>No materials listed.</Text>}
      </View>

      {/* Cuts */}
      <View ref={refs.cuts} collapsable={false} style={{ backgroundColor:'#fff', borderRadius:16, padding:16 }}>
        <Text style={{ fontSize:18, fontWeight:'700', marginBottom:8 }}>Cut list</Text>
        {(plan.cuts?.length ? plan.cuts : []).map((c:any, i:number) => (
          <Text key={i}>• {c.part}: {c.size}{c.qty ? `  ×${c.qty}` : ''}</Text>
        ))}
        {!plan.cuts?.length && <Text>No cut list.</Text>}
      </View>

      {/* Tools */}
      <View ref={refs.tools} collapsable={false} style={{ backgroundColor:'#fff', borderRadius:16, padding:16 }}>
        <Text style={{ fontSize:18, fontWeight:'700', marginBottom:8 }}>Tools</Text>
        {(plan.tools?.length ? plan.tools : []).map((t:string, i:number) => (<Text key={i}>• {t}</Text>))}
        {!plan.tools?.length && <Text>No tools listed.</Text>}
      </View>

      {/* Steps */}
      <View ref={refs.steps} collapsable={false} style={{ backgroundColor:'#fff', borderRadius:16, padding:16 }}>
        <Text style={{ fontSize:18, fontWeight:'700', marginBottom:8 }}>Step-by-step</Text>
        {(plan.steps?.length ? plan.steps : []).map((s:any, i:number) => (
          <View key={i} style={{ marginBottom:10 }}>
            <Text style={{ fontWeight:'700' }}>{i+1}. {s.title ?? 'Step'}</Text>
            {!!s.body && <Text>{s.body}</Text>}
          </View>
        ))}
        {!plan.steps?.length && <Text>No steps yet.</Text>}
      </View>

      {/* Summary */}
      <View ref={refs.summary} collapsable={false} style={{ backgroundColor:'#fff', borderRadius:16, padding:16 }}>
        <Text style={{ fontSize:18, fontWeight:'700', marginBottom:8 }}>Time & Cost</Text>
        <Text>Estimated time: {plan.time_estimate_hours ?? '—'} hrs</Text>
        <Text>Estimated cost: {plan.cost_estimate_usd != null ? `$${plan.cost_estimate_usd}` : '—'}</Text>
      </View>

      {/* Save buttons */}
      <Pressable disabled={saving} onPress={saveAll}
        style={{ backgroundColor:'#6D28D9', borderRadius:16, padding:14, alignItems:'center' }}>
        <Text style={{ color:'white', fontWeight:'700' }}>{saving ? 'Saving…' : 'Save all sections to Photos'}</Text>
      </Pressable>
    </ScrollView>
  );
}
