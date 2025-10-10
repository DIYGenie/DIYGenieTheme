import React, { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Plan } from '../lib/plan';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SectionKey = 'overview' | 'steps' | 'materials' | 'tools' | 'cuts' | 'time';

type BlockProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  summary?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
};

function Block({ icon, title, subtitle, summary, isExpanded, onToggle }: BlockProps) {
  return (
    <Pressable
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onToggle();
      }}
      style={({ pressed }) => ({
        backgroundColor: '#F3E8FF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { height: 2, width: 0 },
        elevation: 2,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={icon} size={24} color="#7C3AED" style={{ marginRight: 14 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 2 }}>{title}</Text>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>{subtitle}</Text>
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#9CA3AF" 
        />
      </View>
      
      {isExpanded && summary && (
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E9D5FF' }}>
          {summary}
        </View>
      )}
    </Pressable>
  );
}

type Props = { plan: Plan };

export default function PlanSummaryList({ plan }: Props) {
  const [expanded, setExpanded] = useState<Set<SectionKey>>(new Set());

  const toggle = (key: SectionKey) => {
    const newSet = new Set(expanded);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpanded(newSet);
  };

  // Summaries
  const overviewSummary = plan.overview 
    ? plan.overview.split('\n').slice(0, 3).join('\n').slice(0, 200) + (plan.overview.length > 200 ? '...' : '')
    : 'No overview available';

  const stepsSummary = plan.steps?.slice(0, 2).map((s: any, i: number) => {
    const title = typeof s === 'string' ? s : (s.title || `Step ${i + 1}`);
    return `${i + 1}. ${title}`;
  }).join('\n') || 'No steps yet';

  const materialsSummary = plan.materials?.slice(0, 3).map((m: any) => 
    `• ${m.name}${m.qty ? ` (${m.qty}${m.unit ? ' ' + m.unit : ''})` : ''}`
  ).join('\n') || 'No materials listed';

  const toolsSummary = plan.tools?.slice(0, 4).map((t: string) => `• ${t}`).join('\n') || 'No tools listed';

  const cutsSummary = plan.cuts?.slice(0, 3).map((c: any) => 
    `• ${c.part}: ${c.width && c.height ? `${c.width}" × ${c.height}"` : c.size}`
  ).join('\n') || 'No cuts listed';

  const timeCostSummary = `~${plan.time_estimate_hours || '—'} hrs, ~$${plan.cost_estimate_usd || '—'}`;

  return (
    <View>
      <Block
        icon="information-circle-outline"
        title="Overview"
        subtitle="What you'll build"
        summary={<Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>{overviewSummary}</Text>}
        isExpanded={expanded.has('overview')}
        onToggle={() => toggle('overview')}
      />
      
      <Block
        icon="list-outline"
        title="Steps"
        subtitle={`${plan.steps?.length || 0} steps`}
        summary={<Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>{stepsSummary}</Text>}
        isExpanded={expanded.has('steps')}
        onToggle={() => toggle('steps')}
      />
      
      <Block
        icon="cube-outline"
        title="Materials"
        subtitle={`${plan.materials?.length || 0} items`}
        summary={<Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>{materialsSummary}</Text>}
        isExpanded={expanded.has('materials')}
        onToggle={() => toggle('materials')}
      />
      
      <Block
        icon="hammer-outline"
        title="Tools"
        subtitle={`${plan.tools?.length || 0} tools`}
        summary={<Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>{toolsSummary}</Text>}
        isExpanded={expanded.has('tools')}
        onToggle={() => toggle('tools')}
      />
      
      <Block
        icon="cut-outline"
        title="Cuts"
        subtitle={`${plan.cuts?.length || 0} cuts`}
        summary={<Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>{cutsSummary}</Text>}
        isExpanded={expanded.has('cuts')}
        onToggle={() => toggle('cuts')}
      />
      
      <Block
        icon="time-outline"
        title="Time & Cost"
        subtitle="Estimates"
        summary={<Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>{timeCostSummary}</Text>}
        isExpanded={expanded.has('time')}
        onToggle={() => toggle('time')}
      />
    </View>
  );
}
