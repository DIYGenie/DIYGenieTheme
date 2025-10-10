import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AccordionCardProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  initiallyOpen?: boolean;
  testID?: string;
};

export default function AccordionCard({
  title,
  subtitle,
  children,
  initiallyOpen = false,
  testID,
}: AccordionCardProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [shouldRender, setShouldRender] = useState(initiallyOpen);
  const animation = useRef(new Animated.Value(initiallyOpen ? 1 : 0)).current;

  const toggleAccordion = () => {
    const toValue = isOpen ? 0 : 1;
    
    if (!isOpen) {
      setShouldRender(true);
    }
    
    Animated.timing(animation, {
      toValue,
      duration: 150,
      useNativeDriver: false,
    }).start(() => {
      if (isOpen) {
        setShouldRender(false);
      }
    });
    
    setIsOpen(!isOpen);
  };

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const opacityInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const maxHeightInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1000],
  });

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: '#F3F0FF',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={toggleAccordion}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: subtitle ? 4 : 0 }}>
            {title}
          </Text>
          {!!subtitle && <Text style={{ color: '#6B7280', fontSize: 14 }}>{subtitle}</Text>}
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="chevron-down" size={24} color="#6B7280" />
        </Animated.View>
      </Pressable>

      {shouldRender && (
        <Animated.View
          style={{
            opacity: opacityInterpolate,
            maxHeight: maxHeightInterpolate,
            paddingHorizontal: 16,
            paddingBottom: 16,
            overflow: 'hidden',
          }}
        >
          {children}
        </Animated.View>
      )}
    </View>
  );
}
