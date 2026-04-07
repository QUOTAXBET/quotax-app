import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { opportunitiesAPI } from '../../src/utils/api';
import { colors } from '../../src/utils/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function OpportunitaScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isPremium } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const userTier = !isAuthenticated ? 'guest' : isPremium ? 'premium' : 'free';

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fetchData = async () => {
    try {
      const result = await opportunitiesAPI.getDaily();
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'soccer': return 'football';
      case 'nba': return 'basketball';
      case 'ufc': return 'fitness';
      default: return 'trophy';
    }
  };

  const getSportLabel = (sport: string) => {
    switch (sport) {
      case 'soccer': return 'CALCIO';
      case 'nba': return 'NBA';
      case 'ufc': return 'UFC';
      default: return sport.toUpperCase();
    }
  };

  const getOutcomeLabel = (outcome: string, home: string, away: string) => {
    switch (outcome) {
      case 'home': return home;
      case 'away': return away;
      case 'draw': return 'Pareggio';
      default: return outcome;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return colors.primary;
      case 'medium': return colors.pending;
      case 'high': return colors.loss;
      default: return colors.textMuted;
    }
  };

  // Access logic per tier
  const canSeeCard = (index: number): 'full' | 'partial' | 'locked' => {
    if (userTier === 'premium') return 'full';
    if (userTier === 'free') return index === 0 ? 'full' : index === 1 ? 'partial' : 'locked';
    // guest: first = full, rest locked with registration CTA
    return index === 0 ? 'full' : 'locked';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Analisi opportunità in corso...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="star" size={24} color={colors.gold} />
          <Text style={styles.title}>Top Picks AI</Text>
        </View>
        {data?.date && <Text style={styles.dateText}>{data.date}</Text>}
      </View>

      {/* FOMO Bar */}
      {data?.viewers && (
        <View style={styles.fomoBanner}>
          <Ionicons name="eye" size={16} color={colors.primary} />
          <Text style={styles.fomoText}>
            <Text style={styles.fomoHighlight}>{data.viewers}</Text> utenti stanno consultando le opportunità
          </Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {/* Intro */}
        <View style={styles.introCard}>
          <Ionicons name="sparkles" size={20} color={colors.gold} />
          <Text style={styles.introText}>
            Le migliori giocate selezionate dal nostro modello AI. Aggiornate ogni giorno.
          </Text>
        </View>

        {/* Opportunities */}
        {data?.opportunities?.map((opp: any, index: number) => {
          const access = canSeeCard(index);
          return (
            <View key={opp.opportunity_id} style={styles.oppCard}>
              {/* Rank Badge */}
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{opp.rank}</Text>
              </View>

              {/* Header row */}
              <View style={styles.oppHeader}>
                <View style={styles.sportTag}>
                  <Ionicons name={getSportIcon(opp.sport) as any} size={12} color={colors.background} />
                  <Text style={styles.sportTagText}>{getSportLabel(opp.sport)}</Text>
                </View>
                <View style={[styles.valueBadge, opp.value_rating === 'HIGH VALUE' && styles.valueBadgeHigh]}>
                  <Ionicons name="flash" size={12} color={opp.value_rating === 'HIGH VALUE' ? colors.gold : colors.primary} />
                  <Text style={[styles.valueBadgeText, opp.value_rating === 'HIGH VALUE' && styles.valueBadgeTextHigh]}>
                    {opp.value_rating}
                  </Text>
                </View>
              </View>

              {/* Match Info */}
              <Text style={styles.leagueText}>{opp.league}</Text>
              <View style={styles.matchRow}>
                <Text style={styles.matchTeams}>{opp.home_team} vs {opp.away_team}</Text>
              </View>

              {/* Prediction - visible or blurred */}
              {access === 'full' ? (
                <>
                  <View style={styles.predictionBox}>
                    <View style={styles.predRow}>
                      <View style={styles.predLeft}>
                        <Text style={styles.predLabel}>Scelta AI:</Text>
                        <Text style={styles.predOutcome}>
                          {getOutcomeLabel(opp.predicted_outcome, opp.home_team, opp.away_team)}
                        </Text>
                      </View>
                      <Text style={styles.predOdds}>@{opp.odds}</Text>
                    </View>

                    {/* Probability bar */}
                    <View style={styles.probSection}>
                      <View style={styles.probHeader}>
                        <Text style={styles.probLabel}>Probabilità stimata</Text>
                        <Text style={[styles.probValue, { color: getRiskColor(opp.risk_level) }]}>{opp.confidence}%</Text>
                      </View>
                      <View style={styles.probBar}>
                        <View style={[styles.probFill, { width: `${opp.confidence}%`, backgroundColor: getRiskColor(opp.risk_level) }]} />
                      </View>
                    </View>

                    {/* Edge */}
                    <View style={styles.edgeRow}>
                      <Text style={styles.edgeLabel}>Edge sul mercato:</Text>
                      <Text style={styles.edgeValue}>+{opp.edge_percentage}%</Text>
                    </View>
                  </View>

                  {/* Explanation */}
                  <View style={styles.explanationBox}>
                    <Ionicons name="bulb" size={16} color={colors.gold} />
                    <Text style={styles.explanationText}>{opp.explanation}</Text>
                  </View>
                </>
              ) : access === 'partial' ? (
                <>
                  <View style={styles.predictionBox}>
                    <View style={styles.predRow}>
                      <View style={styles.predLeft}>
                        <Text style={styles.predLabel}>Scelta AI:</Text>
                        <Text style={styles.predOutcome}>
                          {getOutcomeLabel(opp.predicted_outcome, opp.home_team, opp.away_team)}
                        </Text>
                      </View>
                      <Text style={styles.predOdds}>@{opp.odds}</Text>
                    </View>

                    <View style={styles.probSection}>
                      <View style={styles.probHeader}>
                        <Text style={styles.probLabel}>Probabilità stimata</Text>
                        <Text style={[styles.probValue, { color: getRiskColor(opp.risk_level) }]}>{opp.confidence}%</Text>
                      </View>
                      <View style={styles.probBar}>
                        <View style={[styles.probFill, { width: `${opp.confidence}%`, backgroundColor: getRiskColor(opp.risk_level) }]} />
                      </View>
                    </View>
                  </View>

                  {/* Locked explanation */}
                  <Animated.View style={[styles.lockedExplanation, { transform: [{ scale: pulseAnim }] }]}>
                    <TouchableOpacity style={styles.lockedCTA} onPress={() => router.push('/subscribe')} activeOpacity={0.8}>
                      <Ionicons name="lock-closed" size={16} color={colors.gold} />
                      <View style={styles.lockedCTATextWrap}>
                        <Text style={styles.lockedCTATitle}>Analisi completa bloccata</Text>
                        <Text style={styles.lockedCTASub}>Passa a Premium per l'analisi dettagliata</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.gold} />
                    </TouchableOpacity>
                  </Animated.View>
                </>
              ) : (
                /* Fully Locked */
                <View style={styles.fullyLocked}>
                  <View style={styles.blurredLines}>
                    <View style={[styles.blurLine, { width: '75%' }]} />
                    <View style={[styles.blurLine, { width: '50%' }]} />
                    <View style={[styles.blurLine, { width: '85%' }]} />
                    <View style={[styles.blurLine, { width: '40%' }]} />
                  </View>
                  <Animated.View style={[styles.lockedOverlayFull, { transform: [{ scale: pulseAnim }] }]}>
                    <TouchableOpacity style={styles.lockedFullCTA} onPress={() => router.push(userTier === 'guest' ? '/login' : '/subscribe')} activeOpacity={0.8}>
                      <Ionicons name="diamond" size={24} color={colors.gold} />
                      <Text style={styles.lockedFullTitle}>{userTier === 'guest' ? 'Sblocca gratis con registrazione' : 'Top Pick Premium'}</Text>
                      <Text style={styles.lockedFullSub}>{userTier === 'guest' ? 'Registrati in 30 secondi' : 'Sblocca con abbonamento'}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              )}

              {/* Risk Level */}
              <View style={styles.riskRow}>
                <View style={[styles.riskPill, { backgroundColor: getRiskColor(opp.risk_level) + '20' }]}>
                  <View style={[styles.riskDot, { backgroundColor: getRiskColor(opp.risk_level) }]} />
                  <Text style={[styles.riskPillText, { color: getRiskColor(opp.risk_level) }]}>
                    {opp.risk_level === 'low' ? 'Rischio Basso' : opp.risk_level === 'medium' ? 'Rischio Medio' : 'Rischio Alto'}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Upgrade CTA */}
        {userTier !== 'premium' && (
          <TouchableOpacity style={styles.upgradeBanner} onPress={() => router.push('/subscribe')}>
            <View style={styles.upgradeIcon}>
              <Ionicons name="diamond" size={24} color={colors.gold} />
            </View>
            <View style={styles.upgradeTextWrap}>
              <Text style={styles.upgradeTitle}>Sblocca tutte le opportunità</Text>
              <Text style={styles.upgradeSub}>Accesso completo + analisi AI dettagliata</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color={colors.gold} />
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  dateText: { color: colors.textMuted, fontSize: 13 },
  fomoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(0, 255, 136, 0.08)', borderRadius: 10, marginBottom: 8 },
  fomoText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  fomoHighlight: { color: colors.primary, fontWeight: '800' },
  scrollContent: { padding: 16, paddingTop: 4 },
  introCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255, 215, 0, 0.08)', padding: 14, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.15)' },
  introText: { color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 19 },
  // Opportunity Card
  oppCard: { backgroundColor: colors.card, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.border, position: 'relative' },
  rankBadge: { position: 'absolute', top: 14, right: 18, backgroundColor: colors.gold, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: colors.background, fontSize: 12, fontWeight: '800' },
  oppHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sportTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  sportTagText: { color: colors.background, fontSize: 10, fontWeight: '700' },
  valueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0, 255, 136, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0, 255, 136, 0.3)' },
  valueBadgeHigh: { backgroundColor: 'rgba(255, 215, 0, 0.12)', borderColor: 'rgba(255, 215, 0, 0.3)' },
  valueBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  valueBadgeTextHigh: { color: colors.gold },
  leagueText: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  matchRow: { marginBottom: 14 },
  matchTeams: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  // Prediction Box
  predictionBox: { backgroundColor: colors.background, borderRadius: 14, padding: 14, marginBottom: 12 },
  predRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  predLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  predLabel: { color: colors.textSecondary, fontSize: 12 },
  predOutcome: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  predOdds: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  probSection: { marginBottom: 10 },
  probHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  probLabel: { color: colors.textSecondary, fontSize: 11 },
  probValue: { fontSize: 15, fontWeight: '800' },
  probBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  probFill: { height: '100%', borderRadius: 4 },
  edgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  edgeLabel: { color: colors.textSecondary, fontSize: 12 },
  edgeValue: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  // Explanation
  explanationBox: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255, 215, 0, 0.06)', padding: 12, borderRadius: 12, marginBottom: 12 },
  explanationText: { color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 19 },
  // Locked explanation
  lockedExplanation: { marginBottom: 12 },
  lockedCTA: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255, 215, 0, 0.08)', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.25)', borderStyle: 'dashed' },
  lockedCTATextWrap: { flex: 1 },
  lockedCTATitle: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  lockedCTASub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  // Fully locked
  fullyLocked: { position: 'relative', marginBottom: 12, borderRadius: 14, overflow: 'hidden' },
  blurredLines: { backgroundColor: colors.background, borderRadius: 14, padding: 20, gap: 10, opacity: 0.25 },
  blurLine: { height: 12, backgroundColor: colors.textMuted, borderRadius: 4 },
  lockedOverlayFull: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(11, 15, 20, 0.8)', borderRadius: 14 },
  lockedFullCTA: { alignItems: 'center', gap: 6 },
  lockedFullTitle: { color: colors.gold, fontSize: 16, fontWeight: '800' },
  lockedFullSub: { color: colors.textMuted, fontSize: 12 },
  // Risk
  riskRow: { flexDirection: 'row' },
  riskPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskPillText: { fontSize: 11, fontWeight: '700' },
  // Upgrade
  upgradeBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255, 215, 0, 0.08)', padding: 18, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)', marginTop: 8 },
  upgradeIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255, 215, 0, 0.15)', alignItems: 'center', justifyContent: 'center' },
  upgradeTextWrap: { flex: 1 },
  upgradeTitle: { color: colors.gold, fontSize: 15, fontWeight: '800' },
  upgradeSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
