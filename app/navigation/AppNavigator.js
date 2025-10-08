import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import WelcomeScreen from '../screens/WelcomeScreen';
import RootTabs from './RootTabs';
import HowItWorks from '../screens/HowItWorks';
import NewProject from '../screens/NewProject';
import NewProjectMedia from '../screens/NewProjectMedia';
import ScanScreen from '../screens/ScanScreen';
import ProjectPreview from '../screens/ProjectPreview';
import ProjectDetailScreen from '../screens/ProjectDetailScreen';
import PlanScreen from '../screens/PlanScreen';
import PlanTabsScreen from '../screens/PlanTabsScreen';
import OpenPlanScreen from '../screens/OpenPlanScreen';
import AuthScreen from '../screens/AuthScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Main" component={RootTabs} />
      <Stack.Screen name="HowItWorks" component={HowItWorks} />
      <Stack.Screen name="NewProject" component={NewProject} />
      <Stack.Screen name="NewProjectMedia" component={NewProjectMedia} />
      <Stack.Screen 
        name="Scan" 
        component={ScanScreen} 
        options={{ headerShown: false, presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="Auth" 
        component={AuthScreen} 
        options={{ headerShown: true, title: 'Sign in' }} 
      />
      <Stack.Screen name="ProjectPreview" component={ProjectPreview} />
      <Stack.Screen name="Project" component={ProjectDetailScreen} />
      <Stack.Screen name="Plan" component={PlanScreen} />
      <Stack.Screen name="PlanTabs" component={PlanTabsScreen} />
      <Stack.Screen name="OpenPlan" component={OpenPlanScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}