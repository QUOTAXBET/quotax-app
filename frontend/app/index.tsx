import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext';
import { publicAPI, socialAPI } from '../src/utils/api';
import { colors } from '../src/utils/theme';
import { PlatformStats, Schedina, SocialActivity } from '../src/types';

const { width } = Dimensions.get('window');

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [schedine, setSchedine] = useState<Schedina[]>([]);
  const [social, setSocial] = useState<SocialActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace('/(tabs)');
      return;
    }
    fetchData();
  }, [isAuthenticated, authLoading]);

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
          <Text style={styles.heroTitle}>Il Vantaggio che ti Mancava</Text>
          <Text style={styles.heroSubtitle}>Pronostici data-driven con ROI verificabile</Text>
          
          {/* Live Stats */}
          {stats && (
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>+{stats.roi_7d}%</Text>
                <Text style={styles.statLabel}>ROI 7 giorni</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.win_rate}%</Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.streak}</Text>
                <Text style={styles.statLabel}>Serie Vinte</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Last Win Banner */}
        {stats?.last_win && (
          <View style={styles.lastWinBanner}>
            <Ionicons name="flash" size={20} color={colors.primary} />
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
                <View style={styles.blurOverlay}>
                  <Ionicons name="lock-closed" size={24} color={colors.gold} />
                  <Text style={styles.blurText}>Registrati per vedere</Text>
                </View>
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

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.ctaGradient}>
            <Text style={styles.ctaTitle}>Inizia a Vincere Oggi</Text>
            <Text style={styles.ctaSubtitle}>Accesso gratuito a stats e performance</Text>
            <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/login')}>
              <Text style={styles.ctaButtonText}>Registrati Gratis</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.background} />
            </TouchableOpacity>
          </LinearGradient>
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
  heroSubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statBox: { backgroundColor: colors.card, padding: 16, borderRadius: 16, alignItems: 'center', minWidth: 100 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  lastWinBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0, 255, 136, 0.1)', paddingVertical: 12, marginHorizontal: 20, borderRadius: 12, marginTop: 16 },
  lastWinText: { color: colors.textPrimary, fontSize: 14 },
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
  schedinaBlurred: { opacity: 0.7 },
  schedinaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  schedinaStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  schedinaStatusText: { fontSize: 12, fontWeight: '700' },
  schedinaOdds: { fontSize: 16, fontWeight: '700', color: colors.primary },
  schedinaMatches: { marginBottom: 12 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  matchTeams: { color: colors.textPrimary, fontSize: 14 },
  matchBet: { color: colors.textSecondary, fontSize: 14 },
  moreMatches: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  blurOverlay: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, backgroundColor: colors.overlay, borderRadius: 12 },
  blurText: { color: colors.gold, marginTop: 8, fontWeight: '600' },
  schedinaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  schedinaStake: { color: colors.textSecondary, fontSize: 13 },
  schedinaWin: { color: colors.profit, fontSize: 18, fontWeight: '700' },
  schdeinaPotential: { color: colors.textSecondary, fontSize: 13 },
  viewersBar: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  viewersText: { color: colors.textMuted, fontSize: 11 },
  ctaSection: { paddingHorizontal: 20, marginBottom: 24 },
  ctaGradient: { borderRadius: 20, padding: 24, alignItems: 'center' },
  ctaTitle: { fontSize: 22, fontWeight: '800', color: colors.background, marginBottom: 4 },
  ctaSubtitle: { fontSize: 14, color: 'rgba(11, 15, 20, 0.7)', marginBottom: 16 },
  ctaButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30 },
  ctaButtonText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  trustSection: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 24, borderTopWidth: 1, borderTopColor: colors.border, marginHorizontal: 20 },
  trustItem: { alignItems: 'center', gap: 8 },
  trustText: { color: colors.textSecondary, fontSize: 12 },
});
