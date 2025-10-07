import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, Text, Pressable, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { emitScanPhoto } from '../lib/scanEvents';

// Conditionally import camera only on native
let CameraView: any;
let useCameraPermissions: any;

if (Platform.OS !== 'web') {
  const Camera = require('expo-camera');
  CameraView = Camera.CameraView;
  useCameraPermissions = Camera.useCameraPermissions;
}

export default function ScanScreen() {
  const navigation = useNavigation();
  
  // Web fallback - show message immediately
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' }}>
        <Ionicons name="image-outline" size={48} color="#7C3AED" />
        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16 }}>Camera not available on web preview</Text>
        <Text style={{ color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
          Use "Upload Photo" on the New Project screen.
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 96, borderRadius: 12, backgroundColor: '#7C3AED', paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // Native only - camera hooks
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const ensure = async () => {
      if (!permission?.granted) await requestPermission();
      if (mounted) setLoading(false);
    };
    ensure();
    return () => { mounted = false; };
  }, [permission?.granted]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>Camera permission is required</Text>
        <Pressable onPress={requestPermission} style={{ marginTop: 16, borderRadius: 12, backgroundColor: '#7C3AED', paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: true });
      setPhotoUri(photo?.uri ?? null);
    } catch (e) {
      console.warn('capture failed', e);
    } finally {
      setCapturing(false);
    }
  };

  const usePhoto = () => {
    if (photoUri) {
      emitScanPhoto(photoUri);
      (navigation as any).navigate('NewProject', { photoUri, fromScan: true });
    }
  };

  const reset = () => setPhotoUri(null);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <Pressable onPress={() => navigation.goBack()} style={{ position: 'absolute', zIndex: 10, top: 48, left: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, padding: 8 }}>
        <Ionicons name="close" color="#FFFFFF" size={24} />
      </Pressable>

      {photoUri ? (
        <>
          <Image source={{ uri: photoUri }} style={{ width: '100%', height: '80%' }} resizeMode="cover" />
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, backgroundColor: '#000000' }}>
            <Pressable onPress={reset} style={{ borderRadius: 999, borderWidth: 1, borderColor: '#FFFFFF', paddingHorizontal: 24, paddingVertical: 12 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retake</Text>
            </Pressable>
            <Pressable onPress={usePhoto} style={{ borderRadius: 999, backgroundColor: '#7C3AED', paddingHorizontal: 32, paddingVertical: 12 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Use Photo</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing="back"
            enableTorch={false}
            onCameraReady={() => {}}
          />
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24, backgroundColor: '#000000' }}>
            <Pressable onPress={takePhoto} disabled={capturing} style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: '#FFFFFF' }} />
          </View>
        </>
      )}
    </View>
  );
}
