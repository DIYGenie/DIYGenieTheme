import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { View, Image, ActivityIndicator, Pressable, Text, ScrollView } from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeBack } from '../lib/useSafeBack';
import {
  fetchProjectById,
  fetchLatestScanForProject,
  fetchProjectPlanMarkdown,
  buildPlanWithoutPreview,
  waitForPlanReady,
} from '../lib/api';
import Markdown from '../components/Markdown';
import StatusBadge from '../components/StatusBadge';

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
  const [planMd, setPlanMd] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [autoPolled, setAutoPolled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;

    // Cancel any previous request
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
        if (p?.status === 'ready') {
          setPlanLoading(true);
          try {
            const md = await fetchProjectPlanMarkdown(projectId, { signal: controller.signal, timeoutMs: 10000 });
            if (!controller.signal.aborted) setPlanMd(md);
          } catch (e) {
            if ((e as any)?.name !== 'AbortError') console.log('[plan fetch error]', String(e));
          } finally {
            if (!controller.signal.aborted) setPlanLoading(false);
          }
        } else {
          setPlanMd(null);
        }
      }
    } catch (e: any) {
      // Ignore aborts; log other errors and still release spinner
      if (e?.name !== 'AbortError') {
        console.log('[ProjectDetails load error]', String(e));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [projectId]);

  // Dev-friendly back, and dynamic header title/status
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
          <Text
            numberOfLines={1}
            style={{ fontSize: 16, fontWeight: '700' }}
          >
            {project?.name || 'Project'}
          </Text>
          {!!project?.status && (
            <View style={{ marginLeft: 8 }}>
              <StatusBadge status={project.status} />
            </View>
          )}
        </View>
      ),
    });
  }, [navigation, safeBack, project?.name, project?.status]);

  useEffect(() => {
    load();
    return () => {
      // Abort when unmounting
      abortRef.current?.abort();
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => abortRef.current?.abort();
    }, [load])
  );

  // Smart refresh: if project is not ready, start build; then poll for plan.
  const smartRefresh = useCallback(async () => {
    if (!projectId) return;
    setPlanLoading(true);
    try {
      const fresh = await fetchProjectById(projectId, { timeoutMs: 8000 }).catch(() => project);
      if (fresh) setProject(fresh);
      if (!fresh || fresh.status !== 'ready') {
        await buildPlanWithoutPreview(projectId);
      }
      const md = await waitForPlanReady(projectId, { totalMs: 60000, stepMs: 1200, maxStepMs: 5000 });
      if (md !== null) {
        setPlanMd(md);
      } else {
        // still not ready—leave "building" message
        setPlanMd(null);
      }
    } catch (e) {
      console.log('[plan smartRefresh error]', String((e as any)?.message || e));
    } finally {
      setPlanLoading(false);
    }
  }, [projectId, project]);

  // Auto-poll once after first load if plan isn't ready yet.
  useEffect(() => {
    if (project && planMd === null && !planLoading && !autoPolled) {
      setAutoPolled(true);
      smartRefresh();
    }
  }, [project, planMd, planLoading, autoPolled, smartRefresh]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 6 }}>
        {project?.name || project?.title || 'Project'}
      </Text>
      <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
        Status: {project?.status || 'In progress'}
      </Text>

      {loading ? (
        <View style={{ paddingTop: 40 }}>
          <ActivityIndicator />
        </View>
      ) : scan?.imageUrl ? (
        <Image
          source={{ uri: scan.imageUrl }}
          style={{ width: '100%', height: 220, borderRadius: 16, backgroundColor: '#EEE' }}
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
          }}
        >
          <Text style={{ color: '#6B7280' }}>No scan image yet</Text>
        </View>
      )}

      <View style={{ marginTop: 20, padding: 14, borderRadius: 14, backgroundColor: '#F9FAFB' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700' }}>Plan</Text>
          <Pressable
            onPress={smartRefresh}
            style={{ paddingHorizontal: 10, paddingVertical: 6 }}
          >
            <Text style={{ color: '#7C3AED', fontWeight: '600' }}>Refresh</Text>
          </Pressable>
        </View>
        {planLoading ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator />
          </View>
        ) : planMd === null ? (
          <Text style={{ color: '#6B7280', marginTop: 8 }}>
            Your plan is building. This screen will update automatically; you can also tap Refresh.
          </Text>
        ) : planMd.trim().length === 0 ? (
          <Text style={{ color: '#6B7280', marginTop: 8 }}>No plan content yet.</Text>
        ) : (
          <View style={{ marginTop: 10 }}>
            <Markdown content={planMd} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}
