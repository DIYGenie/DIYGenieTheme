import React, { useCallback, useEffect, useState } from 'react';
import { View, Image, ActivityIndicator, Pressable, Text } from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeBack } from '../lib/useSafeBack';
import { logNavTree } from '../lib/navDebug';
import { fetchProjectById, fetchLatestScanForProject } from '../lib/api';

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

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        fetchProjectById(projectId),
        fetchLatestScanForProject(projectId),
      ]);
      setProject(p);
      setScan(s);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <Pressable
          onPress={() => {
            logNavTree(navigation as any, 'onBackPress');
            safeBack();
          }}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ fontWeight: '600' }}>Back</Text>
        </Pressable>
      ),
      title: 'Project',
    });
  }, [navigation, safeBack]);

  useEffect(() => {
    logNavTree(navigation as any, 'mount ProjectDetails');
    load();
  }, [load, navigation]);

  useFocusEffect(
    useCallback(() => {
      logNavTree(navigation as any, 'focus ProjectDetails');
      load();
    }, [load, navigation])
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
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
    </View>
  );
}
