import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const Tab = createMaterialTopTabNavigator();

const STUBBED_DATA = {
  overview: {
    intro: "This plan will guide you through building your custom furniture piece step by step. Follow each stage carefully and don't hesitate to ask for help if needed.",
    steps: [
      { id: 1, title: 'Prepare your workspace', completed: true },
      { id: 2, title: 'Measure and mark materials', completed: true },
      { id: 3, title: 'Cut wood pieces to size', completed: false },
      { id: 4, title: 'Sand all surfaces smooth', completed: false },
      { id: 5, title: 'Assemble the frame', completed: false },
      { id: 6, title: 'Apply finish or paint', completed: false },
      { id: 7, title: 'Final assembly and inspection', completed: false },
    ],
  },
  materials: [
    { name: '2x4 Pine boards', quantity: '6 pieces (8ft each)', cost: '$48' },
    { name: 'Wood screws (3 inch)', quantity: '1 box', cost: '$12' },
    { name: 'Wood glue', quantity: '1 bottle', cost: '$8' },
    { name: 'Sandpaper (various grits)', quantity: '1 pack', cost: '$10' },
    { name: 'Wood stain or paint', quantity: '1 quart', cost: '$25' },
    { name: 'Polyurethane finish', quantity: '1 quart', cost: '$22' },
  ],
  tools: [
    { name: 'Circular saw', substitute: 'Hand saw (slower)' },
    { name: 'Power drill', substitute: 'Manual screwdriver' },
    { name: 'Measuring tape', substitute: null },
    { name: 'Level', substitute: 'Smartphone level app' },
    { name: 'Clamps (4-6)', substitute: 'Heavy books or weights' },
    { name: 'Safety glasses', substitute: null },
    { name: 'Dust mask', substitute: null },
  ],
  tips: [
    'Always measure twice and cut once to avoid wasting materials',
    'Work in a well-ventilated area when applying finishes',
    'Use clamps to hold pieces together while the glue dries',
    'Sand with the grain of the wood for the best finish',
    'Apply thin coats of finish rather than one thick coat',
    'Let each coat dry completely before applying the next',
    'Keep your workspace clean to avoid accidents',
    'Don\'t rush - quality takes time',
  ],
};

function OverviewTab({ projectId }) {
  const data = useMemo(() => STUBBED_DATA.overview, [projectId]);

  return (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.introText}>{data.intro}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Steps</Text>
        {data.steps.map((step, index) => (
          <View key={step.id} style={styles.stepItem}>
            <View style={[
              styles.stepDot,
              step.completed && styles.stepDotCompleted
            ]}>
              {step.completed ? (
                <Ionicons name="checkmark" size={16} color="#FFF" />
              ) : (
                <Text style={styles.stepNumber}>{index + 1}</Text>
              )}
            </View>
            <Text style={[
              styles.stepTitle,
              step.completed && styles.stepTitleCompleted
            ]}>
              {step.title}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function MaterialsTab({ projectId }) {
  const data = useMemo(() => STUBBED_DATA.materials, [projectId]);

  const totalCost = useMemo(() => {
    const sum = data.reduce((acc, item) => {
      const cost = parseFloat(item.cost.replace('$', ''));
      return acc + cost;
    }, 0);
    return `$${sum}`;
  }, [data]);

  return (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Materials List</Text>
        <Text style={styles.sectionSubtitle}>Estimated total: {totalCost}</Text>
      </View>

      {data.map((item, index) => (
        <View key={index} style={styles.materialItem}>
          <View style={styles.materialHeader}>
            <Ionicons name="cube-outline" size={20} color={colors.accent} />
            <Text style={styles.materialName}>{item.name}</Text>
          </View>
          <View style={styles.materialDetails}>
            <Text style={styles.materialQuantity}>{item.quantity}</Text>
            <Text style={styles.materialCost}>{item.cost}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function ToolsTab({ projectId }) {
  const data = useMemo(() => STUBBED_DATA.tools, [projectId]);

  return (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Required Tools</Text>
        <Text style={styles.sectionSubtitle}>Make sure you have these before starting</Text>
      </View>

      {data.map((tool, index) => (
        <View key={index} style={styles.toolItem}>
          <View style={styles.toolHeader}>
            <Ionicons name="construct-outline" size={20} color={colors.accent} />
            <Text style={styles.toolName}>{tool.name}</Text>
          </View>
          {tool.substitute && (
            <View style={styles.substituteRow}>
              <Ionicons name="swap-horizontal-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.substituteText}>Alternative: {tool.substitute}</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function TipsTab({ projectId }) {
  const data = useMemo(() => STUBBED_DATA.tips, [projectId]);

  return (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Tips</Text>
        <Text style={styles.sectionSubtitle}>Pro advice for better results</Text>
      </View>

      {data.map((tip, index) => (
        <View key={index} style={styles.tipItem}>
          <Ionicons name="bulb-outline" size={20} color={colors.accent} />
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export default function PlanTabsScreen({ navigation, route }) {
  const projectId = route.params?.id;

  if (!projectId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Build Plan</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={64} color={colors.muted} />
          <Text style={styles.emptyTitle}>No plan available</Text>
          <Text style={styles.emptySubtitle}>Project ID is missing</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Build Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 14,
            fontFamily: typography.fontFamily.manropeBold,
            textTransform: 'none',
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.muted,
          },
          tabBarIndicatorStyle: {
            backgroundColor: colors.accent,
            height: 3,
          },
        }}
      >
        <Tab.Screen 
          name="Overview" 
          children={() => <OverviewTab projectId={projectId} />}
        />
        <Tab.Screen 
          name="Materials" 
          children={() => <MaterialsTab projectId={projectId} />}
        />
        <Tab.Screen 
          name="Tools" 
          children={() => <ToolsTab projectId={projectId} />}
        />
        <Tab.Screen 
          name="AI Tips" 
          children={() => <TipsTab projectId={projectId} />}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.muted,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
  },
  tabContent: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  introText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 8,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepDotCompleted: {
    backgroundColor: colors.accent,
  },
  stepNumber: {
    fontSize: 14,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textSecondary,
  },
  stepTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.inter,
    color: colors.textPrimary,
  },
  stepTitleCompleted: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  materialItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  materialName: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  materialDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  materialQuantity: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
  },
  materialCost: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.accent,
  },
  toolItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolName: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  substituteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 28,
  },
  substituteText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  tipItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.inter,
    color: colors.textPrimary,
    lineHeight: 22,
    marginLeft: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
