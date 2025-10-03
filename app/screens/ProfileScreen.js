import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, AppState, Linking, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const BASE = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:5000';
const ENDPOINTS = {
  entitlementsShort: `${BASE}/me/entitlements`,
  entitlementsWithId: (id) => `${BASE}/me/entitlements/${id}`,
  checkout: `${BASE}/api/billing/checkout`,
  portal: `${BASE}/api/billing/portal`,
  devUpgrade: `${BASE}/api/billing/upgrade`,
};

const CURRENT_USER_ID = 'e4cb3591-7272-46dd-b1f6-d7cc4e2f3d24';

const api = async (url, opts = {}) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    ...opts,
  });
  clearTimeout(t);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('Non-JSON response');
  return res.json();
};

const openExternal = async (url) => {
  try {
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const can = await Linking.canOpenURL(url);
    if (!can) throw new Error('Cannot open URL');
    await Linking.openURL(url);
  } catch (e) {
    Alert.alert('Billing', 'Could not open link. Please try again.');
  }
};

function PlanCard({ title, priceText, subtitle, features, ctaText, onPress, popular, testID, disabled }) {
  return (
    <View
      style={[
        styles.planCardContainer,
        popular && styles.planCardPopular,
      ]}
    >
      <View style={styles.planCardHeader}>
        <Text style={styles.planCardTitle}>{title}</Text>
        {popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>Most popular</Text>
          </View>
        )}
      </View>
      
      <View style={styles.planCardPriceRow}>
        <Text style={styles.planCardPrice}>{priceText.split('/')[0]}</Text>
        <Text style={styles.planCardPricePeriod}>/{priceText.split('/')[1]}</Text>
      </View>
      
      <Text style={styles.planCardSubtitle}>{subtitle}</Text>
      
      <View style={styles.planCardFeatures}>
        {features.map((feature, idx) => (
          <View key={idx} style={styles.planCardFeature}>
            <Text style={styles.planCardFeatureCheck}>✓</Text>
            <Text style={styles.planCardFeatureText}>{feature}</Text>
          </View>
        ))}
      </View>
      
      <TouchableOpacity
        style={[styles.planCardCTA, disabled && styles.planCardCTADisabled]}
        onPress={onPress}
        disabled={disabled}
        accessible
        accessibilityRole="button"
        testID={testID}
      >
        <Text style={styles.planCardCTAText}>{ctaText}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ProfileScreen() {
  const [busy, setBusy] = React.useState(false);
  const [ents, setEnts] = React.useState({ tier: 'free', remaining: 0, previewAllowed: false });
  const [showUpgradePicker, setShowUpgradePicker] = React.useState(false);
  const [dbg, setDbg] = React.useState({ base: BASE, user: CURRENT_USER_ID, last: null, error: null });

  const getEntitlements = React.useCallback(async () => {
    try {
      const data = await api(`${ENDPOINTS.entitlementsShort}?user_id=${encodeURIComponent(CURRENT_USER_ID)}`);
      setEnts({ tier: data.tier, remaining: data.remaining, previewAllowed: !!data.previewAllowed });
    } catch (err) {
      if (String(err.message).startsWith('404')) {
        try {
          const data = await api(ENDPOINTS.entitlementsWithId(CURRENT_USER_ID));
          setEnts({ tier: data.tier, remaining: data.remaining, previewAllowed: !!data.previewAllowed });
          return;
        } catch (_) {}
      }
      Alert.alert('Billing', 'Could not load your plan. Use Sync Plan to retry.');
    }
  }, []);

  const openPortal = async () => {
    setBusy(true);
    try {
      const { url } = await api(ENDPOINTS.portal, {
        method: 'POST',
        body: JSON.stringify({ user_id: CURRENT_USER_ID }),
      });
      await openExternal(url);
    } catch (e) {
      if (String(e.message).startsWith('501')) {
        Alert.alert('Billing', 'Portal not available for this user yet.');
      } else {
        Alert.alert('Billing', 'Portal is unavailable. Try again later.');
      }
    } finally {
      setBusy(false);
    }
  };

  const openCheckout = async (tier) => {
    setBusy(true);
    try {
      const { url } = await api(ENDPOINTS.checkout, {
        method: 'POST',
        body: JSON.stringify({ tier, user_id: CURRENT_USER_ID }),
      });
      await openExternal(url);
    } catch (e) {
      if (String(e.message).startsWith('404') || String(e.message).startsWith('501')) {
        try {
          await api(ENDPOINTS.devUpgrade, {
            method: 'POST',
            body: JSON.stringify({ tier, user_id: CURRENT_USER_ID }),
          });
          Alert.alert('Billing', `Upgraded to ${tier} in dev mode. Syncing...`);
          await getEntitlements();
        } catch {
          Alert.alert('Billing', 'Upgrade fallback failed. Use Sync Plan or try again.');
        }
      } else {
        Alert.alert('Billing', 'Checkout is unavailable. Try again later.');
      }
    } finally {
      setBusy(false);
    }
  };

  React.useEffect(() => {
    getEntitlements();
  }, [getEntitlements]);

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') getEntitlements();
    });
    return () => sub.remove();
  }, [getEntitlements]);

  const logDbg = (obj) => {
    console.log('[BillingDebug]', obj);
    setDbg((d) => ({ ...d, last: obj, error: null }));
  };

  const logErr = (e) => {
    console.warn('[BillingDebug]', e);
    setDbg((d) => ({ ...d, error: String(e?.message || e) }));
  };

  const pingEntitlements = async () => {
    try {
      const data = await api(`${ENDPOINTS.entitlementsShort}?user_id=${encodeURIComponent(CURRENT_USER_ID)}`);
      logDbg({ op: 'entitlements', data });
    } catch (e) {
      if (String(e.message).startsWith('404')) {
        try {
          const data = await api(ENDPOINTS.entitlementsWithId(CURRENT_USER_ID));
          logDbg({ op: 'entitlements_fallback', data });
          return;
        } catch (ee) {
          logErr(ee);
        }
      } else {
        logErr(e);
      }
    }
  };

  const testCheckout = async (tier) => {
    try {
      const { url } = await api(ENDPOINTS.checkout, {
        method: 'POST',
        body: JSON.stringify({ tier, user_id: CURRENT_USER_ID }),
      });
      logDbg({ op: 'checkout', tier, url });
      await openExternal(url);
    } catch (e) {
      logErr(e);
    }
  };

  const testPortal = async () => {
    try {
      const { url } = await api(ENDPOINTS.portal, {
        method: 'POST',
        body: JSON.stringify({ user_id: CURRENT_USER_ID }),
      });
      logDbg({ op: 'portal', url });
      await openExternal(url);
    } catch (e) {
      logErr(e);
    }
  };

  const devUpgrade = async (tier) => {
    try {
      const res = await api(ENDPOINTS.devUpgrade, {
        method: 'POST',
        body: JSON.stringify({ tier, user_id: CURRENT_USER_ID }),
      });
      logDbg({ op: 'devUpgrade', tier, res });
    } catch (e) {
      logErr(e);
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

  const getPlanDescription = () => {
    if (ents.tier === 'pro') return '25 projects/month + previews';
    if (ents.tier === 'casual') return '5 projects/month + previews';
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
                <Text style={styles.planTitle}>Current Plan: {formatTier(ents.tier)}</Text>
                <Text style={styles.planSubtitle}>{getPlanDescription()}</Text>
              </View>
              <TouchableOpacity onPress={handleManagePlan} disabled={busy}>
                <Text style={[styles.manageButton, busy && styles.disabledButton]}>
                  Manage
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {ents.tier !== 'pro' && (
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
                <View style={styles.upgradeCardsContainer} testID="upgrade-cards">
                  <PlanCard
                    title="Pro"
                    priceText="$14.99/mo"
                    subtitle="Best for frequent builders"
                    features={[
                      '25 projects/month',
                      'Unlimited previews (Decor8)',
                      'AR Scan access (stub)',
                      'Save & export plans',
                      'Priority improvements access',
                    ]}
                    ctaText="Start Pro — $14.99/mo"
                    popular
                    onPress={() => {
                      setShowUpgradePicker(false);
                      openCheckout('pro');
                    }}
                    testID="plan-pro-cta"
                    disabled={busy}
                  />
                  
                  <PlanCard
                    title="Casual"
                    priceText="$5.99/mo"
                    subtitle="Great for occasional projects"
                    features={[
                      '5 projects/month',
                      'Unlimited previews (Decor8)',
                      'AR Scan access (stub)',
                      'Save & export plans',
                    ]}
                    ctaText="Start Casual — $5.99/mo"
                    onPress={() => {
                      setShowUpgradePicker(false);
                      openCheckout('casual');
                    }}
                    testID="plan-casual-cta"
                    disabled={busy}
                  />
                  
                  <Text style={styles.upgradeFootnote}>
                    Cancel anytime via{' '}
                    <Text
                      style={styles.upgradeFootnoteLink}
                      onPress={openPortal}
                    >
                      Manage
                    </Text>
                    {' '}(Stripe Portal).
                  </Text>
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

          {/* Billing Debug (temp) */}
          <Text style={styles.sectionTitle}>Billing Debug (temp)</Text>
          <View style={styles.debugCard}>
            <Text style={styles.debugInfo}>BASE: {dbg.base}</Text>
            <Text style={styles.debugInfo}>USER_ID: {dbg.user}</Text>
            
            <View style={styles.debugButtons}>
              <TouchableOpacity
                style={styles.debugButton}
                onPress={pingEntitlements}
                testID="dbg-ping-entitlements"
              >
                <Text style={styles.debugButtonText}>Ping Entitlements</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.debugButton}
                onPress={() => testCheckout('casual')}
                testID="dbg-checkout-casual"
              >
                <Text style={styles.debugButtonText}>Checkout Casual</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.debugButton}
                onPress={() => testCheckout('pro')}
                testID="dbg-checkout-pro"
              >
                <Text style={styles.debugButtonText}>Checkout Pro</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.debugButton}
                onPress={testPortal}
                testID="dbg-portal"
              >
                <Text style={styles.debugButtonText}>Open Portal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.debugButton}
                onPress={() => devUpgrade('casual')}
                testID="dbg-upgrade-casual"
              >
                <Text style={styles.debugButtonText}>Dev Upgrade Casual</Text>
              </TouchableOpacity>
            </View>

            <Text
              selectable
              style={{
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                fontSize: 12,
                opacity: 0.8,
                marginTop: 8,
              }}
            >
              {dbg.error ? `Error: ${dbg.error}` : JSON.stringify(dbg.last, null, 2) || '—'}
            </Text>
          </View>
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
  upgradeCardsContainer: {
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
    gap: 16,
  },
  planCardContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E8E9EE',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardPopular: {
    borderColor: '#6F4BFF',
    backgroundColor: 'rgba(111, 75, 255, 0.06)',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planCardTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#111827',
  },
  popularBadge: {
    backgroundColor: '#6F4BFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  planCardPrice: {
    fontSize: 32,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#111827',
  },
  planCardPricePeriod: {
    fontSize: 18,
    fontFamily: typography.fontFamily.inter,
    color: '#64748B',
  },
  planCardSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: '#64748B',
    marginBottom: 16,
  },
  planCardFeatures: {
    marginBottom: 20,
    gap: 10,
  },
  planCardFeature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  planCardFeatureCheck: {
    fontSize: 16,
    color: '#6F4BFF',
    fontWeight: '700',
  },
  planCardFeatureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.fontFamily.inter,
    color: '#374151',
    lineHeight: 20,
  },
  planCardCTA: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  planCardCTADisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  planCardCTAText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#FFFFFF',
  },
  upgradeFootnote: {
    fontSize: 12,
    fontFamily: typography.fontFamily.inter,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  upgradeFootnoteLink: {
    color: '#F59E0B',
    fontFamily: typography.fontFamily.manropeBold,
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
  debugCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
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
  debugInfo: {
    fontSize: 12,
    fontFamily: typography.fontFamily.inter,
    color: '#64748B',
    marginBottom: 4,
  },
  debugButtons: {
    marginTop: 12,
    gap: 8,
  },
  debugButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  debugButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.manropeBold,
    color: '#FFFFFF',
  },
});
