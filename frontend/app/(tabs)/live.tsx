import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { liveAPI } from '../../src/utils/api';
import { colors } from '../../src/utils/theme';
import { LiveMatch } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';

export default function LiveScreen() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const data = await liveAPI.getMatches();
      setMatches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); const interval = setInterval(fetchData, 30000); return () => clearInterval(interval); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const isPremium = user?.subscription_tier && !['free', 'base'].includes(user.subscription_tier);

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <Text style={styles.title}>Live</Text>
        </View>
        <Text style={styles.matchCount}>{matches.length} partite</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {matches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="tv-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nessuna partita live</Text>
            <Text style={styles.emptySubtitle}>Torna più tardi per le partite in diretta</Text>
          </View>
        ) : (
          matches.map((match) => (
            <View key={match.match_id} style={[styles.matchCard, match.is_hot && styles.matchCardHot]}>
              {match.is_hot && (
                <View style={styles.hotBadge}>
                  <Ionicons name="flame" size={12} color={colors.background} />
                  <Text style={styles.hotText}>HOT</Text>
                </View>
              )}

              <View style={styles.matchHeader}>
                <Text style={styles.matchLeague}>{match.league}</Text>
                <View style={styles.liveIndicator}>
                  <View style={styles.livePulse} />
                  <Text style={styles.liveText}>LIVE {match.minute}'</Text>
                </View>
              </View>

              <View style={styles.scoreSection}>
                <View style={styles.team}>
                  <Ionicons name="shield" size={28} color={colors.primary} />
                  <Text style={styles.teamName}>{match.home}</Text>
                </View>
                <Text style={styles.score}>{match.score}</Text>
                <View style={styles.team}>
                  <Ionicons name="shield" size={28} color={colors.loss} />
                  <Text style={styles.teamName}>{match.away}</Text>
                </View>
              </View>

              <View style={styles.oddsSection}>
                <View style={styles.oddBox}>
                  <Text style={styles.oddLabel}>1</Text>
                  <Text style={styles.oddValue}>{match.odds_home}</Text>
                  {isPremium && match.odds_trend === 'down' && (
                    <Ionicons name="arrow-down" size={12} color={colors.loss} />
                  )}
                </View>
                {match.odds_draw && (
                  <View style={styles.oddBox}>
                    <Text style={styles.oddLabel}>X</Text>
                    <Text style={styles.oddValue}>{match.odds_draw}</Text>
                  </View>
                )}
                <View style={styles.oddBox}>
                  <Text style={styles.oddLabel}>2</Text>
                  <Text style={styles.oddValue}>{match.odds_away}</Text>
                  {isPremium && match.odds_trend === 'up' && (
                    <Ionicons name="arrow-up" size={12} color={colors.primary} />
                  )}
                </View>
              </View>

              {isPremium && match.alert && (
                <View style={styles.alertBar}>
                  <Ionicons name="warning" size={14} color={colors.pending} />
                  <Text style={styles.alertText}>{match.alert}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.loss },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  matchCount: { color: colors.textSecondary, fontSize: 14 },
  scrollContent: { padding: 20 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  matchCard: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  matchCardHot: { borderColor: colors.loss },
  hotBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.loss, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  hotText: { color: colors.background, fontSize: 10, fontWeight: '700' },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  matchLeague: { color: colors.textSecondary, fontSize: 12 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.loss },
  liveText: { color: colors.loss, fontSize: 12, fontWeight: '700' },
  scoreSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  team: { flex: 1, alignItems: 'center', gap: 8 },
  teamName: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  score: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  oddsSection: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  oddBox: { flex: 1, backgroundColor: colors.secondary, borderRadius: 12, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  oddLabel: { color: colors.textSecondary, fontSize: 12 },
  oddValue: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  alertBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  alertText: { color: colors.pending, fontSize: 12 },
});
