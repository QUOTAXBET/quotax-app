import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { schedineAPI } from '../../src/utils/api';
import { colors } from '../../src/utils/theme';
import { Schedina } from '../../src/types';

export default function SchedineScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [schedine, setSchedine] = useState<Schedina[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const data = await schedineAPI.getAll();
      setSchedine(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedine</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{schedine.filter(s => !s.is_locked).length} disponibili</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {schedine.map((sch) => (
          <View key={sch.schedina_id} style={[styles.schedina, sch.is_locked && styles.schedinaLocked]}>
            {/* Status Header */}
            <View style={styles.schedinaHeader}>
              <View style={styles.statusContainer}>
                {sch.status === 'won' && (
                  <View style={[styles.statusBadge, styles.statusWon]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.background} />
                    <Text style={styles.statusText}>VINTA</Text>
                  </View>
                )}
                {sch.status === 'lost' && (
                  <View style={[styles.statusBadge, styles.statusLost]}>
                    <Ionicons name="close-circle" size={14} color={colors.background} />
                    <Text style={styles.statusText}>PERSA</Text>
                  </View>
                )}
                {sch.status === 'pending' && (
                  <View style={[styles.statusBadge, styles.statusPending]}>
                    <Ionicons name="time" size={14} color={colors.background} />
                    <Text style={styles.statusText}>IN CORSO</Text>
                  </View>
                )}
                <Text style={styles.confidence}>{sch.confidence}% sicurezza</Text>
              </View>
              <Text style={styles.totalOdds}>@{sch.total_odds.toFixed(2)}</Text>
            </View>

            {/* Matches */}
            {!sch.is_locked ? (
              <View style={styles.matchesList}>
                {sch.matches.map((m, idx) => (
                  <View key={idx} style={styles.matchRow}>
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchLeague}>{m.league}</Text>
                      <Text style={styles.matchTeams}>{m.home} - {m.away}</Text>
                    </View>
                    <View style={styles.matchBet}>
                      <Text style={styles.betType}>{m.bet_type}</Text>
                      <Text style={styles.betOdds}>@{m.odds}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <TouchableOpacity style={styles.lockedOverlay} onPress={() => router.push('/subscribe')}>
                <Ionicons name="lock-closed" size={28} color={colors.gold} />
                <Text style={styles.lockedTitle}>Contenuto Premium</Text>
                <Text style={styles.lockedSubtitle}>Sblocca per vedere questa schedina</Text>
              </TouchableOpacity>
            )}

            {/* Footer */}
            <View style={styles.schedinaFooter}>
              <View>
                <Text style={styles.footerLabel}>Puntata</Text>
                <Text style={styles.footerValue}>€{sch.stake}</Text>
              </View>
              <View style={styles.footerRight}>
                <Text style={styles.footerLabel}>{sch.status === 'won' ? 'Vincita' : 'Potenziale'}</Text>
                <Text style={[
                  styles.footerValue,
                  sch.status === 'won' && styles.footerWin
                ]}>
                  {sch.status === 'won' ? `+€${sch.actual_win.toFixed(2)}` : `€${sch.potential_win.toFixed(2)}`}
                </Text>
              </View>
            </View>

            {/* Viewers FOMO */}
            {sch.viewers && (
              <View style={styles.viewersBar}>
                <Ionicons name="eye" size={12} color={colors.textMuted} />
                <Text style={styles.viewersText}>{sch.viewers} persone stanno guardando</Text>
              </View>
            )}
          </View>
        ))}

        {/* Upgrade CTA */}
        {user?.subscription_tier === 'free' && (
          <TouchableOpacity style={styles.upgradeCta} onPress={() => router.push('/subscribe')}>
            <Ionicons name="diamond" size={20} color={colors.gold} />
            <Text style={styles.upgradeCtaText}>Sblocca tutte le schedine</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.gold} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  headerBadge: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  headerBadgeText: { color: colors.background, fontSize: 12, fontWeight: '700' },
  scrollContent: { padding: 20 },
  schedina: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  schedinaLocked: { opacity: 0.8 },
  schedinaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusWon: { backgroundColor: colors.primary },
  statusLost: { backgroundColor: colors.loss },
  statusPending: { backgroundColor: colors.pending },
  statusText: { color: colors.background, fontSize: 11, fontWeight: '700' },
  confidence: { color: colors.textSecondary, fontSize: 12 },
  totalOdds: { fontSize: 20, fontWeight: '800', color: colors.primary },
  matchesList: { marginBottom: 16 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  matchInfo: { flex: 1 },
  matchLeague: { color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  matchTeams: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  matchBet: { alignItems: 'flex-end' },
  betType: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  betOdds: { color: colors.primary, fontSize: 13 },
  lockedOverlay: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: 'rgba(255, 215, 0, 0.05)', borderRadius: 16, marginBottom: 16 },
  lockedTitle: { color: colors.gold, fontSize: 16, fontWeight: '700', marginTop: 12 },
  lockedSubtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  schedinaFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  footerRight: { alignItems: 'flex-end' },
  footerLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  footerValue: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  footerWin: { color: colors.primary },
  viewersBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  viewersText: { color: colors.textMuted, fontSize: 11 },
  upgradeCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.gold },
  upgradeCtaText: { color: colors.gold, fontSize: 14, fontWeight: '600' },
});
