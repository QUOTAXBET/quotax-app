import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext';
import { publicAPI, socialAPI } from '../src/utils/api';
import { colors } from '../src/utils/theme';
import { PlatformStats, Schedina, SocialActivity } from '../src/types';

const { width } = Dimensions.get('window');

// Animated counter component
function AnimatedCounter({ value, prefix = '', suffix = '', style }: { value: number; prefix?: string; suffix?: string; style?: any }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, {
      toValue: value,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const listener = animVal.addListener(({ value: v }) => {
      if (Number.isInteger(value)) {
        setDisplay(Math.round(v).toString());
      } else {
        setDisplay(v.toFixed(1));
      }
    });
    return () => animVal.removeListener(listener);
  }, [value]);

  return <Text style={style}>{prefix}{display}{suffix}</Text>;
}

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [schedine, setSchedine] = useState<Schedina[]>([]);
  const [social, setSocial] = useState<SocialActivity | null>(null);
  const [loading, setLoading] = useState(true);

  // Animations
  const liveBlink = useRef(new Animated.Value(1)).current;
  const ctaPulse = useRef(new Animated.Value(0)).current;
  const arrowX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace('/(tabs)');
      return;
    }
    fetchData();
    startAnimations();
  }, [isAuthenticated, authLoading]);

  const startAnimations = () => {
    // LIVE blink (red dot)
    Animated.loop(
      Animated.sequence([
        Animated.timing(liveBlink, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(liveBlink, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    // CTA pulse shadow
    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(ctaPulse, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ])
    ).start();

    // Arrow loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowX, { toValue: 6, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(arrowX, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  };

  const fetchData = async () => {
    try {
      const [statsData, schedineData, socialData] = await Promise.all([
        publicAPI.getStats(),
        publicAPI.getPreviewSchedule(),
        socialAPI.getActivity(),
      ]);
      setStats(statsData);
      setSchedine(schedineData);
      setSocial(socialData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const ctaShadowRadius = ctaPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 18],
  });

  const ctaShadowOpacity = ctaPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="trending-up" size={28} color={colors.primary} />
            <Text style={styles.logoText}>EdgeBet</Text>
          </View>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
            <Text style={styles.loginBtnText}>Accedi</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <LinearGradient colors={['#0B0F14', '#111820', '#0B0F14']} style={styles.hero}>
          <Text style={styles.heroTitle}>L'AI che batte i bookmaker</Text>
          <Text style={styles.heroSubtitle}>Zero fuffaguru. Solo dati, probabilità e ROI verificabile.</Text>
          
          {/* Animated Stats */}
          {stats && (
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <AnimatedCounter value={stats.roi_7d} prefix="+" suffix="%" style={styles.statValue} />
                <Text style={styles.statLabel}>ROI 7 giorni</Text>
              </View>
              <View style={styles.statBox}>
                <AnimatedCounter value={stats.win_rate} suffix="%" style={styles.statValue} />
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>
              <View style={styles.statBox}>
                <AnimatedCounter value={stats.streak} style={styles.statValue} />
                <Text style={styles.statLabel}>Serie Vinte</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Last Win Banner with LIVE badge */}
        {stats?.last_win && (
          <View style={styles.lastWinBanner}>
            <View style={styles.liveBadge}>
              <Animated.View style={[styles.liveDot, { opacity: liveBlink }]} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.lastWinText}>
              Ultima vincita: <Text style={styles.lastWinAmount}>+€{stats.last_win.amount.toFixed(2)}</Text>
            </Text>
            <Text style={styles.lastWinTime}>{stats.last_win.time}</Text>
          </View>
        )}

        {/* FOMO Counter */}
        {social && (
          <View style={styles.fomoBar}>
            <View style={styles.fomoItem}>
              <View style={styles.fomoLive} />
              <Text style={styles.fomoText}>{social.viewing_now} utenti online</Text>
            </View>
            <Text style={styles.fomoText}>+{social.subscribed_today} iscritti oggi</Text>
          </View>
        )}

        {/* Schedine Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Schedine del Giorno</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.sectionLink}>Sblocca tutte</Text>
            </TouchableOpacity>
          </View>

          {schedine.map((sch, idx) => (
            <View key={sch.schedina_id} style={[styles.schedina, sch.is_blurred && styles.schedinaBlurred]}>
              <View style={styles.schedinaHeader}>
                <View style={styles.schedinaStatus}>
                  {sch.status === 'won' && <Ionicons name="checkmark-circle" size={18} color={colors.profit} />}
                  {sch.status === 'lost' && <Ionicons name="close-circle" size={18} color={colors.loss} />}
                  {sch.status === 'pending' && <Ionicons name="time" size={18} color={colors.pending} />}
                  <Text style={[
                    styles.schedinaStatusText,
                    { color: sch.status === 'won' ? colors.profit : sch.status === 'lost' ? colors.loss : colors.pending }
                  ]}>
                    {sch.status === 'won' ? 'VINTA' : sch.status === 'lost' ? 'PERSA' : 'IN CORSO'}
                  </Text>
                </View>
                <Text style={styles.schedinaOdds}>@{sch.total_odds.toFixed(2)}</Text>
              </View>

              {!sch.is_blurred ? (
                <View style={styles.schedinaMatches}>
                  {sch.matches.slice(0, 3).map((m, i) => (
                    <View key={i} style={styles.matchRow}>
                      <Text style={styles.matchTeams}>{m.home} - {m.away}</Text>
                      <Text style={styles.matchBet}>{m.bet_type} @{m.odds}</Text>
                    </View>
                  ))}
                  {sch.matches.length > 3 && (
                    <Text style={styles.moreMatches}>+{sch.matches.length - 3} partite</Text>
                  )}
                </View>
              ) : (
                <TouchableOpacity style={styles.blurOverlay} onPress={() => router.push('/login')} activeOpacity={0.8}>
                  <LinearGradient
                    colors={['transparent', 'rgba(0, 255, 136, 0.08)', 'rgba(0, 255, 136, 0.15)']}
                    style={styles.blurGradient}
                  >
                    <Ionicons name="lock-open" size={22} color={colors.primary} />
                    <Text style={styles.blurText}>Sblocca questa schedina — Gratis</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <View style={styles.schedinaFooter}>
                <Text style={styles.schedinaStake}>Puntata: €{sch.stake}</Text>
                {sch.status === 'won' && (
                  <Text style={styles.schedinaWin}>+€{sch.actual_win.toFixed(2)}</Text>
                )}
                {sch.status === 'pending' && (
                  <Text style={styles.schdeinaPotential}>Potenziale: €{sch.potential_win.toFixed(2)}</Text>
                )}
              </View>

              {sch.viewers && (
                <View style={styles.viewersBar}>
                  <Ionicons name="eye" size={12} color={colors.textMuted} />
                  <Text style={styles.viewersText}>{sch.viewers} stanno guardando</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* CTA Section with pulse animation */}
        <View style={styles.ctaSection}>
          <Animated.View style={[styles.ctaShadow, {
            shadowRadius: ctaShadowRadius,
            shadowOpacity: ctaShadowOpacity,
          }]}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.ctaGradient}>
              <Text style={styles.ctaTitle}>Inizia a Vincere Oggi</Text>
              <Text style={styles.ctaSubtitle}>Accesso gratuito a stats e performance</Text>
              <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/login')}>
                <Text style={styles.ctaButtonText}>Registrati Gratis</Text>
                <Animated.View style={{ transform: [{ translateX: arrowX }] }}>
                  <Ionicons name="arrow-forward" size={20} color={colors.background} />
                </Animated.View>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Trust Badges */}
        <View style={styles.trustSection}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            <Text style={styles.trustText}>Dati Verificabili</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="analytics" size={24} color={colors.primary} />
            <Text style={styles.trustText}>AI Avanzata</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="flash" size={24} color={colors.primary} />
            <Text style={styles.trustText}>Live Alerts</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  loginBtn: { backgroundColor: colors.secondary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  loginBtnText: { color: colors.textPrimary, fontWeight: '600' },
  hero: { padding: 24, alignItems: 'center' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  heroSubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statBox: { backgroundColor: colors.card, padding: 16, borderRadius: 16, alignItems: 'center', minWidth: 100 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  // LIVE badge
  lastWinBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0, 255, 136, 0.1)', paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 20, borderRadius: 12, marginTop: 16 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255, 77, 77, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF4D4D' },
  liveText: { color: '#FF4D4D', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  lastWinText: { color: colors.textPrimary, fontSize: 14, flex: 1 },
  lastWinAmount: { color: colors.primary, fontWeight: '700' },
  lastWinTime: { color: colors.textMuted, fontSize: 12 },
  fomoBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.card, marginTop: 16 },
  fomoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fomoLive: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  fomoText: { color: colors.textSecondary, fontSize: 12 },
  section: { padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  sectionLink: { color: colors.primary, fontWeight: '600' },
  schedina: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  schedinaBlurred: {},
  schedinaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  schedinaStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  schedinaStatusText: { fontSize: 12, fontWeight: '700' },
  schedinaOdds: { fontSize: 16, fontWeight: '700', color: colors.primary },
  schedinaMatches: { marginBottom: 12 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  matchTeams: { color: colors.textPrimary, fontSize: 14 },
  matchBet: { color: colors.textSecondary, fontSize: 14 },
  moreMatches: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  // New gradient overlay for locked schedine
  blurOverlay: { borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  blurGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 8 },
  blurText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  schedinaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  schedinaStake: { color: colors.textSecondary, fontSize: 13 },
  schedinaWin: { color: colors.profit, fontSize: 18, fontWeight: '700' },
  schdeinaPotential: { color: colors.textSecondary, fontSize: 13 },
  viewersBar: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  viewersText: { color: colors.textMuted, fontSize: 11 },
  // CTA with pulse
  ctaSection: { paddingHorizontal: 20, marginBottom: 24 },
  ctaShadow: { borderRadius: 20, shadowColor: '#00FF88', shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  ctaGradient: { borderRadius: 20, padding: 24, alignItems: 'center' },
  ctaTitle: { fontSize: 22, fontWeight: '800', color: colors.background, marginBottom: 4 },
  ctaSubtitle: { fontSize: 14, color: 'rgba(11, 15, 20, 0.7)', marginBottom: 16 },
  ctaButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30 },
  ctaButtonText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  trustSection: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 24, borderTopWidth: 1, borderTopColor: colors.border, marginHorizontal: 20 },
  trustItem: { alignItems: 'center', gap: 8 },
  trustText: { color: colors.textSecondary, fontSize: 12 },
});
