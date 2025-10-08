import React, { useMemo, useRef, useState } from 'react';
import { Modal, View, Image, PanResponder, StyleSheet, Text, Pressable, LayoutChangeEvent } from 'react-native';

type Pt = { x: number; y: number };

export default function RoiModal({
  visible,
  imageUrl,
  onCancel,
  onSave,
  label = 'Area 1',
}: {
  visible: boolean;
  imageUrl: string;
  onCancel: () => void;
  onSave: (points: Pt[], label: string) => void;
  label?: string;
}) {
  const [wrapW, setWrapW] = useState(0);
  const [wrapH, setWrapH] = useState(0);

  // Fixed rectangle size for V1 (move-only): 60% width, 40% height
  const rectW = Math.max(1, Math.round(wrapW * 0.6));
  const rectH = Math.max(1, Math.round(wrapH * 0.4));

  // Start centered
  const startX = Math.max(0, Math.round((wrapW - rectW) / 2));
  const startY = Math.max(0, Math.round((wrapH - rectH) / 2));

  const pos = useRef({ x: startX, y: startY });
  const [tick, setTick] = useState(0); // force re-render when dragging

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_evt, g) => {
          let nx = pos.current.x + g.dx;
          let ny = pos.current.y + g.dy;
          // clamp inside image bounds
          nx = Math.max(0, Math.min(nx, wrapW - rectW));
          ny = Math.max(0, Math.min(ny, wrapH - rectH));
          pos.current = { x: nx, y: ny };
          setTick(t => t + 1);
        },
        onPanResponderRelease: () => {},
      }),
    [wrapW, wrapH, rectW, rectH]
  );

  function onWrapLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setWrapW(width);
    setWrapH(height);
    // reset to center when layout changes
    pos.current = { x: Math.max(0, Math.round((width - rectW) / 2)), y: Math.max(0, Math.round((height - rectH) / 2)) };
    setTick(t => t + 1);
  }

  function handleSave() {
    if (!wrapW || !wrapH) return;
    const { x, y } = pos.current;
    const pts: Pt[] = [
      { x: x / wrapW, y: y / wrapH },                       // TL
      { x: (x + rectW) / wrapW, y: y / wrapH },             // TR
      { x: (x + rectW) / wrapW, y: (y + rectH) / wrapH },   // BR
      { x: x / wrapW, y: (y + rectH) / wrapH },             // BL
    ];
    onSave(pts, label);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={S.backdrop}>
        <View style={S.sheet}>
          <Text style={S.title}>Mark focus area</Text>
          <View style={S.imageWrap} onLayout={onWrapLayout}>
            {!!imageUrl && (
              <Image source={{ uri: imageUrl }} style={S.image} resizeMode="contain" />
            )}
            {/* draggable rect */}
            <View
              {...pan.panHandlers}
              style={[
                S.rect,
                { width: rectW, height: rectH, transform: [{ translateX: pos.current.x }, { translateY: pos.current.y }] },
              ]}
            >
              <Text style={S.grip}>⇕ Drag</Text>
            </View>
          </View>

          <View style={S.row}>
            <Pressable onPress={onCancel} accessibilityRole="button" style={[S.btn, S.ghost]}>
              <Text style={[S.btnText, S.ghostText]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} accessibilityRole="button" style={[S.btn, S.primary]}>
              <Text style={S.btnText}>Save Area</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 12, maxHeight: '90%' },
  title: { fontSize: 18, fontWeight: '600' },
  imageWrap: { width: '100%', aspectRatio: 1, backgroundColor: '#f3f4f6', borderRadius: 12, overflow: 'hidden', position: 'relative' },
  image: { position: 'absolute', width: '100%', height: '100%' },
  rect: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(99,102,241,0.9)', backgroundColor: 'rgba(99,102,241,0.18)', alignItems: 'center', justifyContent: 'center' },
  grip: { fontSize: 12, color: '#1f2937', backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 4 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  primary: { backgroundColor: '#6d28d9' },
  btnText: { color: 'white', fontWeight: '600' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e5e7eb' },
  ghostText: { color: '#111827' },
});
