import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GuidedOverlay({ step, instruction }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const guideWidth = SCREEN_WIDTH * 0.75;
  const guideHeight = SCREEN_HEIGHT * 0.5;
  const guideLeft = (SCREEN_WIDTH - guideWidth) / 2;
  const guideTop = (SCREEN_HEIGHT - guideHeight) / 2 - 40;

  return (
    <View style={styles.overlay}>
      {/* Dimmed backdrop */}
      <View style={styles.backdrop} />

      {/* Corner brackets */}
      <View style={[styles.cornerBracket, styles.topLeft, { top: guideTop, left: guideLeft }]} />
      <View style={[styles.cornerBracket, styles.topRight, { top: guideTop, right: SCREEN_WIDTH - guideLeft - guideWidth }]} />
      <View style={[styles.cornerBracket, styles.bottomLeft, { bottom: SCREEN_HEIGHT - guideTop - guideHeight, left: guideLeft }]} />
      <View style={[styles.cornerBracket, styles.bottomRight, { bottom: SCREEN_HEIGHT - guideTop - guideHeight, right: SCREEN_WIDTH - guideLeft - guideWidth }]} />

      {/* Pulsing focus reticle */}
      <Animated.View
        style={[
          styles.reticle,
          {
            transform: [{ scale: pulseAnim }],
            top: SCREEN_HEIGHT / 2 - 20,
            left: SCREEN_WIDTH / 2 - 20,
          },
        ]}
      />

      {/* Step indicator pill */}
      <View style={styles.stepPill}>
        <Text style={styles.stepText}>Step {step} of 3</Text>
      </View>

      {/* Instruction text */}
      <View style={[styles.instructionContainer, { top: guideTop + guideHeight + 24 }]}>
        <Text style={styles.instructionText}>{instruction}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cornerBracket: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.brand,
    borderWidth: 3,
  },
  topLeft: {
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  reticle: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: 'transparent',
  },
  stepPill: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(110, 64, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  stepText: {
    color: colors.onBrand,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.fontFamily.manropeSemiBold,
  },
  instructionContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  instructionText: {
    color: '#E0E0E0',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: typography.fontFamily.inter,
    lineHeight: 24,
  },
});
