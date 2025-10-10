import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Plan } from '../lib/plan';

type Section = 'overview' | 'steps' | 'materials' | 'tools' | 'cuts' | 'time';

type Props = { 
  plan: Plan; 
  onOpenDetails?: (section: Section) => void;
};

const Card = ({
  title, 
  subtitle, 
  icon, 
  onPress,
}: {
  title: string; 
  subtitle?: string; 
  icon: keyof typeof Ionicons.glyphMap; 
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({ 
      backgroundColor: '#F4F1FF', 
      borderRadius: 16, 
      padding: 16, 
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { height: 2, width: 0 },
      elevation: 2,
      opacity: pressed ? 0.8 : 1,
    })}
  >
    <Ionicons name={icon} size={24} color="#7C3AED" style={{ marginRight: 14 }} />
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 17, fontWeight: '600', color: '#111827', marginBottom: 2 }}>{title}</Text>
      {!!subtitle && <Text style={{ fontSize: 13, color: '#6B7280' }}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
  </Pressable>
);

export default function PlanSummaryCards({ plan, onOpenDetails }: Props) {
  const open = (section: Section) => onOpenDetails?.(section);
  
  const steps = plan.steps?.length ?? 0;
  const materials = plan.materials?.length ?? 0;
  const tools = plan.tools?.length ?? 0;
  const cuts = plan.cuts?.length ?? 0;
  
  const overviewPreview = plan.overview 
    ? plan.overview.split('\n').slice(0, 2).join(' ').slice(0, 80) + (plan.overview.length > 80 ? '...' : '')
    : 'What you\'ll build';
  
  const timeStr = plan.time_estimate_hours ? `${plan.time_estimate_hours} hrs` : '—';
  const costStr = plan.cost_estimate_usd ? `$${plan.cost_estimate_usd}` : '—';

  return (
    <View>
      <Card 
        title="Overview" 
        subtitle={overviewPreview} 
        icon="information-circle-outline" 
        onPress={() => open('overview')} 
      />
      <Card 
        title="Steps" 
        subtitle={`${steps} ${steps === 1 ? 'step' : 'steps'}`} 
        icon="list-outline" 
        onPress={() => open('steps')} 
      />
      <Card 
        title="Materials" 
        subtitle={`${materials} ${materials === 1 ? 'item' : 'items'}`} 
        icon="cube-outline" 
        onPress={() => open('materials')} 
      />
      <Card 
        title="Tools" 
        subtitle={`${tools} ${tools === 1 ? 'tool' : 'tools'}`} 
        icon="hammer-outline" 
        onPress={() => open('tools')} 
      />
      <Card 
        title="Cuts" 
        subtitle={`${cuts} ${cuts === 1 ? 'cut' : 'cuts'}`} 
        icon="cut-outline" 
        onPress={() => open('cuts')} 
      />
      <Card 
        title="Time & Cost" 
        subtitle={`Est: ${timeStr} · ${costStr}`} 
        icon="time-outline" 
        onPress={() => open('time')} 
      />
    </View>
  );
}
