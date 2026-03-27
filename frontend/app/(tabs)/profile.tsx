import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/utils/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert('Logout', 'Sei sicuro di voler uscire?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } }
    ]);
  };

  const getTierBadge = () => {
    switch (user?.subscription_tier) {
      case 'premium': return { label: 'PREMIUM', color: colors.gold };
      case 'pro': return { label: 'PRO', color: colors.primary };
      case 'base': return { label: 'BASE', color: colors.textSecondary };
      default: return { label: 'FREE', color: colors.textMuted };
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Profilo</Text>
        </View>
        <View style={styles.guestContainer}>
          <Ionicons name="person-circle-outline" size={80} color={colors.textMuted} />
          <Text style={styles.guestTitle}>Modalità Ospite</Text>
          <Text style={styles.guestSubtitle}>Accedi per salvare i tuoi progressi e sbloccare tutte le funzionalità</Text>
          <TouchableOpacity style={styles.loginCta} onPress={() => router.push('/login')}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.loginGradient}>
              <Ionicons name="logo-google" size={20} color={colors.background} />
              <Text style={styles.loginCtaText}>Accedi con Google</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const tier = getTierBadge();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profilo</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.loss} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
            <Text style={styles.tierBadgeText}>{tier.label}</Text>
          </View>
        </View>

        {/* Subscription Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Abbonamento</Text>
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionPlan}>Piano {tier.label}</Text>
              {user?.subscription_expires && (
                <Text style={styles.subscriptionExpiry}>
                  Scade il {new Date(user.subscription_expires).toLocaleDateString('it-IT')}
                </Text>
              )}
            </View>
            {user?.subscription_tier === 'free' ? (
              <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/subscribe')}>
                <Text style={styles.upgradeBtnText}>Upgrade</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.manageBtn}>
                <Text style={styles.manageBtnText}>Gestisci</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiche</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>€{user?.wallet_balance?.toFixed(0) || 1000}</Text>
              <Text style={styles.statLabel}>Saldo Virtuale</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user?.total_bets || 0}</Text>
              <Text style={styles.statLabel}>Scommesse</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user?.total_wins || 0}</Text>
              <Text style={styles.statLabel}>Vinte</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: (user?.total_profit || 0) >= 0 ? colors.primary : colors.loss }]}>
                {(user?.total_profit || 0) >= 0 ? '+' : ''}€{user?.total_profit?.toFixed(0) || 0}
              </Text>
              <Text style={styles.statLabel}>Profitto</Text>
            </View>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            <Text style={styles.menuText}>Notifiche</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={22} color={colors.textPrimary} />
            <Text style={styles.menuText}>Assistenza</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="document-text-outline" size={22} color={colors.textPrimary} />
            <Text style={styles.menuText}>Termini e Condizioni</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  guestContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  guestTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 20 },
  guestSubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  loginCta: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  loginGradient: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 32, paddingVertical: 16 },
  loginCtaText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  scrollContent: { padding: 20 },
  userCard: { backgroundColor: colors.card, borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { color: colors.background, fontSize: 32, fontWeight: '800' },
  userName: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  userEmail: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  tierBadge: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  tierBadgeText: { color: colors.background, fontSize: 12, fontWeight: '700' },
  section: { marginBottom: 24 },
  sectionTitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  subscriptionCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subscriptionInfo: {},
  subscriptionPlan: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  subscriptionExpiry: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  upgradeBtn: { backgroundColor: colors.gold, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  upgradeBtnText: { color: colors.background, fontWeight: '700' },
  manageBtn: { backgroundColor: colors.secondary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  manageBtnText: { color: colors.textPrimary, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: colors.card, borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 8, gap: 12 },
  menuText: { flex: 1, color: colors.textPrimary, fontSize: 15 },
});
