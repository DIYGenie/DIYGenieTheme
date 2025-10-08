import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProjectsScreen from '../screens/ProjectsScreen';
import ProjectDetailsScreen from '../screens/ProjectDetailsScreen';
import BuildPlanScreen from '../screens/BuildPlanScreen';

export type ProjectsStackParamList = {
  ProjectsList: undefined;
  ProjectDetails: { id: string };
  BuildPlan: { projectId: string };
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
        name="ProjectDetails"
        component={ProjectDetailsScreen}
      />
      <Stack.Screen
        name="BuildPlan"
        component={BuildPlanScreen}
      />
    </Stack.Navigator>
  );
}
