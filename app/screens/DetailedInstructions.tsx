import React, { useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { fetchProjectById, fetchProjectPlanMarkdown } from '../lib/api';
import { parsePlanMarkdown } from '../lib/plan';
import { Section, Bullets, Paragraph, DimText, Subtle, Step } from '../components/ui/DocAtoms';

type R = RouteProp<Record<'DetailedInstructions', { id: string; initialTab?: string }>, 'DetailedInstructions'>;

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
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Title block */}
      <Section title={project?.name || 'Project'}>
        <Paragraph>Detailed, step-by-step instructions.</Paragraph>
      </Section>

      <Section title="Materials">
        {plan.materials?.length ? (
          <Bullets items={plan.materials.map((m: any) => 
            `${m.name}${m.qty ? ` — ${m.qty}${m.unit ? ' ' + m.unit : ''}` : ''}${m.note ? ` • ${m.note}` : ''}`
          )} />
        ) : (
          <DimText>No materials listed.</DimText>
        )}
      </Section>

      <Section title="Cut list">
        {plan.cuts?.length ? (
          <Bullets items={plan.cuts.map((c: any) => 
            `${c.part}: ${c.width && c.height ? `${c.width}" × ${c.height}"` : c.size} ×${c.qty ?? 1}`
          )} />
        ) : (
          <DimText>No cut list.</DimText>
        )}
      </Section>

      <Section title="Tools">
        <DimText style={{ marginBottom: 8 }}>Wear eye & hearing protection.</DimText>
        {plan.tools?.length ? <Bullets items={plan.tools} /> : <DimText>No tools listed.</DimText>}
      </Section>

      <Section title="Step-by-step">
        {plan.steps?.length ? (
          plan.steps.map((s: any, i: number) => (
            <Step key={i} n={i + 1} title={s.title}>
              {s.purpose && (
                <Paragraph>
                  <Text style={{ fontWeight: '700' }}>Why:</Text> {s.purpose}
                </Paragraph>
              )}
              {s.inputs?.length ? <Bullets items={s.inputs} /> : null}
              {s.instructions?.map((line: string, idx: number) => (
                <Paragraph key={idx}>{line}</Paragraph>
              ))}
              {s.body && <Paragraph>{s.body}</Paragraph>}
              {s.checks?.length && (
                <>
                  <Subtle>Before you move on, check:</Subtle>
                  <Bullets items={s.checks} />
                </>
              )}
              {s.pitfalls?.length && (
                <>
                  <Subtle>Common mistakes:</Subtle>
                  <Bullets items={s.pitfalls} />
                </>
              )}
            </Step>
          ))
        ) : (
          <DimText>No steps yet.</DimText>
        )}
      </Section>

      <Section title="Time & Cost">
        <Paragraph>Estimated time: {plan.time_estimate_hours ?? '—'} hrs</Paragraph>
        <Paragraph>Estimated cost: {plan.cost_estimate_usd ? `$${plan.cost_estimate_usd}` : '—'}</Paragraph>
      </Section>

      {/* Save buttons */}
      <Pressable
        disabled={saving}
        onPress={saveAll}
        style={{ backgroundColor: '#6D28D9', borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 16 }}
      >
        <Text style={{ color: 'white', fontWeight: '700' }}>{saving ? 'Saving…' : 'Save all sections to Photos'}</Text>
      </Pressable>
    </ScrollView>
  );
}
