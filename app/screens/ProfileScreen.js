import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, AppState, Linking, Alert, Platform, ActionSheetIOS } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const BASE = process.env.EXPO_PUBLIC_BASE_URL || 'https://api.diygenieapp.com';

const ENDPOINTS = {
  checkout: `${BASE}/api/billing/checkout`,
  portal: `${BASE}/api/billing/portal`,
  entitlements: `${BASE}/me/entitlements`,
  devUpgrade: `${BASE}/api/billing/upgrade`,
};

export default function ProfileScreen() {
  const [tier, setTier] = useState('free');
  const [remaining, setRemaining] = useState(0);
  const [previewAllowed, setPreviewAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const appState = useRef(AppState.currentState);
  const lastFetchTime = useRef(0);

  const api = async (path, { method = 'GET', body } = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(path, options);
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      return await res.json();
    } catch (error) {
      clearTimeout(timeoutId);
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
      const data = await api(ENDPOINTS.entitlements);
      setTier(data.tier || 'free');
      setRemaining(data.remaining || 0);
      setPreviewAllowed(data.previewAllowed || false);
    } catch (error) {
      console.error('Failed to fetch entitlements:', error);
      Alert.alert('Billing', 'Could not fetch plan details. Please try again.');
    }
  };

  const openPortal = async () => {
    setLoading(true);
    try {
      const data = await api(ENDPOINTS.portal, { method: 'POST' });
      if (data.url) {
        await Linking.openURL(data.url);
      }
    } catch (error) {
      console.error('Failed to open portal:', error);
      Alert.alert('Billing', 'Could not open billing portal. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const maybeDevUpgrade = async (selectedTier) => {
    try {
      await api(ENDPOINTS.devUpgrade, {
        method: 'POST',
        body: { tier: selectedTier },
      });
      await getEntitlements();
      Alert.alert('Billing', `Plan updated to ${selectedTier}!`);
    } catch (error) {
      console.error('Dev upgrade failed:', error);
      Alert.alert('Billing', 'Could not upgrade plan. Please try again.');
    }
  };

  const openCheckout = async (selectedTier) => {
    setLoading(true);
    try {
      const data = await api(ENDPOINTS.checkout, {
        method: 'POST',
        body: { tier: selectedTier },
      });
      if (data.url) {
        await Linking.openURL(data.url);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      const statusMatch = error.message.match(/^(\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 0;
      
      if (status === 404 || status === 501) {
        await maybeDevUpgrade(selectedTier);
      } else {
        Alert.alert('Billing', 'Could not open checkout. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    const options = [
      { label: 'Casual — 5 projects/mo + previews', value: 'casual' },
      { label: 'Pro — 25 projects/mo + previews', value: 'pro' },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...options.map(o => o.label)],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            openCheckout(options[buttonIndex - 1].value);
          }
        }
      );
    } else {
      Alert.alert(
        'Choose a Plan',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          ...options.map(opt => ({
            text: opt.label,
            onPress: () => openCheckout(opt.value),
          })),
        ],
        { cancelable: true }
      );
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
              <TouchableOpacity onPress={handleManagePlan} disabled={loading}>
                <Text style={[styles.manageButton, loading && styles.disabledButton]}>
                  {loading ? 'Loading...' : 'Manage'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {tier !== 'pro' && (
            <TouchableOpacity 
              style={styles.upgradeButton} 
              onPress={handleUpgrade}
              disabled={loading}
            >
              <Text style={styles.upgradeButtonText}>
                {loading ? 'Loading...' : 'Upgrade Plan'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.syncButton} 
            onPress={getEntitlements}
            disabled={loading}
          >
            <Text style={[styles.syncButtonText, loading && styles.disabledText]}>
              Sync Plan
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
