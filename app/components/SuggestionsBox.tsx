import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

type Props = {
  title?: string;
  items: string[];
  loading?: boolean;
  onSelect?: (text: string) => void;
  onRefresh?: () => void;
};

export default function SuggestionsBox({ title="Suggestions", items, loading, onSelect, onRefresh }: Props) {
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>{title}</Text>
        <TouchableOpacity onPress={onRefresh} accessibilityRole="button">
          <Text style={{ fontSize: 14, textDecorationLine: 'underline' }}>{loading ? 'Loading…' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator />
      ) : items.length === 0 ? (
        <Text style={{ opacity: 0.6 }}>No suggestions yet</Text>
      ) : (
        <View>
          {items.map((s, i) => (
            <TouchableOpacity key={i} onPress={() => onSelect?.(s)} style={{ paddingVertical: 8 }}>
              <Text>• {s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
