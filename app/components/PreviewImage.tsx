import * as React from 'react';
import { View, Image, Pressable, Text, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export default function PreviewImage({ uri }: { uri: string }) {
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    try {
      setSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow Photos access to save the preview.');
        return;
      }
      const fileUri = FileSystem.cacheDirectory + 'preview.jpg';
      const dl = await FileSystem.downloadAsync(uri, fileUri);
      const asset = await MediaLibrary.createAssetAsync(dl.uri);
      await MediaLibrary.createAlbumAsync('DIY Genie', asset, false);
      Alert.alert('Saved', 'Preview saved to Photos.');
      console.log('[details] saved preview to photos');
    } catch (e) {
      console.log('[details] save preview error', e);
      Alert.alert('Error', 'Could not save preview.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Image source={{ uri }} style={{ width: '100%', height: 200, borderRadius: 16 }} resizeMode="cover" />
      <Pressable
        onPress={save}
        disabled={saving}
        style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: '#6D28D9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}
      >
        <Text style={{ color: 'white', fontWeight: '700' }}>{saving ? 'Saving…' : 'Save to Photos'}</Text>
      </Pressable>
    </View>
  );
}
