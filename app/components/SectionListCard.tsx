import { View, Text, TouchableOpacity } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useRef } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';

export function SectionListCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  const ref = useRef<View>(null);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(items.join('\n'));
    } catch (e) {
      console.log('[copy error]', e);
    }
  };

  const handleSave = async () => {
    try {
      if (!ref.current) return;
      
      const uri = await captureRef(ref, { format: 'png', quality: 1 });
      
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('[save] permission denied');
        return;
      }
      
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('DIY Genie', asset, false);
      
      console.log('[save] saved to photos');
    } catch (e) {
      console.log('[save error]', e);
    }
  };

  return (
    <View
      ref={ref}
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700' }}>{title}</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={handleCopy}>
            <Text style={{ color: '#6D28D9' }}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave}>
            <Text style={{ color: '#6D28D9' }}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
      {items.length === 0 ? (
        <Text style={{ opacity: 0.6 }}>No items listed.</Text>
      ) : (
        items.map((t, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 6,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                borderWidth: 1,
                borderColor: '#D1D5DB',
                marginRight: 10,
              }}
            />
            <Text style={{ flex: 1 }}>{t}</Text>
          </View>
        ))
      )}
    </View>
  );
}
