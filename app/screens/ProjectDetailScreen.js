import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProject, buildWithoutPreview } from '../lib/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export default function ProjectDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      const { item } = await getProject(id);
      setProject(item);
    } catch (error) {
      Alert.alert('Error', 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleBuildWithoutPreview = async () => {
    if (!project?.id || submitting) return;

    try {
      setSubmitting(true);
      await buildWithoutPreview(project.id);
      Alert.alert('Success', 'Project is ready to build!');
      navigation.navigate('Projects', { refresh: true });
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not build plan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Project not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>{project.name || 'Untitled Project'}</Text>
        
        {project.input_image_url && (
          <Image 
            source={{ uri: project.input_image_url }} 
            style={styles.projectImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          <Text style={styles.detailText}>Status: {project.status}</Text>
          {project.budget && <Text style={styles.detailText}>Budget: {project.budget}</Text>}
          {project.skill && <Text style={styles.detailText}>Skill Level: {project.skill}</Text>}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={submitting ? "Building…" : "Build Plan Without Preview"}
            onPress={handleBuildWithoutPreview}
            disabled={submitting}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 24,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  projectImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeBold,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
});
