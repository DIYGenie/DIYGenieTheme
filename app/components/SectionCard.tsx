import React, { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  icon: React.ReactNode;
  title: string;
  summary?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  countBadge?: number;
};

export default function SectionCard({ icon, title, summary, children, defaultOpen = false, countBadge }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const rotateAnim = React.useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newState = !isOpen;
    setIsOpen(newState);
    
    Animated.timing(rotateAnim, {
      toValue: newState ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View
      style={{
        backgroundColor: '#F8F7FF',
        borderRadius: 16,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <Pressable
        onPress={toggle}
        style={({ pressed }) => ({
          padding: 18,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <View style={{ marginRight: 14 }}>{icon}</View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{title}</Text>
            {countBadge !== undefined && countBadge > 0 && (
              <View
                style={{
                  backgroundColor: '#6D28D9',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{countBadge}</Text>
              </View>
            )}
          </View>
          {summary && !isOpen && (
            <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>{summary}</Text>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="chevron-down" size={24} color="#6D28D9" />
        </Animated.View>
      </Pressable>

      {isOpen && (
        <View style={{ paddingHorizontal: 18, paddingBottom: 18, paddingTop: 4 }}>
          {children}
        </View>
      )}
    </View>
  );
}
