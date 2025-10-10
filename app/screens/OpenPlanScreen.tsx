import React, { useState, useRef } from "react";
import { View, Text, Alert, ScrollView } from "react-native";
import { ButtonPrimary, Card, SectionTitle, ui, space } from "../ui/components";
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

export default function OpenPlanScreen({ route, navigation }: any) {
  const { id } = route.params || {};
  const tabs = ["Overview","Materials","Steps","Shopping"] as const;
  const [active, setActive] = useState<typeof tabs[number]>("Overview");
  const [saving, setSaving] = useState(false);
  const pageRef = useRef(null);

  const Tab = ({ name }: { name: typeof tabs[number] }) => (
    <ButtonPrimary
      title={name}
      onPress={() => setActive(name)}
      style={{ paddingVertical:10, marginRight:10, backgroundColor: active===name ? "#7C3AED" : "#F3F4F6" }}
      textStyle={{ color: active===name ? "#fff" : "#111827", fontSize:14 }}
    />
  );

  const Stub = ({ title, body }: { title: string; body: string }) => (
    <Card style={{ marginTop: space.md }}>
      <SectionTitle>{title}</SectionTitle>
      <Text style={ui.p}>{body}</Text>
    </Card>
  );

  const handleSaveToPhotos = async () => {
    try {
      setSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access to save.');
        return;
      }

      const uri = await captureRef(pageRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      console.log('[plan] saved to photos');
      Alert.alert('Success', 'Saved to Photos.');
    } catch (e) {
      console.error('[plan save error]', e);
      Alert.alert('Error', 'Could not save to photos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        ref={pageRef}
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        <Text style={[ui.h1, { marginBottom: space.md }]}>Project Plan</Text>
        <View style={{ flexDirection:"row", marginBottom: space.md }}>
          {tabs.map(t => <Tab key={t} name={t} />)}
        </View>

        {active==="Overview"  && <Stub title="Overview"  body="High-level summary (stub)" />}
        {active==="Materials" && <Stub title="Materials" body="Tools & materials list (stub)" />}
        {active==="Steps"     && <Stub title="Steps"     body="Step-by-step instructions (stub)" />}
        {active==="Shopping"  && <Stub title="Shopping"  body="Suggested items & links (stub)" />}

        <ButtonPrimary title="Back to Project" onPress={() => navigation.goBack()} style={{ marginTop: space.lg }} />
      </ScrollView>

      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16, 
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB'
      }}>
        <ButtonPrimary 
          title={saving ? "Saving..." : "Save to Photos"}
          onPress={saving ? undefined : handleSaveToPhotos}
          style={{ backgroundColor: saving ? '#9CA3AF' : '#7C3AED' }}
        />
      </View>
    </View>
  );
}
