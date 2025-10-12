import React, { useEffect, useState, PropsWithChildren } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import AuthScreen from '../screens/AuthScreen';
import WhatToTest from '../screens/WhatToTest';
import { getFlag } from '../lib/storage';

export default function AuthGate({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [showWhatToTest, setShowWhatToTest] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const seen = await getFlag('wt_seen');
      if (!mounted) return;
      setSignedIn(!!data.session);
      setShowWhatToTest(!seen);
      setLoading(false);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (showWhatToTest) {
    return <WhatToTest navigation={{ goBack: () => setShowWhatToTest(false), replace: () => setShowWhatToTest(false) }} />;
  }

  if (!signedIn) return <AuthScreen />;

  return <>{children}</>;
}
