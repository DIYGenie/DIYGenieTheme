import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Plan } from '../lib/plan';

type Props = { plan: Plan; onOpenDetails?: () => void };

const Card = ({
  title, subtitle, icon, onPress,
}: {
  title: string; subtitle?: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={{ flex: 1, backgroundColor: '#F5F3FF', borderRadius: 16, padding: 14, margin: 6 }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
      <Ionicons name={icon} size={18} color="#6D28D9" />
      <Text style={{ marginLeft: 8, fontWeight: '700', color: '#111827' }}>{title}</Text>
    </View>
    {!!subtitle && <Text style={{ color: '#6B7280', fontSize: 13 }}>{subtitle}</Text>}
  </Pressable>
);

export default function PlanSummaryCards({ plan, onOpenDetails }: Props) {
  const open = onOpenDetails ?? (() => {});
  const steps = plan.steps?.length ?? 0;
  const materials = plan.materials?.length ?? 0;
  const tools = plan.tools?.length ?? 0;
  const cuts = plan.cuts?.length ?? 0;
  const timeStr = plan.time_estimate_hours ? `${plan.time_estimate_hours} hrs` : undefined;
  const costStr = plan.cost_estimate_usd ? `$${plan.cost_estimate_usd}` : undefined;

  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
        <Card title="Overview" subtitle={plan.overview?.slice(0, 80) || 'What you\'ll build'} icon="information-circle-outline" onPress={open} />
        <Card title="Steps" subtitle={`${steps} step${steps === 1 ? '' : 's'}`} icon="list-outline" onPress={open} />
        <Card title="Materials" subtitle={`${materials} item${materials === 1 ? '' : 's'}`} icon="cube-outline" onPress={open} />
        <Card title="Tools" subtitle={`${tools} tool${tools === 1 ? '' : 's'}`} icon="hammer-outline" onPress={open} />
        <Card title="Cuts" subtitle={`${cuts} cut${cuts === 1 ? '' : 's'}`} icon="cut-outline" onPress={open} />
        <Card title="Time & Cost" subtitle={[timeStr, costStr].filter(Boolean).join(' · ') || 'Estimates'} icon="time-outline" onPress={open} />
      </View>
    </View>
  );
}
