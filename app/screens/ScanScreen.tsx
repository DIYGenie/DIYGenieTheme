import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function ScanScreen() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 8 }}>AR Scan</Text>
      <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
        AR Scan is coming soon. For now, you can upload a photo.
      </Text>

      <Pressable
        onPress={() => navigation.goBack()}
        style={{
          backgroundColor: '#7C3AED',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Close</Text>
      </Pressable>
    </View>
  );
}
