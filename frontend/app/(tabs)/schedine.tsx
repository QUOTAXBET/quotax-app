import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { schedineAPI, publicAPI } from '../../src/utils/api';
import { colors } from '../../src/utils/theme';
import { Schedina } from '../../src/types';

export default function SchedineAIScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isPremium } = useAuth();
  const [schedine, setSchedine] = useState<Schedina[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userTier = !isAuthenticated ? 'guest' : isPremium ? 'premium' : 'free';

  const fetchData = async () => {
    try {
      const [schedData, statsData] = await Promise.all([schedineAPI.getAll(), publicAPI.getStats()]);
      setSchedine(schedData);
      setStats(statsData);
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const canSeeCard = (index: number): boolean => {
    if (userTier === 'premium') return true;
    if (userTier === 'free') return index < 2;
    return index < 1;
  };

  const getLockText = (): string => {
    if (userTier === 'guest') return 'Registrati gratis per sbloccare';
    return 'Passa a Premium';
  };

  const getLockAction = () => {
    if (userTier === 'guest') router.push('/login');
    else router.push('/subscribe');
  };

  if (loading) return <View style={st.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;

  // Monthly stats mock
  const monthWon = schedine.filter(s => s.status === 'won').length;
  const monthTotal = schedine.length;

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <Text style={st.title}>Schedine AI</Text>
        <View style={st.headerBadge}><Text style={st.headerBadgeText}>{schedine.filter(s => !s.is_locked).length} disponibili</Text></View>
      </View>

      {/* Monthly stats */}
      {stats && (
        <View style={st.monthlyStats}>
          <Ionicons name="trophy" size={18} color={colors.gold} />
          <Text style={st.monthlyText}>
            Questo mese: <Text style={st.monthlyHighlight}>{monthWon} vinte su {monthTotal}</Text> — ROI <Text style={st.monthlyHighlight}>+{stats.roi_7d}%</Text>
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {schedine.map((sch, idx) => {
          const visible = canSeeCard(idx);
          return (
            <View key={sch.schedina_id} style={st.schedina}>
              <View style={st.schHeader}>
                <View style={st.statusContainer}>
                  {sch.status === 'won' && <View style={[st.statusBadge, st.statusWon]}><Ionicons name="checkmark-circle" size={13} color={colors.background} /><Text style={st.statusText}>VINTA</Text></View>}
                  {sch.status === 'lost' && <View style={[st.statusBadge, st.statusLost]}><Ionicons name="close-circle" size={13} color={colors.background} /><Text style={st.statusText}>PERSA</Text></View>}
                  {sch.status === 'pending' && <View style={[st.statusBadge, st.statusPending]}><Ionicons name="time" size={13} color={colors.background} /><Text style={st.statusText}>IN CORSO</Text></View>}
                  <View style={st.confBadge}><Ionicons name="analytics" size={11} color={colors.primary} /><Text style={st.confText}>{sch.confidence}%</Text></View>
                </View>
                <Text style={st.totalOdds}>@{sch.total_odds.toFixed(2)}</Text>
              </View>

              {visible ? (
                <View style={st.matchesList}>
                  {sch.matches.map((m, i) => (
                    <View key={i} style={st.matchRow}>
                      <View style={st.matchInfo}>
                        <Text style={st.matchLeague}>{m.league}</Text>
                        <Text style={st.matchTeams}>{m.home} - {m.away}</Text>
                      </View>
                      <View style={st.matchBet}>
                        <Text style={st.betType}>{m.bet_type}</Text>
                        <Text style={st.betOdds}>@{m.odds}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <TouchableOpacity style={st.lockedOverlay} onPress={getLockAction} activeOpacity={0.8}>
                  <View style={st.blurLines}>
                    <View style={[st.blurLine, { width: '80%' }]} />
                    <View style={[st.blurLine, { width: '55%' }]} />
                    <View style={[st.blurLine, { width: '70%' }]} />
                  </View>
                  <LinearGradient colors={['transparent', 'rgba(0,255,136,0.12)']} style={st.lockedGradient}>
                    <Ionicons name="lock-open" size={20} color={colors.primary} />
                    <Text style={st.lockedText}>{getLockText()}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <View style={st.schFooter}>
                <View>
                  <Text style={st.footerLabel}>Puntata consigliata</Text>
                  <Text style={st.footerValue}>{'€'}{sch.stake}</Text>
                </View>
                <View style={st.footerRight}>
                  <Text style={st.footerLabel}>{sch.status === 'won' ? 'Vincita' : 'Vincita potenziale'}</Text>
                  <Text style={[st.footerValue, sch.status === 'won' && st.footerWin]}>
                    {sch.status === 'won' ? `+€${sch.actual_win.toFixed(2)}` : `€${sch.potential_win.toFixed(2)}`}
                  </Text>
                </View>
              </View>

              {sch.viewers && (
                <View style={st.viewersBar}><Ionicons name="eye" size={12} color={colors.textMuted} /><Text style={st.viewersText}>{sch.viewers} persone stanno guardando</Text></View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  headerBadge: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  headerBadgeText: { color: colors.background, fontSize: 12, fontWeight: '700' },
  monthlyStats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, padding: 12, backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)', marginBottom: 8 },
  monthlyText: { color: colors.textSecondary, fontSize: 13, flex: 1 },
  monthlyHighlight: { color: colors.gold, fontWeight: '700' },
  scrollContent: { padding: 20, paddingTop: 8 },
  schedina: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  schHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  statusWon: { backgroundColor: colors.primary },
  statusLost: { backgroundColor: colors.loss },
  statusPending: { backgroundColor: '#FFB800' },
  statusText: { color: colors.background, fontSize: 10, fontWeight: '700' },
  confBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  totalOdds: { fontSize: 18, fontWeight: '800', color: colors.primary },
  matchesList: { marginBottom: 14 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  matchInfo: { flex: 1 },
  matchLeague: { color: colors.textMuted, fontSize: 10, marginBottom: 2 },
  matchTeams: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  matchBet: { alignItems: 'flex-end' },
  betType: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  betOdds: { color: colors.primary, fontSize: 12 },
  lockedOverlay: { position: 'relative', marginBottom: 14, borderRadius: 12, overflow: 'hidden' },
  blurLines: { backgroundColor: colors.background, padding: 16, gap: 8, opacity: 0.2 },
  blurLine: { height: 12, backgroundColor: colors.textMuted, borderRadius: 4 },
  lockedGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', gap: 6 },
  lockedText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  schFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  footerRight: { alignItems: 'flex-end' },
  footerLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 2 },
  footerValue: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  footerWin: { color: colors.primary },
  viewersBar: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  viewersText: { color: colors.textMuted, fontSize: 10 },
});
