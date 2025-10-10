import React, { useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { fetchProjectById, fetchProjectPlanMarkdown } from '../lib/api';
import { parsePlanMarkdown } from '../lib/plan';
import { Section, Bullets, Paragraph, DimText, Subtle, Step } from '../components/ui/DocAtoms';

type SectionType = 'overview' | 'steps' | 'materials' | 'tools' | 'cuts' | 'time';
type R = RouteProp<Record<'DetailedInstructions', { id: string; section?: SectionType; initialTab?: string }>, 'DetailedInstructions'>;

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
    time: useRef<View>(null),
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

  // Scroll to section when specified
  React.useEffect(() => {
    if (params.section && project) {
      setTimeout(() => {
        const targetRef = refs[params.section as SectionType];
        if (targetRef?.current) {
          targetRef.current.measureLayout(
            scrollViewRef.current as any,
            (x, y) => {
              scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
            },
            () => {}
          );
        }
      }, 300);
    }
  }, [params.section, project]);

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
      [refs.overview, 'Overview'],
      [refs.materials, 'Materials'],
      [refs.cuts, 'Cut list'],
      [refs.tools, 'Tools'],
      [refs.steps, 'Steps'],
      [refs.time, 'Time & Cost'],
    ];
    for (const [r, n] of order) {
      await saveSection(r, n);
    }
  }

  return (
    <ScrollView ref={scrollViewRef} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Title block / Overview */}
      <View ref={refs.overview}>
        <Section title={project?.name || 'Project'}>
          <Paragraph>Detailed, step-by-step instructions.</Paragraph>
          {plan.overview && <Paragraph>{plan.overview}</Paragraph>}
        </Section>
      </View>

      <View ref={refs.materials}>
        <Section title="Materials">
          {plan.materials?.length ? (
            <Bullets items={plan.materials.map((m: any) => 
              `${m.name}${m.qty ? ` — ${m.qty}${m.unit ? ' ' + m.unit : ''}` : ''}${m.note ? ` • ${m.note}` : ''}`
            )} />
          ) : (
            <DimText>No materials listed.</DimText>
          )}
        </Section>
      </View>

      <View ref={refs.cuts}>
        <Section title="Cut list">
          {plan.cuts?.length ? (
            <Bullets items={plan.cuts.map((c: any) => 
              `${c.part}: ${c.width && c.height ? `${c.width}" × ${c.height}"` : c.size} ×${c.qty ?? 1}`
            )} />
          ) : (
            <DimText>No cut list.</DimText>
          )}
        </Section>
      </View>

      <View ref={refs.tools}>
        <Section title="Tools">
          <DimText style={{ marginBottom: 8 }}>Wear eye & hearing protection.</DimText>
          {plan.tools?.length ? <Bullets items={plan.tools} /> : <DimText>No tools listed.</DimText>}
        </Section>
      </View>

      <View ref={refs.steps}>
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
      </View>

      <View ref={refs.time}>
        <Section title="Time & Cost">
          <Paragraph>Estimated time: {plan.time_estimate_hours ?? '—'} hrs</Paragraph>
          <Paragraph>Estimated cost: {plan.cost_estimate_usd ? `$${plan.cost_estimate_usd}` : '—'}</Paragraph>
        </Section>
      </View>

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
