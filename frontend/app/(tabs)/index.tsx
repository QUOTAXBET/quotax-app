import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Animated, Easing, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { matchesAPI, socialAPI } from '../../src/utils/api';
import { colors } from '../../src/utils/theme';
import SportFilter from '../../src/components/SportFilter';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Selection { matchId: string; betType: string; odds: number; label: string; matchLabel: string; }

export default function PartiteScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isPremium, refreshUser } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [stats, setStats] = useState<any>(null);
  const [social, setSocial] = useState<any>(null);
  const [selectedSport, setSelectedSport] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Schedina builder
  const [selections, setSelections] = useState<Selection[]>([]);
  const [showSchedina, setShowSchedina] = useState(false);
  const [stakeInput, setStakeInput] = useState('10');
  const barAnim = useRef(new Animated.Value(0)).current;

  const fetchData = async (sport: string) => {
    try {
      const [matchData, predData, statsData, socialData] = await Promise.all([
        sport === 'all' ? matchesAPI.getAll() : matchesAPI.getBySport(sport),
        sport === 'all' ? matchesAPI.getPredictions() : matchesAPI.getPredictionsBySport(sport),
        matchesAPI.getStats(),
        socialAPI.getActivity(),
      ]);
      setMatches(matchData);
      const predMap: Record<string, any> = {};
      predData.forEach((p: any) => { predMap[p.match_id] = p; });
      setPredictions(predMap);
      setStats(statsData);
      setSocial(socialData);
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(selectedSport); }, [selectedSport]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(selectedSport); }, [selectedSport]);

  // Animate bar when selections change
  useEffect(() => {
    Animated.timing(barAnim, { toValue: selections.length > 0 ? 1 : 0, duration: 300, useNativeDriver: true }).start();
  }, [selections.length]);

  const toggleSelection = (matchId: string, betType: string, odds: number, label: string, matchLabel: string) => {
    setSelections(prev => {
      const exists = prev.find(s => s.matchId === matchId);
      if (exists) {
        if (exists.betType === betType) return prev.filter(s => s.matchId !== matchId);
        return prev.map(s => s.matchId === matchId ? { ...s, betType, odds, label } : s);
      }
      return [...prev, { matchId, betType, odds, label, matchLabel }];
    });
  };

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialWin = parseFloat(stakeInput || '0') * totalOdds;

  const getSportIcon = (sport: string) => sport === 'soccer' ? 'football' : sport === 'nba' ? 'basketball' : 'fitness';
  const getSportLabel = (sport: string) => sport === 'soccer' ? 'CALCIO' : sport === 'nba' ? 'NBA' : 'UFC';
  const getRiskColor = (risk: string) => risk === 'low' ? colors.primary : risk === 'medium' ? '#FFB800' : colors.loss;
  const getRiskLabel = (risk: string) => risk === 'low' ? 'SICURO' : risk === 'medium' ? 'MEDIO' : 'RISCHIOSO';
  const getOutcomeLabel = (o: string, h: string, a: string) => o === 'home' ? h : o === 'away' ? a : 'Pareggio';

  if (loading) return <View style={s.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.logo}><Ionicons name="trending-up" size={24} color={colors.primary} /><Text style={s.logoText}>EdgeBet</Text></View>
        {!isAuthenticated ? (
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/login')}><Text style={s.loginBtnText}>Accedi</Text></TouchableOpacity>
        ) : (
          <View style={s.userBadge}><Text style={s.userBadgeText}>{user?.name?.split(' ')[0]}</Text></View>
        )}
      </View>

      {/* Stats */}
      {stats && (
        <View style={s.statsBanner}>
          <View style={s.statItem}><Text style={s.statValue}>+{stats.roi_7d}%</Text><Text style={s.statLabel}>ROI 7gg</Text></View>
          <View style={s.statDivider} />
          <View style={s.statItem}><Text style={s.statValue}>{stats.win_rate}%</Text><Text style={s.statLabel}>Win Rate</Text></View>
          <View style={s.statDivider} />
          <View style={s.statItem}><Text style={s.statValue}>{stats.streak}</Text><Text style={s.statLabel}>Serie</Text></View>
          {social && (<><View style={s.statDivider} /><View style={s.statItem}><View style={s.liveRow}><View style={s.liveDot} /><Text style={s.statValue}>{social.viewing_now}</Text></View><Text style={s.statLabel}>Online</Text></View></>)}
        </View>
      )}

      {/* Social ticker */}
      {social?.activities?.[0] && (
        <View style={s.socialTicker}>
          <Ionicons name="flash" size={14} color={colors.primary} />
          <Text style={s.socialTickerText}>{social.activities[0].user} ha vinto +€{social.activities[0].amount?.toFixed(0)} - {social.activities[0].time}</Text>
        </View>
      )}

      <SportFilter selected={selectedSport} onSelect={setSelectedSport} />

      <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />} contentContainerStyle={{ paddingBottom: selections.length > 0 ? 80 : 20 }}>
        <View style={s.content}>
          {matches.map((match, index) => {
            const pred = predictions[match.match_id];
            const shouldLock = isPremium ? false : !isAuthenticated ? (index % 10 >= 3) : (index % 5 >= 3);
            const selected = selections.find(sel => sel.matchId === match.match_id);
            const matchDate = new Date(match.match_date);

            return (
              <View key={match.match_id} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.sportBadge}><Ionicons name={getSportIcon(match.sport) as any} size={13} color={colors.background} /><Text style={s.sportText}>{getSportLabel(match.sport)}</Text></View>
                  <View style={s.cardHeaderRight}>
                    {pred && !shouldLock && pred.confidence > 75 && (
                      <View style={s.aiBadge}><Text style={s.aiBadgeText}>AI ✓</Text></View>
                    )}
                    <Text style={s.league}>{match.league}</Text>
                  </View>
                </View>

                <View style={s.teams}>
                  <View style={s.team}><Ionicons name="shield" size={30} color={colors.primary} /><Text style={s.teamName} numberOfLines={2}>{match.home_team}</Text></View>
                  <View style={s.vsBox}><Text style={s.vs}>VS</Text><Text style={s.matchDate}>{format(matchDate, 'd MMM', { locale: it })}</Text><Text style={s.matchTime}>{format(matchDate, 'HH:mm')}</Text></View>
                  <View style={s.team}><Ionicons name="shield" size={30} color={colors.loss} /><Text style={s.teamName} numberOfLines={2}>{match.away_team}</Text></View>
                </View>

                {/* Clickable Odds */}
                <View style={s.odds}>
                  <TouchableOpacity style={[s.oddsItem, selected?.betType === 'home' && s.oddsSelected]} onPress={() => toggleSelection(match.match_id, 'home', match.odds_home, match.home_team, `${match.home_team} vs ${match.away_team}`)}>
                    <Text style={s.oddsLabel}>1</Text><Text style={[s.oddsValue, selected?.betType === 'home' && s.oddsValueSelected]}>{match.odds_home}</Text>
                  </TouchableOpacity>
                  {match.odds_draw && (
                    <TouchableOpacity style={[s.oddsItem, selected?.betType === 'draw' && s.oddsSelected]} onPress={() => toggleSelection(match.match_id, 'draw', match.odds_draw, 'Pareggio', `${match.home_team} vs ${match.away_team}`)}>
                      <Text style={s.oddsLabel}>X</Text><Text style={[s.oddsValue, selected?.betType === 'draw' && s.oddsValueSelected]}>{match.odds_draw}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[s.oddsItem, selected?.betType === 'away' && s.oddsSelected]} onPress={() => toggleSelection(match.match_id, 'away', match.odds_away, match.away_team, `${match.home_team} vs ${match.away_team}`)}>
                    <Text style={s.oddsLabel}>2</Text><Text style={[s.oddsValue, selected?.betType === 'away' && s.oddsValueSelected]}>{match.odds_away}</Text>
                  </TouchableOpacity>
                </View>

                {/* AI Prediction */}
                {pred && !shouldLock && (
                  <View style={s.prediction}>
                    <View style={s.predHeader}>
                      <Ionicons name="analytics" size={15} color={colors.primary} />
                      <Text style={s.predTitle}>Pronostico AI</Text>
                      <View style={[s.riskBadge, { backgroundColor: getRiskColor(pred.risk_level) + '25' }]}>
                        <Text style={[s.riskText, { color: getRiskColor(pred.risk_level) }]}>{getRiskLabel(pred.risk_level)}</Text>
                      </View>
                    </View>
                    <View style={s.predOutcomeRow}>
                      <Text style={s.predLabel}>Scelta:</Text>
                      <Text style={s.predOutcome}>{getOutcomeLabel(pred.predicted_outcome, match.home_team, match.away_team)}</Text>
                      <Text style={s.predOdds}>@{pred.odds}</Text>
                    </View>
                    <View style={s.confRow}>
                      <Text style={s.confLabel}>Affidabilità</Text>
                      <View style={s.confBar}><View style={[s.confFill, { width: `${pred.confidence}%`, backgroundColor: getRiskColor(pred.risk_level) }]} /></View>
                      <Text style={[s.confValue, { color: getRiskColor(pred.risk_level) }]}>{pred.confidence}%</Text>
                    </View>
                    {pred.ai_motivation && <Text style={s.motivation}>{pred.ai_motivation}</Text>}
                  </View>
                )}

                {/* Locked */}
                {shouldLock && (
                  <TouchableOpacity style={s.locked} onPress={() => router.push(isAuthenticated ? '/subscribe' : '/login')} activeOpacity={0.8}>
                    <View style={s.blurLines}><View style={[s.blurLine, { width: '75%' }]} /><View style={[s.blurLine, { width: '50%' }]} /><View style={[s.blurLine, { width: '85%' }]} /></View>
                    <View style={s.lockedOverlay}>
                      <Ionicons name="lock-closed" size={18} color={colors.gold} />
                      <Text style={s.lockedTitle}>Pronostico Premium</Text>
                      <Text style={s.lockedSub}>Sblocca con abbonamento</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* FOMO */}
                <View style={s.fomoBar}>
                  <View style={s.fomoLeft}><Ionicons name="eye" size={13} color={colors.primary} /><Text style={s.fomoText}>{Math.floor(Math.random() * 25) + 10} stanno guardando</Text></View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Schedina Bar */}
      {selections.length > 0 && (
        <Animated.View style={[s.schedinaBar, { transform: [{ translateY: barAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] }]}>
          <TouchableOpacity style={s.schedinaBarInner} onPress={() => setShowSchedina(true)} activeOpacity={0.9}>
            <View style={s.schedinaBarLeft}>
              <View style={s.selCount}><Text style={s.selCountText}>{selections.length}</Text></View>
              <Text style={s.schedinaBarText}>La tua Schedina</Text>
            </View>
            <Text style={s.schedinaBarOdds}>Quota: {totalOdds.toFixed(2)}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.background} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Schedina Detail Modal */}
      <Modal visible={showSchedina} transparent animationType="slide" onRequestClose={() => setShowSchedina(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>La tua Schedina</Text>
                <TouchableOpacity onPress={() => setShowSchedina(false)}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                {selections.map((sel, i) => (
                  <View key={sel.matchId} style={s.selRow}>
                    <View style={s.selInfo}>
                      <Text style={s.selMatch}>{sel.matchLabel}</Text>
                      <Text style={s.selBet}>{sel.label} @{sel.odds}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelections(prev => prev.filter(x => x.matchId !== sel.matchId))}>
                      <Ionicons name="close-circle" size={22} color={colors.loss} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <View style={s.modalDivider} />
              <View style={s.quotaRow}><Text style={s.quotaLabel}>Quota totale</Text><Text style={s.quotaValue}>{totalOdds.toFixed(2)}</Text></View>

              <Text style={s.importoLabel}>Importo ipotetico (€)</Text>
              <TextInput style={s.importoInput} value={stakeInput} onChangeText={setStakeInput} keyboardType="decimal-pad" placeholder="10" placeholderTextColor={colors.textMuted} />

              <View style={s.quickStakes}>
                {[5, 10, 25, 50].map(a => (
                  <TouchableOpacity key={a} style={[s.quickStake, stakeInput === a.toString() && s.quickStakeActive]} onPress={() => setStakeInput(a.toString())}>
                    <Text style={[s.quickStakeText, stakeInput === a.toString() && s.quickStakeTextActive]}>€{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.winRow}>
                <Text style={s.winLabel}>Vincita potenziale</Text>
                <Text style={s.winValue}>€{potentialWin.toFixed(2)}</Text>
              </View>

              <Text style={s.disclaimer}>Simulazione a scopo dimostrativo. Nessuna scommessa reale.</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  loginBtn: { backgroundColor: colors.secondary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 16 },
  loginBtnText: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  userBadge: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  userBadgeText: { color: colors.background, fontWeight: '700', fontSize: 13 },
  statsBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.card, paddingVertical: 12, paddingHorizontal: 8, marginHorizontal: 16, borderRadius: 14 },
  statItem: { alignItems: 'center' },
  statValue: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  socialTicker: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(0,255,136,0.08)', borderRadius: 10, marginTop: 8 },
  socialTickerText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  // Card
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiBadge: { backgroundColor: 'rgba(0,255,136,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,255,136,0.4)' },
  aiBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  sportBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, gap: 4 },
  sportText: { color: colors.background, fontSize: 10, fontWeight: '700' },
  league: { color: colors.textSecondary, fontSize: 11 },
  teams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  team: { flex: 1, alignItems: 'center', gap: 6 },
  teamName: { color: colors.textPrimary, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  vsBox: { alignItems: 'center', paddingHorizontal: 10 },
  vs: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  matchDate: { color: colors.textSecondary, fontSize: 10, marginTop: 3 },
  matchTime: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  // Clickable odds
  odds: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.background, borderRadius: 12, padding: 10, marginBottom: 10 },
  oddsItem: { alignItems: 'center', flex: 1, paddingVertical: 6, borderRadius: 10, borderWidth: 2, borderColor: 'transparent', marginHorizontal: 3 },
  oddsSelected: { borderColor: colors.primary, backgroundColor: 'rgba(0,255,136,0.1)' },
  oddsLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 2 },
  oddsValue: { color: colors.primary, fontSize: 17, fontWeight: '800' },
  oddsValueSelected: { color: colors.primary },
  // Prediction
  prediction: { backgroundColor: colors.background, borderRadius: 12, padding: 12 },
  predHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  predTitle: { color: colors.primary, fontSize: 12, fontWeight: '600', flex: 1 },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  riskText: { fontSize: 9, fontWeight: '700' },
  predOutcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  predLabel: { color: colors.textSecondary, fontSize: 12 },
  predOutcome: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  predOdds: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  confLabel: { color: colors.textSecondary, fontSize: 10, width: 65 },
  confBar: { flex: 1, height: 5, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  confFill: { height: '100%', borderRadius: 3 },
  confValue: { fontSize: 12, fontWeight: '700', width: 40, textAlign: 'right' },
  motivation: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  // Locked
  locked: { borderRadius: 12, overflow: 'hidden', position: 'relative' },
  blurLines: { backgroundColor: colors.background, borderRadius: 12, padding: 16, gap: 8, opacity: 0.2 },
  blurLine: { height: 12, backgroundColor: colors.textMuted, borderRadius: 4 },
  lockedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(11,15,20,0.8)', borderRadius: 12, gap: 4 },
  lockedTitle: { color: colors.gold, fontSize: 14, fontWeight: '700' },
  lockedSub: { color: colors.textMuted, fontSize: 11 },
  // FOMO
  fomoBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  fomoLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fomoText: { color: colors.textMuted, fontSize: 11 },
  // Schedina bar
  schedinaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 4 : 4 },
  schedinaBarInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  schedinaBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  selCount: { backgroundColor: colors.background, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  selCountText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  schedinaBarText: { color: colors.background, fontWeight: '700', fontSize: 14 },
  schedinaBarOdds: { color: colors.background, fontWeight: '800', fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  selRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  selInfo: { flex: 1 },
  selMatch: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  selBet: { color: colors.primary, fontSize: 13, marginTop: 2 },
  modalDivider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  quotaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  quotaLabel: { color: colors.textSecondary, fontSize: 14 },
  quotaValue: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  importoLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 8 },
  importoInput: { backgroundColor: colors.background, borderRadius: 14, padding: 14, color: colors.textPrimary, fontSize: 20, fontWeight: '600', marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  quickStakes: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickStake: { flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  quickStakeActive: { backgroundColor: 'rgba(0,255,136,0.1)', borderColor: colors.primary },
  quickStakeText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  quickStakeTextActive: { color: colors.primary },
  winRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,255,136,0.1)', padding: 16, borderRadius: 14, marginBottom: 12 },
  winLabel: { color: colors.textSecondary, fontSize: 14 },
  winValue: { color: colors.primary, fontSize: 24, fontWeight: '800' },
  disclaimer: { color: colors.textMuted, fontSize: 10, textAlign: 'center' },
});
