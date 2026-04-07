import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/utils/theme';

const GUEST_BULLETS = [
  '2 schedine AI al giorno — gratis',
  'Spiegazioni AI complete su ogni pronostico',
  'Accesso alle Top Picks AI del giorno',
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const bulletAnims = useRef(GUEST_BULLETS.map(() => new Animated.Value(0))).current;
  const bulletTransY = useRef(GUEST_BULLETS.map(() => new Animated.Value(18))).current;

  useEffect(() => {
    if (!isAuthenticated) {
      GUEST_BULLETS.forEach((_, i) => {
        Animated.parallel([
          Animated.timing(bulletAnims[i], { toValue: 1, duration: 400, delay: 300 + i * 200, useNativeDriver: true }),
          Animated.timing(bulletTransY[i], { toValue: 0, duration: 400, delay: 300 + i * 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      });
    }
  }, [isAuthenticated]);

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
          <Ionicons name="warning" size={56} color={colors.gold} />
          <Text style={styles.guestTitle}>Stai lasciando soldi sul tavolo</Text>
          <Text style={styles.guestSubtitle}>Gli utenti registrati vedono il doppio delle schedine e tutte le spiegazioni AI</Text>

          <View style={styles.guestBullets}>
            {GUEST_BULLETS.map((text, i) => (
              <Animated.View key={i} style={[styles.guestBullet, { opacity: bulletAnims[i], transform: [{ translateY: bulletTransY[i] }] }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={styles.guestBulletText}>{text}</Text>
              </Animated.View>
            ))}
          </View>

          <TouchableOpacity style={styles.registerCta} onPress={() => router.push('/login')} activeOpacity={0.8}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.registerGradient}>
              <Text style={styles.registerCtaText}>Registrati Gratis — 30 secondi</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.background} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.skipText}>Continua come ospite</Text>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Abbonamento</Text>
          <View style={styles.subscriptionCard}>
            <View><Text style={styles.subscriptionPlan}>Piano {tier.label}</Text></View>
            {user?.subscription_tier === 'free' ? (
              <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/subscribe')}>
                <Text style={styles.upgradeBtnText}>Upgrade</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.manageBtn}><Text style={styles.manageBtnText}>Gestisci</Text></TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiche</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}><Text style={styles.statValue}>€{user?.wallet_balance?.toFixed(0) || 1000}</Text><Text style={styles.statLabel}>Saldo</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{user?.total_bets || 0}</Text><Text style={styles.statLabel}>Scommesse</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{user?.total_wins || 0}</Text><Text style={styles.statLabel}>Vinte</Text></View>
            <View style={styles.statCard}><Text style={[styles.statValue, { color: (user?.total_profit || 0) >= 0 ? colors.primary : colors.loss }]}>{(user?.total_profit || 0) >= 0 ? '+' : ''}€{user?.total_profit?.toFixed(0) || 0}</Text><Text style={styles.statLabel}>Profitto</Text></View>
          </View>
        </View>
        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem}><Ionicons name="notifications-outline" size={22} color={colors.textPrimary} /><Text style={styles.menuText}>Notifiche</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}><Ionicons name="help-circle-outline" size={22} color={colors.textPrimary} /><Text style={styles.menuText}>Assistenza</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}><Ionicons name="document-text-outline" size={22} color={colors.textPrimary} /><Text style={styles.menuText}>Termini e Condizioni</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></TouchableOpacity>
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
  guestTitle: { color: colors.gold, fontSize: 22, fontWeight: '800', marginTop: 20, textAlign: 'center' },
  guestSubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 21, paddingHorizontal: 12 },
  guestBullets: { marginTop: 28, gap: 10, width: '100%' },
  guestBullet: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 14, borderRadius: 12 },
  guestBulletText: { color: colors.textPrimary, fontSize: 14, flex: 1 },
  registerCta: { marginTop: 28, borderRadius: 16, overflow: 'hidden', width: '100%' },
  registerGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  registerCtaText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  skipBtn: { marginTop: 16 },
  skipText: { color: colors.textMuted, fontSize: 13 },
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
  subscriptionPlan: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
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
