import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { opportunitiesAPI } from '../../src/utils/api';
import { colors } from '../../src/utils/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function TopPicksScreen() {
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
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fetchData = async () => {
    try { setData(await opportunitiesAPI.getDaily()); } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const getSportIcon = (sport: string) => sport === 'soccer' ? 'football' : sport === 'nba' ? 'basketball' : 'fitness';
  const getSportLabel = (sport: string) => sport === 'soccer' ? 'CALCIO' : sport === 'nba' ? 'NBA' : 'UFC';
  const getOutcomeLabel = (o: string, h: string, a: string) => o === 'home' ? h : o === 'away' ? a : 'Pareggio';
  const getRiskColor = (r: string) => r === 'low' ? colors.primary : r === 'medium' ? '#FFB800' : colors.loss;

  const canSeeCard = (index: number): 'full' | 'partial' | 'locked' => {
    if (userTier === 'premium') return 'full';
    if (userTier === 'free') return index === 0 ? 'full' : index === 1 ? 'partial' : 'locked';
    return index === 0 ? 'full' : 'locked';
  };

  if (loading) return <View style={st.loadingContainer}><ActivityIndicator size="large" color={colors.gold} /><Text style={st.loadingText}>Analisi opportunità in corso...</Text></View>;

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <View style={st.headerLeft}>
          <Ionicons name="diamond" size={22} color={colors.gold} />
          <Text style={st.title}>Top Picks</Text>
        </View>
        {data?.date && <Text style={st.dateText}>{data.date}</Text>}
      </View>

      {data?.viewers && (
        <View style={st.fomoBanner}>
          <Ionicons name="eye" size={14} color={colors.primary} />
          <Text style={st.fomoText}><Text style={st.fomoHighlight}>{data.viewers}</Text> utenti stanno consultando</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
        
        {data?.opportunities?.map((opp: any, index: number) => {
          const access = canSeeCard(index);
          return (
            <View key={opp.opportunity_id} style={st.oppCard}>
              {/* Rank Badge */}
              <View style={st.rankBadge}><Text style={st.rankText}>#{opp.rank}</Text></View>

              {/* Header */}
              <View style={st.oppHeader}>
                <View style={st.sportTag}>
                  <Ionicons name={getSportIcon(opp.sport) as any} size={12} color={colors.background} />
                  <Text style={st.sportTagText}>{getSportLabel(opp.sport)}</Text>
                </View>
                <View style={[st.valueBadge, opp.value_rating === 'HIGH VALUE' && st.valueBadgeHigh]}>
                  <Ionicons name="flash" size={11} color={opp.value_rating === 'HIGH VALUE' ? colors.gold : colors.primary} />
                  <Text style={[st.valueBadgeText, opp.value_rating === 'HIGH VALUE' && st.valueBadgeTextHigh]}>{opp.value_rating}</Text>
                </View>
              </View>

              <Text style={st.leagueText}>{opp.league}</Text>
              <Text style={st.matchTeams}>{opp.home_team} vs {opp.away_team}</Text>

              {/* EDGE PERCENTAGE - Always Prominent */}
              <View style={st.edgeBanner}>
                <View style={st.edgeIconWrap}>
                  <Ionicons name="trending-up" size={18} color={colors.primary} />
                </View>
                <View style={st.edgeContent}>
                  <Text style={st.edgeLabel}>Edge sul mercato</Text>
                  <Text style={st.edgePercent}>+{opp.edge_percentage}%</Text>
                </View>
                <View style={st.edgeBar}>
                  <View style={[st.edgeFill, { width: `${Math.min(opp.edge_percentage * 4, 100)}%` }]} />
                </View>
              </View>

              {/* Prediction content */}
              {access === 'full' ? (
                <>
                  <View style={st.predBox}>
                    <View style={st.predRow}>
                      <View style={st.predLeft}>
                        <Text style={st.predLabel}>Scelta AI:</Text>
                        <Text style={st.predOutcome}>{getOutcomeLabel(opp.predicted_outcome, opp.home_team, opp.away_team)}</Text>
                      </View>
                      <View style={st.predOddsBox}><Text style={st.predOdds}>@{opp.odds}</Text></View>
                    </View>

                    <View style={st.probSection}>
                      <View style={st.probHeader}>
                        <Text style={st.probLabel}>Probabilità stimata</Text>
                        <Text style={[st.probValue, { color: getRiskColor(opp.risk_level) }]}>{opp.confidence}%</Text>
                      </View>
                      <View style={st.probBar}><View style={[st.probFill, { width: `${opp.confidence}%`, backgroundColor: getRiskColor(opp.risk_level) }]} /></View>
                    </View>
                  </View>

                  <View style={st.explanationBox}>
                    <Ionicons name="bulb" size={15} color={colors.gold} />
                    <Text style={st.explanationText}>{opp.explanation}</Text>
                  </View>
                </>
              ) : access === 'partial' ? (
                <>
                  <View style={st.predBox}>
                    <View style={st.predRow}>
                      <View style={st.predLeft}>
                        <Text style={st.predLabel}>Scelta AI:</Text>
                        <Text style={st.predOutcome}>{getOutcomeLabel(opp.predicted_outcome, opp.home_team, opp.away_team)}</Text>
                      </View>
                      <View style={st.predOddsBox}><Text style={st.predOdds}>@{opp.odds}</Text></View>
                    </View>
                    <View style={st.probSection}>
                      <View style={st.probHeader}>
                        <Text style={st.probLabel}>Probabilità stimata</Text>
                        <Text style={[st.probValue, { color: getRiskColor(opp.risk_level) }]}>{opp.confidence}%</Text>
                      </View>
                      <View style={st.probBar}><View style={[st.probFill, { width: `${opp.confidence}%`, backgroundColor: getRiskColor(opp.risk_level) }]} /></View>
                    </View>
                  </View>

                  <Animated.View style={[st.lockedExplanation, { transform: [{ scale: pulseAnim }] }]}>
                    <TouchableOpacity style={st.lockedCTA} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/subscribe'); }} activeOpacity={0.8}>
                      <Ionicons name="lock-closed" size={16} color={colors.gold} />
                      <View style={st.lockedCTATextWrap}>
                        <Text style={st.lockedCTATitle}>Analisi completa — Solo Premium</Text>
                        <Text style={st.lockedCTASub}>Sblocca la spiegazione AI dettagliata</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.gold} />
                    </TouchableOpacity>
                  </Animated.View>
                </>
              ) : (
                <View style={st.fullyLocked}>
                  <View style={st.blurredLines}>
                    <View style={[st.blurLine, { width: '75%' }]} />
                    <View style={[st.blurLine, { width: '50%' }]} />
                    <View style={[st.blurLine, { width: '85%' }]} />
                  </View>
                  <Animated.View style={[st.lockedOverlayFull, { transform: [{ scale: pulseAnim }] }]}>
                    <TouchableOpacity style={st.lockedFullCTA} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(userTier === 'guest' ? '/login' : '/subscribe'); }} activeOpacity={0.8}>
                      <Ionicons name="diamond" size={24} color={colors.gold} />
                      <Text style={st.lockedFullTitle}>{userTier === 'guest' ? 'Registrati gratis' : 'Top Pick Premium'}</Text>
                      <Text style={st.lockedFullSub}>{userTier === 'guest' ? 'Sblocca con registrazione' : 'Sblocca con abbonamento'}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              )}

              {/* Risk Level */}
              <View style={st.riskRow}>
                <View style={[st.riskPill, { backgroundColor: getRiskColor(opp.risk_level) + '18' }]}>
                  <View style={[st.riskDot, { backgroundColor: getRiskColor(opp.risk_level) }]} />
                  <Text style={[st.riskPillText, { color: getRiskColor(opp.risk_level) }]}>
                    {opp.risk_level === 'low' ? 'Rischio Basso' : opp.risk_level === 'medium' ? 'Rischio Medio' : 'Rischio Alto'}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Upgrade CTA */}
        {userTier !== 'premium' && (
          <TouchableOpacity style={st.upgradeBanner} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/subscribe'); }}>
            <View style={st.upgradeIcon}><Ionicons name="diamond" size={22} color={colors.gold} /></View>
            <View style={st.upgradeTextWrap}>
              <Text style={st.upgradeTitle}>Sblocca tutti i Top Picks</Text>
              <Text style={st.upgradeSub}>Accesso completo + analisi AI dettagliata</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={26} color={colors.gold} />
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 13 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  dateText: { color: colors.textMuted, fontSize: 12 },
  fomoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(0,255,136,0.06)', borderRadius: 12, marginBottom: 8 },
  fomoText: { color: colors.textSecondary, fontSize: 12 },
  fomoHighlight: { color: colors.primary, fontWeight: '800' },
  scrollContent: { padding: 16, paddingTop: 4 },
  // Card
  oppCard: { backgroundColor: colors.card, borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.border, position: 'relative' },
  rankBadge: { position: 'absolute', top: 14, right: 18, backgroundColor: colors.gold, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: colors.background, fontSize: 12, fontWeight: '900' },
  oppHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sportTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  sportTagText: { color: colors.background, fontSize: 10, fontWeight: '700' },
  valueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,255,136,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,255,136,0.25)' },
  valueBadgeHigh: { backgroundColor: 'rgba(255,215,0,0.1)', borderColor: 'rgba(255,215,0,0.25)' },
  valueBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  valueBadgeTextHigh: { color: colors.gold },
  leagueText: { color: colors.textMuted, fontSize: 11, marginBottom: 3 },
  matchTeams: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 14 },
  // Edge Banner - PROMINENT
  edgeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,255,136,0.06)', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(0,255,136,0.15)', gap: 12 },
  edgeIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,255,136,0.12)', alignItems: 'center', justifyContent: 'center' },
  edgeContent: { flex: 1 },
  edgeLabel: { color: colors.textSecondary, fontSize: 11, marginBottom: 2 },
  edgePercent: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  edgeBar: { width: 50, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  edgeFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  // Prediction
  predBox: { backgroundColor: colors.background, borderRadius: 16, padding: 14, marginBottom: 12 },
  predRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  predLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  predLabel: { color: colors.textSecondary, fontSize: 12 },
  predOutcome: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  predOddsBox: { backgroundColor: 'rgba(0,255,136,0.1)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  predOdds: { color: colors.primary, fontSize: 17, fontWeight: '800' },
  probSection: {},
  probHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  probLabel: { color: colors.textSecondary, fontSize: 11 },
  probValue: { fontSize: 15, fontWeight: '800' },
  probBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  probFill: { height: '100%', borderRadius: 4 },
  // Explanation
  explanationBox: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,215,0,0.05)', padding: 14, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)' },
  explanationText: { color: colors.textSecondary, fontSize: 12, flex: 1, lineHeight: 18 },
  // Locked
  lockedExplanation: { marginBottom: 12 },
  lockedCTA: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,215,0,0.06)', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)', borderStyle: 'dashed' },
  lockedCTATextWrap: { flex: 1 },
  lockedCTATitle: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  lockedCTASub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  fullyLocked: { position: 'relative', marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  blurredLines: { backgroundColor: colors.background, borderRadius: 16, padding: 20, gap: 10, opacity: 0.2 },
  blurLine: { height: 12, backgroundColor: colors.textMuted, borderRadius: 4 },
  lockedOverlayFull: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(11,15,20,0.85)', borderRadius: 16 },
  lockedFullCTA: { alignItems: 'center', gap: 6 },
  lockedFullTitle: { color: colors.gold, fontSize: 16, fontWeight: '800' },
  lockedFullSub: { color: colors.textMuted, fontSize: 12 },
  // Risk
  riskRow: { flexDirection: 'row' },
  riskPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskPillText: { fontSize: 11, fontWeight: '700' },
  // Upgrade
  upgradeBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,215,0,0.06)', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)', marginTop: 8 },
  upgradeIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,215,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  upgradeTextWrap: { flex: 1 },
  upgradeTitle: { color: colors.gold, fontSize: 15, fontWeight: '800' },
  upgradeSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
