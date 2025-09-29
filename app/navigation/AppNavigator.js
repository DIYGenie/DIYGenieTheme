import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import WelcomeScreen from '../screens/WelcomeScreen';
import TabNavigator from './TabNavigator';
import HowItWorks from '../screens/HowItWorks';
import NewProject from '../screens/NewProject';
import NewProjectForm from '../screens/NewProjectForm';
import NewProjectMedia from '../screens/NewProjectMedia';

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
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="HowItWorks" component={HowItWorks} />
      <Stack.Screen name="NewProject" component={NewProject} />
      <Stack.Screen name="NewProjectForm" component={NewProjectForm} />
      <Stack.Screen name="NewProjectMedia" component={NewProjectMedia} />
    </Stack.Navigator>
  );
}