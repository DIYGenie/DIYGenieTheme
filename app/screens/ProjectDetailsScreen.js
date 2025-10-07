// app/screens/ProjectDetailsScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView, View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ExpandableCard from '../components/ExpandableCard';
import { buildPlanFromProject } from '../lib/plan';
import { api } from '../lib/api';
import { brand } from '../../theme/colors';

export default function ProjectDetailsScreen({ route, navigation }) {
  const [project, setProject] = useState(route?.params?.project || {});
  const [loading, setLoading] = useState(false);
  const plan = useMemo(() => buildPlanFromProject(project), [project]);

  useEffect(() => {
    const projectId = route?.params?.id;
    if (projectId && !route?.params?.project) {
      setLoading(true);
      api(`/api/projects/${projectId}`)
        .then(({ data }) => {
          if (data) {
            setProject(data);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch project:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [route?.params?.id, route?.params?.project]);

  const previewUsed = !!project?.preview_url || project?.status === 'preview_ready';

  const photoUri =
    project?.input_image_url ||
    project?.image_url ||
    'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200&q=60&auto=format&fit=crop';

  const status = (project?.status || 'ready').replace('_', ' ');

  const handleGetDetailedPlan = () => {
    navigation.navigate('BuildPlan', { projectId: project.id, project });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={styles.loadingText}>Loading project...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>{project?.name || 'Project'}</Text>
          <View style={styles.pill}><Text style={styles.pillText}>{status}</Text></View>
        </View>

        <Text style={styles.sectionLabel}>Room Photo</Text>
        <View style={{ position: 'relative' }}>
          <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
          {previewUsed && (
            <View style={styles.previewPill}>
              <Text style={styles.previewPillText}>Preview used for this project</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.ctaButton} onPress={handleGetDetailedPlan}>
          <Text style={styles.ctaText}>Get detailed build plan</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Plan</Text>
        
        <ExpandableCard title="Overview" count={plan.overview.length}>
          {plan.overview.map((item, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.rowText}>• {item}</Text>
            </View>
          ))}
        </ExpandableCard>

        <ExpandableCard 
          title="Materials & Tools" 
          count={plan.materials.length + plan.tools.length}
          footer={
            <View>
              <Text style={styles.estimatedLabel}>Estimated Total</Text>
              <Text style={styles.estimatedValue}>${plan.estimatedTotal.toFixed(2)}</Text>
            </View>
          }
        >
          <Text style={styles.subsectionLabel}>Materials</Text>
          {plan.materials.map((mat, idx) => (
            <View key={`mat-${idx}`} style={styles.materialRow}>
              <View style={styles.materialInfo}>
                <Text style={styles.rowText}>• {mat.name}</Text>
                <Text style={styles.materialDetails}>
                  {mat.qty} {mat.unit} @ ${mat.unitPrice.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.materialPrice}>
                ${(mat.qty * mat.unitPrice).toFixed(2)}
              </Text>
            </View>
          ))}
          
          <Text style={[styles.subsectionLabel, { marginTop: 12 }]}>Tools</Text>
          {plan.tools.map((tool, idx) => (
            <View key={`tool-${idx}`} style={styles.row}>
              <Text style={styles.rowText}>• {tool.name}</Text>
              {tool.substitute && (
                <Text style={styles.substitute}> (or {tool.substitute})</Text>
              )}
            </View>
          ))}
        </ExpandableCard>

        <ExpandableCard title="Steps" count={plan.steps.length}>
          {plan.steps.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{step.stepNumber}.</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
                {step.estimatedTime && (
                  <Text style={styles.stepTime}>⏱ {step.estimatedTime}</Text>
                )}
              </View>
            </View>
          ))}
        </ExpandableCard>

        <ExpandableCard title="Cut List" count={plan.cutList.length}>
          {plan.cutList.map((item, idx) => (
            <View key={idx} style={styles.cutListRow}>
              <Text style={styles.cutListPart}>{item.part}</Text>
              <Text style={styles.cutListDetails}>
                Qty: {item.qty} | {item.length} x {item.width} x {item.thickness}
              </Text>
              {item.notes && (
                <Text style={styles.cutListNotes}>{item.notes}</Text>
              )}
            </View>
          ))}
        </ExpandableCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7FB' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 96, flexGrow: 1, minHeight: '100%' },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', flexShrink: 1, paddingRight: 8 },
  pill: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, height: 28, borderRadius: 14, justifyContent: 'center' },
  pillText: { color: '#065F46', fontWeight: '700' },

  sectionLabel: { marginTop: 8, marginBottom: 8, fontSize: 16, fontWeight: '700', color: '#111827' },
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, backgroundColor: '#E5E7EB', marginBottom: 16 },

  previewPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  previewPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },

  ctaButton: {
    backgroundColor: brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: brand.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  row: { flexDirection: 'row', marginBottom: 4 },
  rowText: { fontSize: 16, color: '#2B2F37', lineHeight: 24 },

  subsectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },

  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
  },
  materialInfo: {
    flex: 1,
  },
  materialDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
    marginTop: 2,
  },
  materialPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 12,
  },

  substitute: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  estimatedLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  estimatedValue: {
    fontSize: 24,
    fontWeight: '800',
    color: brand.primary,
  },

  stepRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: brand.primary,
    marginRight: 12,
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 4,
  },
  stepTime: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  cutListRow: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cutListPart: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cutListDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  cutListNotes: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
