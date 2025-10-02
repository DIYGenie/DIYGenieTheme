import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, AppState, Linking, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const BASE = process.env.EXPO_PUBLIC_BASE_URL || 'https://api.diygenieapp.com';

const CURRENT_USER_ID = undefined;

const ENDPOINTS = {
  checkout: `${BASE}/api/billing/checkout`,
  portal: `${BASE}/api/billing/portal`,
  entitlementsShort: `${BASE}/me/entitlements`,
  entitlementsWithId: (id) => `${BASE}/me/entitlements/${id}`,
  devUpgrade: `${BASE}/api/billing/upgrade`,
};

const openExternal = async (url) => {
  try {
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error('Cannot open URL');
    await Linking.openURL(url);
  } catch (e) {
    Alert.alert('Billing', 'Could not open link. Please try again.');
  }
};

export default function ProfileScreen() {
  const [tier, setTier] = useState('free');
  const [remaining, setRemaining] = useState(0);
  const [previewAllowed, setPreviewAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showUpgradePicker, setShowUpgradePicker] = useState(false);
  
  const appState = useRef(AppState.currentState);
  const lastFetchTime = useRef(0);

  const api = async (url, opts = {}) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12000);
    
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        ...opts,
      });
      clearTimeout(t);
      
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error('Non-JSON response');
      }
      
      return await res.json();
    } catch (error) {
      clearTimeout(t);
      if (error.name === 'AbortError') {
        throw new Error('Network is slow—try again or use Sync Plan');
      }
      throw error;
    }
  };

  const getEntitlements = async () => {
    const now = Date.now();
    if (now - lastFetchTime.current < 2000) {
      return;
    }
    lastFetchTime.current = now;

    try {
      const data = await api(ENDPOINTS.entitlementsShort);
      setTier(data.tier || 'free');
      setRemaining(data.remaining || 0);
      setPreviewAllowed(data.previewAllowed || false);
    } catch (e) {
      if (String(e.message).startsWith('404') && CURRENT_USER_ID) {
        try {
          const data = await api(ENDPOINTS.entitlementsWithId(CURRENT_USER_ID));
          setTier(data.tier || 'free');
          setRemaining(data.remaining || 0);
          setPreviewAllowed(data.previewAllowed || false);
          return;
        } catch {}
      }
      Alert.alert('Billing', 'Could not load your plan right now. You can still try Upgrade or Manage, then tap Sync Plan.');
    }
  };

  const openPortal = async () => {
    setBusy(true);
    try {
      const { url } = await api(ENDPOINTS.portal, { method: 'POST' });
      await openExternal(url);
    } catch (e) {
      Alert.alert('Billing', 'Portal is unavailable (404). If you just need to change plans, use Upgrade for now.');
    } finally {
      setBusy(false);
    }
  };

  const openCheckout = async (selectedTier) => {
    setBusy(true);
    try {
      const { url } = await api(ENDPOINTS.checkout, {
        method: 'POST',
        body: JSON.stringify({ tier: selectedTier }),
      });
      await openExternal(url);
    } catch (e) {
      if (String(e.message).startsWith('404') || String(e.message).startsWith('501')) {
        try {
          await api(ENDPOINTS.devUpgrade, {
            method: 'POST',
            body: JSON.stringify({ tier: selectedTier }),
          });
          Alert.alert('Billing', `Upgraded to ${selectedTier} in dev mode. Syncing...`);
          await getEntitlements();
        } catch {
          Alert.alert('Billing', 'Upgrade fallback failed. Try Sync Plan or contact support.');
        }
      } else {
        Alert.alert('Billing', 'Checkout is unavailable right now. Try again shortly.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleManagePlan = () => {
    openPortal();
  };

  const handleAccountSettings = () => {
    // TODO: Navigate to account settings
  };

  const handleBilling = () => {
    // TODO: Navigate to billing
  };

  const handleHelp = () => {
    // TODO: Navigate to help
  };

  const handleLogOut = () => {
    // TODO: Handle logout
  };

  useEffect(() => {
    getEntitlements();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        getEntitlements();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const getPlanDescription = () => {
    if (tier === 'pro') return '25 projects/month + previews';
    if (tier === 'casual') return '5 projects/month + previews';
    return '2 projects/month, no previews';
  };

  const formatTier = (t) => {
    if (t === 'free') return 'Free';
    if (t === 'casual') return 'Casual';
    if (t === 'pro') return 'Pro';
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarPlaceholder} />
            <Text style={styles.profileName}>Tye Kowalski</Text>
            <Text style={styles.profileSubtitle}>DIY Enthusiast</Text>
          </View>

          {/* Your Plan Section */}
          <Text style={styles.sectionTitle}>Your Plan</Text>
          <View style={styles.planCard}>
            <View style={styles.planContent}>
              <View>
                <Text style={styles.planTitle}>Current Plan: {formatTier(tier)}</Text>
                <Text style={styles.planSubtitle}>{getPlanDescription()}</Text>
              </View>
              <TouchableOpacity onPress={handleManagePlan} disabled={busy}>
                <Text style={[styles.manageButton, busy && styles.disabledButton]}>
                  Manage
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {tier !== 'pro' && (
            <>
              <TouchableOpacity 
                style={styles.upgradeButton} 
                onPress={() => setShowUpgradePicker(v => !v)}
                disabled={busy}
              >
                <Text style={styles.upgradeButtonText}>
                  {showUpgradePicker ? 'Cancel' : 'Upgrade Plan'}
                </Text>
              </TouchableOpacity>

              {showUpgradePicker && (
                <View style={styles.pickerCard}>
                  <Text style={styles.pickerTitle}>Choose a plan</Text>
                  
                  <TouchableOpacity
                    style={[styles.planOptionButton, busy && styles.disabledPlanButton]}
                    onPress={() => {
                      setShowUpgradePicker(false);
                      openCheckout('casual');
                    }}
                    disabled={busy}
                  >
                    <Text style={styles.planOptionText}>Casual — 5 projects/mo + previews</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.planOptionButton, busy && styles.disabledPlanButton]}
                    onPress={() => {
                      setShowUpgradePicker(false);
                      openCheckout('pro');
                    }}
                    disabled={busy}
                  >
                    <Text style={styles.planOptionText}>Pro — 25 projects/mo + previews</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          <TouchableOpacity 
            style={styles.syncButton} 
            onPress={getEntitlements}
            disabled={busy}
          >
            <Text style={[styles.syncButtonText, busy && styles.disabledText]}>
              {busy ? 'Syncing...' : 'Sync Plan'}
            </Text>
          </TouchableOpacity>

          {/* Settings Section */}
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.settingsCard} onPress={handleAccountSettings}>
            <View style={styles.settingsRow}>
              <Ionicons name="person-outline" size={24} color="#64748B" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>Account Settings</Text>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsCard} onPress={handleBilling}>
            <View style={styles.settingsRow}>
              <Ionicons name="card-outline" size={24} color="#64748B" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>Billing & Payments</Text>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsCard} onPress={handleHelp}>
            <View style={styles.settingsRow}>
              <Ionicons name="help-circle-outline" size={24} color="#64748B" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsCard} onPress={handleLogOut}>
            <View style={styles.settingsRow}>
              <Ionicons name="log-out-outline" size={24} color="#DC2626" style={styles.settingsIcon} />
              <Text style={[styles.settingsLabel, styles.logoutLabel]}>Log Out</Text>
              <Ionicons name="chevron-forward" size={20} color="#DC2626" />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  gradientHeader: {
    height: 120,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 32,
    marginTop: -16,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    backgroundColor: '#E5E7EB',
    borderRadius: 36,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#0F172A',
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.interMedium,
    color: '#475569',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#0F172A',
    marginTop: 24,
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
    marginBottom: 16,
  },
  planContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#111827',
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: '#475569',
  },
  manageButton: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#F59E0B',
  },
  disabledButton: {
    color: '#9CA3AF',
  },
  upgradeButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#F59E0B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#FFFFFF',
  },
  pickerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
  },
  pickerTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#111827',
    marginBottom: 12,
  },
  planOptionButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  disabledPlanButton: {
    backgroundColor: '#9CA3AF',
  },
  planOptionText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#FFFFFF',
  },
  syncButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  syncButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.interMedium,
    color: '#F59E0B',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
    marginBottom: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIcon: {
    marginRight: 16,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#0F172A',
  },
  logoutLabel: {
    color: '#DC2626',
  },
});
