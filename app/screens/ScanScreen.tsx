import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DraggableRect from '../components/DraggableRect';

export default function ScanScreen() {
  const navigation = useNavigation();
  const [norm, setNorm] = useState<{ x: number; y: number; w: number; h: number }>({ x: 0.2, y: 0.2, w: 0.5, h: 0.35 });

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Adjust area</Text>
      <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 12 }}>
        Drag or resize the rectangle to the target spot. (Camera disabled in this preview.)
      </Text>

      {/* Camera preview placeholder with adjustable ROI */}
      <View style={{ backgroundColor: '#111827', borderRadius: 16, padding: 8, alignItems: 'center' }}>
        <DraggableRect
          initial={norm}
          onChange={(n) => {
            setNorm(n);
          }}
          style={{ width: '100%' }}
        />
      </View>

      <Pressable
        onPress={() => {
          console.log('[roi] normalized', norm);
          navigation.goBack();
        }}
        style={{ backgroundColor: '#7C3AED', paddingVertical: 12, borderRadius: 12, marginTop: 16, alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Save area & Close</Text>
      </Pressable>
    </View>
  );
}
