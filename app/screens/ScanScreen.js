import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useCameraPermission } from '../hooks/useCameraPermission';
import PrePermissionSheet from '../components/modals/PrePermissionSheet';
import GuidedOverlay from '../components/scan/GuidedOverlay';
import PressableScale from '../components/ui/PressableScale';

const STEP_INSTRUCTIONS = {
  1: "Frame the wall area you'll work on",
  2: "Move the phone slowly to stabilize",
  3: "Hold steady, then tap capture",
};

export default function ScanScreen({ navigation }) {
  const { checkStatus, request } = useCameraPermission();
  const [hasPermission, setHasPermission] = useState(false);
  const [showPermissionSheet, setShowPermissionSheet] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [step, setStep] = useState(1);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    checkCameraPermission();
  }, []);

  useEffect(() => {
    if (hasPermission && step < 3) {
      const timer = setTimeout(() => {
        setStep(step + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasPermission, step]);

  const checkCameraPermission = async () => {
    const status = await checkStatus();
    if (status === 'granted') {
      setHasPermission(true);
    } else {
      setShowPermissionSheet(true);
    }
  };

  const handleContinue = async () => {
    const result = await request();
    if (result === 'granted') {
      setHasPermission(true);
      setShowPermissionSheet(false);
      setPermissionDenied(false);
    } else {
      setPermissionDenied(true);
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
    setShowPermissionSheet(false);
  };

  const handleClose = () => {
    setShowPermissionSheet(false);
    navigation.goBack();
  };

  const handleCapture = async () => {
    if (step !== 3 || !cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      navigation.navigate('ScanReview', { photoUri: photo.uri });
    } catch (error) {
      console.error('Failed to capture photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (!hasPermission) {
    return (
      <>
        <SafeAreaView style={styles.container}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.permissionText}>Camera permission required</Text>
          </View>
        </SafeAreaView>

        <PrePermissionSheet
          visible={showPermissionSheet}
          title={permissionDenied ? "Camera access needed" : "Use your camera to scan the room"}
          subtitle={permissionDenied 
            ? "Camera access was denied. Please enable it in Settings to use the room scanner."
            : "We'll measure and place your project preview. We never store video without your OK."
          }
          iconName="camera-outline"
          primaryLabel={permissionDenied ? "Open Settings" : "Continue"}
          secondaryLabel={permissionDenied ? "Close" : "Not now"}
          onPrimary={permissionDenied ? handleOpenSettings : handleContinue}
          onSecondary={handleClose}
        />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={Camera.Constants.Type.back}
        ratio="16:9"
      >
        <GuidedOverlay step={step} instruction={STEP_INSTRUCTIONS[step]} />

        <SafeAreaView style={styles.safeArea}>
          {/* Back button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={28} color={colors.onBrand} />
          </TouchableOpacity>

          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            <Text style={styles.helpText}>Need help?</Text>
            
            <PressableScale
              onPress={handleCapture}
              haptic={step === 3 ? "medium" : "none"}
              scaleTo={0.95}
              accessibilityRole="button"
              accessibilityLabel="Capture photo"
              style={[
                styles.captureButton,
                step !== 3 && styles.captureButtonDisabled,
              ]}
              disabled={step !== 3 || isCapturing}
            >
              <View style={styles.captureButtonInner} />
            </PressableScale>
          </View>
        </SafeAreaView>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  camera: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  bottomControls: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  helpText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    marginBottom: 24,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ctaShadow,
    shadowOpacity: 0.8,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  captureButtonDisabled: {
    backgroundColor: 'rgba(110, 64, 255, 0.4)',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.onBrand,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.inter,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
