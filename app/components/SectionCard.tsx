import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  icon: React.ReactNode;
  title: string;
  summary?: string;
  countBadge?: number;
  defaultOpen?: boolean;
  onNavigate?: () => void;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  headerAction?: React.ReactNode;
};

export default function SectionCard({
  icon, title, summary, countBadge, defaultOpen, onNavigate, children, isOpen, onToggle, headerAction,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(!!defaultOpen);
  const controlled = isOpen !== undefined && onToggle !== undefined;
  const open = controlled ? isOpen : internalOpen;
  
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (controlled && onToggle) {
      onToggle();
    } else {
      setInternalOpen(v => {
        const newState = !v;
        console.log(`[details] toggle=${title.toLowerCase()} open=${newState}`);
        return newState;
      });
    }
  };

  return (
    <View
      style={{
        backgroundColor: '#F8F7FF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={toggle}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
        >
          <View style={{ marginRight: 12 }}>{icon}</View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{title}</Text>
            {!!summary && <Text style={{ marginTop: 2, color: '#6B7280' }}>{summary}</Text>}
          </View>

          {!!countBadge && (
            <View style={{
              backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 4,
              borderRadius: 10, marginRight: 8,
            }}>
              <Text style={{ color: '#6D28D9', fontWeight: '700' }}>{countBadge}</Text>
            </View>
          )}

          <Ionicons name="chevron-down" size={22} color="#6D28D9" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>
        
        {headerAction && (
          <View style={{ marginLeft: 8 }}>{headerAction}</View>
        )}
      </View>

      {open && <View style={{ marginTop: 12 }}>{children}</View>}
    </View>
  );
}
