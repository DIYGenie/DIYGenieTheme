import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setFlag } from '../lib/storage';

const brand = { primary: '#7C3AED' };

export default function WhatToTest({ navigation }: any) {
  const handleGotIt = async () => {
    await setFlag('wt_seen', true);
    navigation.goBack();
  };

  const handleOpenDiagnostics = async () => {
    await setFlag('wt_seen', true);
    navigation.replace('Diagnostics');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="flask" size={48} color={brand.primary} />
          <Text style={styles.title}>What to test in DIY Genie</Text>
        </View>

        <View style={styles.instructions}>
          <View style={styles.step}>
            <View style={styles.bullet}>
              <Text style={styles.bulletText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              <Text style={styles.bold}>Create Project</Text> → Upload photo
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.bullet}>
              <Text style={styles.bulletText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              <Text style={styles.bold}>"Generate AI Plan + Preview"</Text> (Decor8) → wait for preview
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.bullet}>
              <Text style={styles.bulletText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              <Text style={styles.bold}>Open Project Details</Text> → Overview/Materials/Tools/Cuts/Steps
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.bullet}>
              <Text style={styles.bulletText}>4</Text>
            </View>
            <Text style={styles.stepText}>
              Try <Text style={styles.bold}>Share Plan</Text> + <Text style={styles.bold}>Copy lists</Text>
            </Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleGotIt}
          >
            <Text style={styles.primaryButtonText}>Got it</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleOpenDiagnostics}
          >
            <Text style={styles.secondaryButtonText}>Open Diagnostics</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  instructions: {
    marginBottom: 40,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  bullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  bulletText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  bold: {
    fontWeight: '600',
    color: '#1F2937',
  },
  buttons: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: brand.primary,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
