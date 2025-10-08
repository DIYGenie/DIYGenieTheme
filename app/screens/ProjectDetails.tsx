import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View, Pressable } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

type RouteParams = { id: string; imageUrl?: string | null };
type R = RouteProp<Record<'ProjectDetails', RouteParams>, 'ProjectDetails'>;

const BASE = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:5000';

export default function ProjectDetails() {
  const route = useRoute<R>();
  const nav = useNavigation();
  const { id, imageUrl: fallbackImg } = route.params || ({} as any);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [scanUrl, setScanUrl] = useState<string | null>(fallbackImg ?? null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // 1) Fetch project from your backend
        const r = await fetch(`${BASE}/api/projects/${id}`);
        const pj = await r.json();
        if (!alive) return;
        setProject(pj?.item ?? pj ?? null);

        // 2) Try to load latest scan for this project from Supabase
        const { data, error } = await supabase
          .from('room_scans')
          .select('image_url')
          .eq('project_id', id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!alive) return;
        if (!error && data && data.length > 0) {
          setScanUrl(data[0].image_url ?? null);
        } else if (fallbackImg) {
          setScanUrl(fallbackImg);
        }
      } catch (e: any) {
        if (alive) setErr(e?.message ?? 'Failed to load project');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {loading ? <ActivityIndicator /> : null}
      {err ? <Text style={{ color: 'red' }}>{err}</Text> : null}

      <Text style={{ fontSize: 20, fontWeight: '700' }}>Project</Text>
      <Text selectable>ID: {id}</Text>

      {scanUrl ? (
        <Image source={{ uri: scanUrl }} style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }} />
      ) : (
        <View style={{ width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
          <Text>No scan image yet</Text>
        </View>
      )}

      {/* Overview / Materials / Steps / Cut List — show stub values if present */}
      {project?.overview ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>Overview</Text>
          <Text>{project.overview}</Text>
        </View>
      ) : null}

      {project?.materials ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>Materials & Tools</Text>
          <Text>{Array.isArray(project.materials) ? project.materials.join(', ') : String(project.materials)}</Text>
        </View>
      ) : null}

      {project?.steps ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>Steps</Text>
          <Text>{Array.isArray(project.steps) ? project.steps.join('\n') : String(project.steps)}</Text>
        </View>
      ) : null}

      {/* Footer actions */}
      <View style={{ height: 12 }} />
      <Pressable
        accessibilityRole="button"
        onPress={() => nav.goBack()}
        style={{ backgroundColor: '#6d28d9', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: '700' }}>Back</Text>
      </Pressable>
      
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          try {
            nav.navigate('ProjectsList' as never);
          } catch (e) {
            console.error('[nav error]', e);
          }
        }}
        style={{ backgroundColor: '#111827', marginTop: 8, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>View in Projects</Text>
      </Pressable>
    </ScrollView>
  );
}
