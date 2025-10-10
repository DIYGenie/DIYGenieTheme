import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { View, Image, ActivityIndicator, Pressable, Text, ScrollView, InteractionManager } from 'react-native';
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
import { useInterval } from '../hooks/useInterval';
import { ROOT_TABS_ID, PROJECTS_TAB, PROJECTS_LIST_SCREEN, PLAN_SCREEN } from '../navigation/routeNames';
import PlanTabs from '../components/PlanTabs';

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
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const status = (project?.plan_status || project?.status || '').toLowerCase();
  const isBuilding = /requested|building|queued|pending/.test(status) && !/ready|done|error|failed/.test(status);

  const isBuildingOld = (s?: string) =>
    !!s && (s.includes('requested') || s.includes('building') || s === 'draft');
  const isReady = (s?: string) =>
    !!s && (s.includes('plan_ready') || s.includes('preview_ready') || s === 'ready');

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

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
        
        // (re)arm polling based on latest status
        clearPoll();
        if (isBuildingOld(p?.status)) {
          pollRef.current = setInterval(() => {
            // cheap re-check: only refetch project
            fetchProjectById(projectId).then(np => {
              setProject(prev => ({ ...prev, ...np }));
              if (isReady(np?.status)) clearPoll();
            }).catch(()=>{});
          }, 5000); // 5s cadence
        }
        
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
      abortRef.current?.abort();
      clearPoll();
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        abortRef.current?.abort();
        clearPoll();
      };
    }, [load])
  );

  useEffect(() => () => clearPoll(), []);

  // Auto-poll while building
  useInterval(() => {
    if (isBuilding) load();
  }, isBuilding ? 8000 : null);

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

  const RefreshLink = () => (
    <Pressable
      onPress={async () => {
        if (refreshing) return;
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      disabled={refreshing}
      style={{ paddingHorizontal: 8, paddingVertical: 4, opacity: refreshing ? 0.6 : 1 }}
    >
      {refreshing ? (
        <ActivityIndicator size="small" color="#7C3AED" />
      ) : (
        <Text style={{ color: '#7C3AED', fontWeight: '600' }}>Refresh</Text>
      )}
    </Pressable>
  );

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

      {!project?.plan ? (
        <View style={{ backgroundColor: '#F6F7FF', borderRadius: 16, padding: 14, marginTop: 16 }}>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Plan</Text>
          <Text>Your plan is building. This screen will update automatically; you can also pull to refresh.</Text>
        </View>
      ) : (
        <>
          <PlanTabs plan={project.plan} />

          <Pressable
            onPress={() => (navigation as any).navigate('DetailedInstructions', { id: projectId })}
            style={{ marginTop: 16, backgroundColor: '#6D28D9', borderRadius: 16, padding: 14, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>Get detailed instructions</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
