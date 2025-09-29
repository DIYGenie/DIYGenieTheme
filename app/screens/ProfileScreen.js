import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function ProfileScreen() {
  const handleManagePlan = () => {
    // TODO: Navigate to plan management
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
                <Text style={styles.planTitle}>Current Plan: Pro</Text>
                <Text style={styles.planSubtitle}>25 projects/month, unlimited previews</Text>
              </View>
              <TouchableOpacity onPress={handleManagePlan}>
                <Text style={styles.manageButton}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>

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
    marginTop: -16, // Overlap gradient
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
    // Web-specific shadow
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
    // Web-specific shadow
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
    // Web-specific shadow
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