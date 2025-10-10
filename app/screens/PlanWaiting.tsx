import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { InteractionManager } from 'react-native';
import { fetchProjectPlanMarkdown, fetchProjectById } from '../lib/api';
import { saveLocalPlanMarkdown, generateLocalPlanMarkdown } from '../lib/localPlan';

type Params = { id: string };
type R = RouteProp<Record<'PlanWaiting', Params>, 'PlanWaiting'>;

export default function PlanWaiting() {
  const route = useRoute<R>();
  const navigation = useNavigation<any>();
  const id = route.params?.id;

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    async function poll() {
      if (cancelled) return;
      tries += 1;
      console.log('[wait] poll try', tries);

      let md = await fetchProjectPlanMarkdown(id, { tolerate409: true });
      
      if (!md && tries >= 10) {
        console.log('[wait] max tries reached, generating local plan');
        const p = await fetchProjectById(id).catch(() => ({}));
        md = generateLocalPlanMarkdown(p);
        await saveLocalPlanMarkdown(id, md);
      }

      if (!cancelled && md) {
        const parent = navigation.getParent?.();
        parent?.navigate('Projects', { screen: 'ProjectsList' });
        InteractionManager.runAfterInteractions(() => {
          parent?.navigate('Projects', { screen: 'ProjectDetails', params: { id } });
        });
        return;
      }

      if (!cancelled && tries < 10) setTimeout(poll, 2000);
    }

    poll();
    return () => { cancelled = true; };
  }, [id, navigation]);

  return (
    <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
      <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600' }}>Building your plan…</Text>
      <Text style={{ marginTop: 6, color: '#6B7280', textAlign: 'center' }}>
        This can take a moment. We'll open your project automatically.
      </Text>

      <Pressable
        onPress={() => navigation.getParent()?.navigate('Home')}
        style={{ marginTop: 24, padding: 12, paddingHorizontal: 18, backgroundColor: '#EEE', borderRadius: 12 }}
      >
        <Text>Go Home</Text>
      </Pressable>
    </View>
  );
}
