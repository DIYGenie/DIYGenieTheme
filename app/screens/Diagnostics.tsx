import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE } from '../lib/api';
import { softHealthCheck } from '../lib/health';

export default function Diagnostics(){
  const [last, setLast] = useState<any>(null);
  const info = {
    name: Constants?.expoConfig?.name,
    version: Constants?.expoConfig?.version,
    appEnv: (Constants?.expoConfig as any)?.extra?.appEnv,
    apiBase: API_BASE,
  };

  const run = async () => {
    try {
      const res = await fetch(`${API_BASE}/health/full`);
      setLast({ status: res.status, json: await res.json().catch(()=>null) });
    } catch (e) {
      setLast({ error: String(e) });
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding:16 }}>
      <Text style={{ fontSize:18, fontWeight:'700', marginBottom:8 }}>Diagnostics</Text>
      <Text>Name: {info.name}</Text>
      <Text>Version: {info.version}</Text>
      <Text>Env: {info.appEnv}</Text>
      <Text>API: {info.apiBase}</Text>

      <TouchableOpacity onPress={() => { softHealthCheck(); run(); }}
        style={{ marginTop:16, backgroundColor:'#6D28D9', borderRadius:12, padding:12, alignItems:'center' }}>
        <Text style={{ color:'white', fontWeight:'600' }}>Run health</Text>
      </TouchableOpacity>

      <View style={{ marginTop:16, backgroundColor:'white', borderRadius:12, padding:12 }}>
        <Text style={{ fontWeight:'600', marginBottom:6 }}>Last result</Text>
        <Text selectable style={{ fontFamily:'Menlo' }}>
          {JSON.stringify(last ?? {}, null, 2)}
        </Text>
      </View>
    </ScrollView>
  );
}
