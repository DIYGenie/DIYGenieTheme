import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import HomeScreen from '../screens/HomeScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import ProjectDetailsScreen from '../screens/ProjectDetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NewProjectForm from '../screens/NewProjectForm';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ProjectsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProjectsList" component={ProjectsScreen} />
      <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
    </Stack.Navigator>
  );
}

function TabBarBackground() {
  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={StyleSheet.absoluteFillObject}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    />
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Projects') {
            iconName = focused ? 'folder' : 'folder-outline';
          } else if (route.name === 'NewProject') {
            iconName = 'add';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
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
          // Web-specific shadow
          boxShadow: 'none',
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen 
        name="NewProject" 
        component={NewProjectForm} 
        options={{ tabBarLabel: 'New Project' }}
      />
      <Tab.Screen name="Projects" component={ProjectsStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}