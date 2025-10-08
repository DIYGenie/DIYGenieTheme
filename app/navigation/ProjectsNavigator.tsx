import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProjectsScreen from '../screens/ProjectsScreen';
import BuildPlanScreen from '../screens/BuildPlanScreen';
import ProjectDetailsScreen from '../screens/ProjectDetails';

export type ProjectsStackParamList = {
  ProjectsList: undefined;
  BuildPlan: { projectId: string };
  ProjectDetails: { id: string; imageUrl?: string | null };
};

const Stack = createNativeStackNavigator<ProjectsStackParamList>();

export default function ProjectsNavigator() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      id={undefined}
    >
      <Stack.Screen
        name="ProjectsList"
        component={ProjectsScreen}
      />
      <Stack.Screen
        name="BuildPlan"
        component={BuildPlanScreen}
      />
      <Stack.Screen
        name="ProjectDetails"
        component={ProjectDetailsScreen}
        options={{ headerShown: true, title: 'Project' }}
      />
    </Stack.Navigator>
  );
}
