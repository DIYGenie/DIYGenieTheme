import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function HowItWorksTile({
  icon = 'create-outline',
  label,
  onPress,
  a11yLabel,
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: pressed ? colors.diy.tilePressed : colors.diy.tileBg },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.brand} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 72,
    minWidth: '48%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.diy.tileBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1F1F',
  },
});
