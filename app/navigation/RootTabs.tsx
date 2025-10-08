import React from 'react';
import { createBottomTabNavigator, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { NavigatorScreenParams } from '@react-navigation/native';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import HomeScreen from '../screens/HomeScreen';
import NewProject from '../screens/NewProject';
import ProfileScreen from '../screens/ProfileScreen';
import ProjectsNavigator, { ProjectsStackParamList } from './ProjectsNavigator';
import { useAuthGate } from '../providers/AuthGate';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export type RootTabParamList = {
  Home: undefined;
  NewProject: undefined;
  Projects: NavigatorScreenParams<ProjectsStackParamList>;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabBarBackground() {
  return (
    <LinearGradient
      colors={['#5B2ED1', '#B39DFF']}
      style={StyleSheet.absoluteFillObject}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    />
  );
}

export default function RootTabs() {
  const { session, loading } = useAuthGate();

  const screenOpts: BottomTabNavigationOptions = {
    tabBarActiveTintColor: colors.white,
    tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.65)',
    tabBarStyle: {
      backgroundColor: 'transparent',
      borderTopWidth: 1,
      borderTopColor: 'rgba(229, 231, 235, 0.5)',
      elevation: 0,
      height: 80,
      paddingBottom: spacing.md,
      paddingTop: spacing.sm,
      shadowColor: 'transparent',
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    tabBarBackground: () => <TabBarBackground />,
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '600',
    },
    headerShown: false,
  };

  // Show loading indicator while checking auth
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.brand?.primary || '#7C3AED'} />
      </View>
    );
  }

  // If not signed in, show only Profile tab (labeled "Sign in")
  if (!session) {
    return (
      // @ts-ignore - id prop requires type augmentation
      <Tab.Navigator screenOptions={screenOpts} id="root-tabs">
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Sign in',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    );
  }

  // If signed in, show full app tabs
  return (
    // @ts-ignore - id prop requires type augmentation
    <Tab.Navigator screenOptions={screenOpts} id="root-tabs">
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="NewProject" 
        component={NewProject}
        options={{
          tabBarLabel: 'New Project',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name="add" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Projects" 
        component={ProjectsNavigator}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'folder' : 'folder-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
