import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, Easing, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { schedineAPI } from '../../src/utils/api';
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
  const [followedStats, setFollowedStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      GUEST_BULLETS.forEach((_, i) => {
        Animated.parallel([
          Animated.timing(bulletAnims[i], { toValue: 1, duration: 400, delay: 300 + i * 200, useNativeDriver: true }),
          Animated.timing(bulletTransY[i], { toValue: 0, duration: 400, delay: 300 + i * 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      });
    } else {
      fetchFollowedStats();
    }
  }, [isAuthenticated]);

  const fetchFollowedStats = async () => {
    setLoadingStats(true);
    try {
      const data = await schedineAPI.getFollowed();
      setFollowedStats(data);
    } catch (e) {
      // Default stats if API fails
      setFollowedStats({ followed_count: 0, wins: 0, roi_personal: 0, streak: 0 });
    } finally {
      setLoadingStats(false);
    }
  };

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

  // Guest profile
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}>
          <Text style={st.title}>Profilo</Text>
        </View>
        <View style={st.guestContainer}>
          <Ionicons name="warning" size={56} color={colors.gold} />
          <Text style={st.guestTitle}>Stai lasciando soldi sul tavolo</Text>
          <Text style={st.guestSubtitle}>Gli utenti registrati vedono il doppio delle schedine e tutte le spiegazioni AI</Text>

          <View style={st.guestBullets}>
            {GUEST_BULLETS.map((text, i) => (
              <Animated.View key={i} style={[st.guestBullet, { opacity: bulletAnims[i], transform: [{ translateY: bulletTransY[i] }] }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={st.guestBulletText}>{text}</Text>
              </Animated.View>
            ))}
          </View>

          <TouchableOpacity style={st.registerCta} onPress={() => router.push('/login')} activeOpacity={0.8}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={st.registerGradient}>
              <Text style={st.registerCtaText}>Registrati Gratis — 30 secondi</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.background} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={st.skipBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={st.skipText}>Continua come ospite</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Logged-in profile
  const tier = getTierBadge();

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <Text style={st.title}>Profilo</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.loss} />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent}>
        {/* User Card */}
        <View style={st.userCard}>
          <View style={st.avatar}>
            <Text style={st.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={st.userName}>{user?.name}</Text>
          <Text style={st.userEmail}>{user?.email}</Text>
          <View style={[st.tierBadge, { backgroundColor: tier.color }]}>
            <Text style={st.tierBadgeText}>{tier.label}</Text>
          </View>
        </View>

        {/* Statistiche — no wallet/saldo */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Le Tue Statistiche</Text>
          {loadingStats ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
          ) : (
            <View style={st.statsGrid}>
              <View style={st.statCard}>
                <Text style={st.statValue}>{followedStats?.followed_count || 0}</Text>
                <Text style={st.statLabel}>Schedine AI seguite</Text>
              </View>
              <View style={st.statCard}>
                <Text style={st.statValue}>{followedStats?.wins || 0}</Text>
                <Text style={st.statLabel}>Vinte</Text>
              </View>
              <View style={st.statCard}>
                <Text style={[st.statValue, { color: (followedStats?.roi_personal || 0) >= 0 ? colors.primary : colors.loss }]}>
                  {(followedStats?.roi_personal || 0) >= 0 ? '+' : ''}{followedStats?.roi_personal || 0}%
                </Text>
                <Text style={st.statLabel}>ROI Personale</Text>
              </View>
              <View style={st.statCard}>
                <Text style={st.statValue}>{followedStats?.streak || 0}</Text>
                <Text style={st.statLabel}>Streak</Text>
              </View>
            </View>
          )}
        </View>

        {/* Abbonamento */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Abbonamento</Text>
          <View style={st.subscriptionCard}>
            <View>
              <Text style={st.subscriptionPlan}>Piano {tier.label}</Text>
            </View>
            {(user?.subscription_tier === 'free' || !user?.subscription_tier) ? (
              <TouchableOpacity style={st.upgradeBtn} onPress={() => router.push('/subscribe')}>
                <Text style={st.upgradeBtnText}>Passa a Premium →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={st.manageBtn}><Text style={st.manageBtnText}>Gestisci</Text></TouchableOpacity>
            )}
          </View>
          {/* Premium benefits line */}
          {(user?.subscription_tier === 'free' || !user?.subscription_tier) && (
            <Text style={st.premiumHint}>Premium sblocca: tutte le schedine AI · analisi complete · Top Picks illimitate</Text>
          )}
        </View>

        {/* Info about tracking */}
        <View style={st.infoCard}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={st.infoText}>
            Tocca "Segui questa schedina" nella sezione Schedine AI per tracciare i pronostici. Il tuo ROI personale viene calcolato automaticamente in base agli esiti reali.
          </Text>
        </View>

        {/* Menu */}
        <View style={st.section}>
          <TouchableOpacity style={st.menuItem}><Ionicons name="notifications-outline" size={22} color={colors.textPrimary} /><Text style={st.menuText}>Notifiche</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></TouchableOpacity>
          <TouchableOpacity style={st.menuItem}><Ionicons name="help-circle-outline" size={22} color={colors.textPrimary} /><Text style={st.menuText}>Assistenza</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></TouchableOpacity>
          <TouchableOpacity style={st.menuItem}><Ionicons name="document-text-outline" size={22} color={colors.textPrimary} /><Text style={st.menuText}>Termini e Condizioni</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  // Guest
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
  // Logged in
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: colors.card, borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 10, marginTop: 4, textAlign: 'center' },
  subscriptionCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subscriptionPlan: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  upgradeBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  upgradeBtnText: { color: colors.background, fontWeight: '700', fontSize: 13 },
  manageBtn: { backgroundColor: colors.secondary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  manageBtnText: { color: colors.textPrimary, fontWeight: '600' },
  premiumHint: { color: colors.textMuted, fontSize: 12, marginTop: 10, lineHeight: 18 },
  infoCard: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(0,255,136,0.06)', padding: 14, borderRadius: 14, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0,255,136,0.15)' },
  infoText: { color: colors.textSecondary, fontSize: 12, flex: 1, lineHeight: 18 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 8, gap: 12 },
  menuText: { flex: 1, color: colors.textPrimary, fontSize: 15 },
});
