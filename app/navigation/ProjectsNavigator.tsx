import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProjectsScreen from '../screens/ProjectsScreen';
import BuildPlanScreen from '../screens/BuildPlanScreen';

export type ProjectsStackParamList = {
  ProjectsList: undefined;
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
        name="BuildPlan"
        component={BuildPlanScreen}
      />
    </Stack.Navigator>
  );
}
