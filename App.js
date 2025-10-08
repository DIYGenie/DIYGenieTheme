import "react-native-gesture-handler";
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Manrope_400Regular,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter';
import AppNavigator from './app/navigation/AppNavigator';
import { AuthGate } from './app/providers/AuthGate';
import { colors } from './theme/colors';
import { typography } from './theme/typography';

function App() {
  let [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthGate>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </AuthGate>
    </SafeAreaProvider>
  );
}

export default App;