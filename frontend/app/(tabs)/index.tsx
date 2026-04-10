import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Animated, Easing, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/context/AuthContext';
import { matchesAPI, socialAPI, notificationsAPI } from '../../src/utils/api';
import { colors } from '../../src/utils/theme';
import SportFilter from '../../src/components/SportFilter';
import { SkeletonMatchCard } from '../../src/components/Skeleton';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { it } from 'date-fns/locale';

interface Selection { matchId: string; betType: string; odds: number; label: string; matchLabel: string; }

export default function PronosticiScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isPremium, refreshUser } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [stats, setStats] = useState<any>(null);
  const [social, setSocial] = useState<any>(null);
  const [selectedSport, setSelectedSport] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [showSchedina, setShowSchedina] = useState(false);
  const [stakeInput, setStakeInput] = useState('10');
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const barAnim = useRef(new Animated.Value(0)).current;
  // Glow animations for odds
  const glowAnims = useRef<Record<string, Animated.Value>>({}).current;

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

  // Fetch unread notification count
  useEffect(() => {
    const userId = user?.user_id || 'guest_demo';
    notificationsAPI.getAll(userId).then(data => {
      setUnreadNotifs(data.unread_count || 0);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    Animated.timing(barAnim, { toValue: selections.length > 0 ? 1 : 0, duration: 300, useNativeDriver: true }).start();
  }, [selections.length]);

  const getGlowAnim = (key: string) => {
    if (!glowAnims[key]) glowAnims[key] = new Animated.Value(0);
    return glowAnims[key];
  };

  const toggleSelection = (matchId: string, betType: string, odds: number, label: string, matchLabel: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const glowKey = `${matchId}_${betType}`;
    const anim = getGlowAnim(glowKey);
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 0.6, duration: 300, useNativeDriver: false }),
    ]).start();

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

  if (loading) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}><View style={s.logo}><Ionicons name="analytics" size={22} color={colors.primary} /><Text style={s.logoText}>Pronostici</Text></View></View>
      <View style={s.content}><SkeletonMatchCard /><SkeletonMatchCard /><SkeletonMatchCard /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.logo}>
          <Ionicons name="analytics" size={22} color={colors.primary} />
          <Text style={s.logoText}>Pronostici</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.bellBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            {unreadNotifs > 0 && <View style={s.bellBadge}><Text style={s.bellBadgeText}>{unreadNotifs}</Text></View>}
          </TouchableOpacity>
          {!isAuthenticated ? (
            <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/login')}>
              <Ionicons name="log-in-outline" size={16} color={colors.textPrimary} />
              <Text style={s.loginBtnText}>Accedi</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.userBadge}><Text style={s.userBadgeText}>{user?.name?.split(' ')[0]}</Text></View>
          )}
        </View>
      </View>

      {/* Compact Stats Row */}
      {stats && (
        <View style={s.statsBanner}>
          <View style={s.statItem}><Text style={s.statValue}>+{stats.roi_7d}%</Text><Text style={s.statLabel}>ROI</Text></View>
          <View style={s.statDivider} />
          <View style={s.statItem}><Text style={s.statValue}>{stats.win_rate}%</Text><Text style={s.statLabel}>Win</Text></View>
          <View style={s.statDivider} />
          <View style={s.statItem}><Text style={s.statValue}>{stats.streak}</Text><Text style={s.statLabel}>Serie</Text></View>
          {social && (<><View style={s.statDivider} /><View style={s.statItem}><View style={s.liveRow}><View style={s.liveDot} /><Text style={s.statValue}>{social.viewing_now}</Text></View><Text style={s.statLabel}>Online</Text></View></>)}
        </View>
      )}

      {/* Social ticker */}
      {social?.activities?.[0] && (
        <View style={s.socialTicker}>
          <Ionicons name="flash" size={13} color={colors.primary} />
          <Text style={s.socialTickerText} numberOfLines={1}>{social.activities[0].user} ha vinto +€{social.activities[0].amount?.toFixed(0)} — {social.activities[0].time}</Text>
        </View>
      )}

      <SportFilter selected={selectedSport} onSelect={setSelectedSport} />

      <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />} contentContainerStyle={{ paddingBottom: selections.length > 0 ? 90 : 24 }}>
        <View style={s.content}>
          {matches.map((match, index) => {
            const pred = predictions[match.match_id];
            const shouldLock = isPremium ? false : !isAuthenticated ? (index % 10 >= 3) : (index % 5 >= 3);
            const selected = selections.find(sel => sel.matchId === match.match_id);
            const matchDate = new Date(match.match_date);

            return (
              <View key={match.match_id} style={[s.card, selected && s.cardSelected]}>
                {/* Card Header */}
                <View style={s.cardHeader}>
                  <View style={s.sportBadge}>
                    <Ionicons name={getSportIcon(match.sport) as any} size={12} color={colors.background} />
                    <Text style={s.sportText}>{getSportLabel(match.sport)}</Text>
                  </View>
                  <View style={s.cardHeaderRight}>
                    {pred && !shouldLock && pred.confidence > 75 && (
                      <View style={s.aiBadge}><Ionicons name="sparkles" size={10} color={colors.primary} /><Text style={s.aiBadgeText}>AI ✓</Text></View>
                    )}
                    <Text style={s.league}>{match.league}</Text>
                  </View>
                </View>

                {/* Teams */}
                <View style={s.teams}>
                  <View style={s.team}>
                    <View style={s.teamIcon}><Ionicons name="shield-half-outline" size={24} color={colors.primary} /></View>
                    <Text style={s.teamName} numberOfLines={2}>{match.home_team}</Text>
                  </View>
                  <View style={s.vsBox}>
                    <Text style={s.vs}>VS</Text>
                    <Text style={s.matchDate}>{format(matchDate, 'd MMM', { locale: it })}</Text>
                    <Text style={s.matchTime}>{format(matchDate, 'HH:mm')}</Text>
                  </View>
                  <View style={s.team}>
                    <View style={s.teamIcon}><Ionicons name="shield-half-outline" size={24} color={colors.loss} /></View>
                    <Text style={s.teamName} numberOfLines={2}>{match.away_team}</Text>
                  </View>
                </View>

                {/* Interactive Odds with Glow */}
                <View style={s.odds}>
                  {[
                    { type: 'home', label: '1', odds: match.odds_home },
                    ...(match.odds_draw ? [{ type: 'draw', label: 'X', odds: match.odds_draw }] : []),
                    { type: 'away', label: '2', odds: match.odds_away },
                  ].map((o) => {
                    const isSelected = selected?.betType === o.type;
                    const glowKey = `${match.match_id}_${o.type}`;
                    const glow = getGlowAnim(glowKey);
                    const glowBorder = glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,255,136,0)', 'rgba(0,255,136,0.6)'] });
                    return (
                      <Animated.View key={o.type} style={[s.oddsItemWrap, isSelected && { borderColor: colors.primary }, { borderColor: glowBorder }]}>
                        <TouchableOpacity
                          style={[s.oddsItem, isSelected && s.oddsSelected]}
                          onPress={() => toggleSelection(match.match_id, o.type, o.odds, o.type === 'home' ? match.home_team : o.type === 'away' ? match.away_team : 'Pareggio', `${match.home_team} vs ${match.away_team}`)}
                          activeOpacity={0.7}
                        >
                          <Text style={s.oddsLabel}>{o.label}</Text>
                          <Text style={[s.oddsValue, isSelected && s.oddsValueSelected]}>{o.odds}</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
                </View>

                {/* AI Prediction - Teaser (free) vs Full (premium) */}
                {pred && !shouldLock && (
                  <View style={s.prediction}>
                    <View style={s.predHeader}>
                      <View style={s.predHeaderLeft}>
                        <Ionicons name="analytics" size={14} color={colors.primary} />
                        <Text style={s.predTitle}>Pronostico AI</Text>
                      </View>
                      <View style={[s.riskBadge, { backgroundColor: getRiskColor(pred.risk_level) + '20' }]}>
                        <View style={[s.riskDot, { backgroundColor: getRiskColor(pred.risk_level) }]} />
                        <Text style={[s.riskText, { color: getRiskColor(pred.risk_level) }]}>{getRiskLabel(pred.risk_level)}</Text>
                      </View>
                    </View>
                    <View style={s.predOutcomeRow}>
                      <Text style={s.predLabel}>Scelta:</Text>
                      <Text style={s.predOutcome}>{getOutcomeLabel(pred.predicted_outcome, match.home_team, match.away_team)}</Text>
                      <View style={s.predOddsBox}><Text style={s.predOdds}>@{pred.odds}</Text></View>
                    </View>
                    <View style={s.confRow}>
                      <Text style={s.confLabel}>Affidabilità</Text>
                      <View style={s.confBar}><View style={[s.confFill, { width: `${pred.confidence}%`, backgroundColor: getRiskColor(pred.risk_level) }]} /></View>
                      <Text style={[s.confValue, { color: getRiskColor(pred.risk_level) }]}>{pred.confidence}%</Text>
                    </View>

                    {/* Teaser vs Full motivation */}
                    {isPremium ? (
                      pred.ai_motivation && <Text style={s.motivation}>{pred.ai_motivation}</Text>
                    ) : (
                      <TouchableOpacity style={s.teaserBlock} onPress={() => router.push(isAuthenticated ? '/subscribe' : '/login')} activeOpacity={0.8}>
                        <View style={s.teaserFade}>
                          <Text style={s.teaserText} numberOfLines={2}>
                            {pred.ai_motivation ? pred.ai_motivation.substring(0, 60) + '...' : 'Analisi AI dettagliata disponibile...'}
                          </Text>
                          <View style={s.teaserOverlay}>
                            <Ionicons name="lock-closed" size={14} color={colors.gold} />
                            <Text style={s.teaserCta}>Sblocca analisi AI</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Fully Locked */}
                {shouldLock && (
                  <TouchableOpacity style={s.locked} onPress={() => router.push(isAuthenticated ? '/subscribe' : '/login')} activeOpacity={0.8}>
                    <View style={s.blurLines}><View style={[s.blurLine, { width: '75%' }]} /><View style={[s.blurLine, { width: '50%' }]} /><View style={[s.blurLine, { width: '85%' }]} /></View>
                    <View style={s.lockedOverlay}>
                      <Ionicons name="lock-closed" size={18} color={colors.gold} />
                      <Text style={s.lockedTitle}>{'🔒 PRONOSTICO PREMIUM'}</Text>
                      <Text style={s.lockedHint}>{'💡 L\'AI rileva valore su questa partita'}</Text>
                      <TouchableOpacity style={s.lockedCTABtn} onPress={() => router.push(isAuthenticated ? '/subscribe' : '/login')} activeOpacity={0.8}>
                        <Text style={s.lockedCTAText}>{isAuthenticated ? 'Sblocca analisi AI' : 'Registrati per sbloccare'}</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Countdown + FOMO */}
                <View style={s.fomoBar}>
                  <View style={s.fomoLeft}><Ionicons name="eye" size={12} color={colors.textMuted} /><Text style={s.fomoText}>{Math.floor(Math.random() * 25) + 10} stanno guardando</Text></View>
                  <View style={s.countdownWrap}>
                    <Ionicons name="time-outline" size={11} color={colors.primary} />
                    <Text style={s.countdownText}>
                      {(() => {
                        const mins = differenceInMinutes(matchDate, new Date());
                        if (mins <= 0) return 'LIVE';
                        const hrs = differenceInHours(matchDate, new Date());
                        if (hrs < 1) return `${mins}min`;
                        if (hrs < 24) return `${hrs}h ${mins % 60}m`;
                        return `${Math.floor(hrs / 24)}g ${hrs % 24}h`;
                      })()}
                    </Text>
                  </View>
                </View>
                {!isPremium && (
                  <TouchableOpacity style={s.fomoCTA} onPress={() => router.push(isAuthenticated ? '/subscribe' : '/login')} activeOpacity={0.8}>
                    <Ionicons name="flash" size={12} color={colors.gold} />
                    <Text style={s.fomoCTAText}>Non perdere questa quota</Text>
                    <Ionicons name="chevron-forward" size={12} color={colors.gold} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Schedina Bar */}
      {selections.length > 0 && (
        <Animated.View style={[s.schedinaBar, { transform: [{ translateY: barAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] }]}>
          <TouchableOpacity style={s.schedinaBarInner} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSchedina(true); }} activeOpacity={0.9}>
            <View style={s.schedinaBarLeft}>
              <View style={s.selCount}><Text style={s.selCountText}>{selections.length}</Text></View>
              <Text style={s.schedinaBarText}>La tua Schedina</Text>
            </View>
            <Text style={s.schedinaBarOdds}>@{totalOdds.toFixed(2)}</Text>
            <Ionicons name="chevron-up" size={20} color={colors.background} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Floating Elite AI Button */}
      {selections.length === 0 && (
        <TouchableOpacity
          style={s.eliteFab}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/elite'); }}
          activeOpacity={0.8}
        >
          <Ionicons name="diamond" size={20} color={colors.gold} />
          <Text style={s.eliteFabText}>Elite AI</Text>
        </TouchableOpacity>
      )}

      {/* Schedina Modal */}
      <Modal visible={showSchedina} transparent animationType="slide" onRequestClose={() => setShowSchedina(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>La tua Schedina</Text>
                <TouchableOpacity onPress={() => setShowSchedina(false)}><Ionicons name="close-circle" size={28} color={colors.textMuted} /></TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
                {selections.map((sel) => (
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
              <View style={s.quotaRow}><Text style={s.quotaLabel}>Quota totale</Text><Text style={s.quotaValue}>@{totalOdds.toFixed(2)}</Text></View>

              <Text style={s.importoLabel}>Importo ipotetico (€)</Text>
              <TextInput style={s.importoInput} value={stakeInput} onChangeText={setStakeInput} keyboardType="decimal-pad" placeholder="10" placeholderTextColor={colors.textMuted} />

              <View style={s.quickStakes}>
                {[5, 10, 25, 50].map(a => (
                  <TouchableOpacity key={a} style={[s.quickStake, stakeInput === a.toString() && s.quickStakeActive]} onPress={() => { Haptics.selectionAsync(); setStakeInput(a.toString()); }}>
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
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.textMuted, fontSize: 13 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.loss, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  loginBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.secondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  loginBtnText: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  userBadge: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  userBadgeText: { color: colors.background, fontWeight: '700', fontSize: 13 },
  statsBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.card, paddingVertical: 10, paddingHorizontal: 8, marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  statItem: { alignItems: 'center' },
  statValue: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: colors.border },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  socialTicker: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(0,255,136,0.06)', borderRadius: 10, marginTop: 8 },
  socialTickerText: { color: colors.textSecondary, fontSize: 11, flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  // Card
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  cardSelected: { borderColor: 'rgba(0,255,136,0.3)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,255,136,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,255,136,0.3)' },
  aiBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  sportBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 4 },
  sportText: { color: colors.background, fontSize: 10, fontWeight: '700' },
  league: { color: colors.textMuted, fontSize: 11 },
  teams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  team: { flex: 1, alignItems: 'center', gap: 6 },
  teamIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  teamName: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  vsBox: { alignItems: 'center', paddingHorizontal: 12 },
  vs: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  matchDate: { color: colors.textSecondary, fontSize: 10, marginTop: 3 },
  matchTime: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  // Odds with glow
  odds: { flexDirection: 'row', justifyContent: 'space-around', gap: 8, marginBottom: 12 },
  oddsItemWrap: { flex: 1, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  oddsItem: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: colors.background },
  oddsSelected: { backgroundColor: 'rgba(0,255,136,0.08)' },
  oddsLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 2 },
  oddsValue: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  oddsValueSelected: { color: colors.primary },
  // Prediction
  prediction: { backgroundColor: colors.background, borderRadius: 14, padding: 14 },
  predHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  predHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  predTitle: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  riskDot: { width: 5, height: 5, borderRadius: 3 },
  riskText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  predOutcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  predLabel: { color: colors.textSecondary, fontSize: 12 },
  predOutcome: { color: colors.textPrimary, fontSize: 15, fontWeight: '800', flex: 1 },
  predOddsBox: { backgroundColor: 'rgba(0,255,136,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  predOdds: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  confLabel: { color: colors.textSecondary, fontSize: 10, width: 65 },
  confBar: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  confFill: { height: '100%', borderRadius: 3 },
  confValue: { fontSize: 12, fontWeight: '800', width: 40, textAlign: 'right' },
  motivation: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  // Teaser block
  teaserBlock: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  teaserFade: { position: 'relative' },
  teaserText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, opacity: 0.5 },
  teaserOverlay: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  teaserCta: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  // Locked
  locked: { borderRadius: 14, overflow: 'hidden', position: 'relative' },
  blurLines: { backgroundColor: colors.background, borderRadius: 14, padding: 16, gap: 8, opacity: 0.15 },
  blurLine: { height: 12, backgroundColor: colors.textMuted, borderRadius: 4 },
  lockedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(11,15,20,0.85)', borderRadius: 14, gap: 4 },
  lockedTitle: { color: colors.gold, fontSize: 14, fontWeight: '800' },
  lockedHint: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 2 },
  lockedCTABtn: { marginTop: 10, backgroundColor: 'rgba(255,215,0,0.12)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
  lockedCTAText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  // FOMO
  fomoBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  fomoLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fomoText: { color: colors.textMuted, fontSize: 10 },
  countdownWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,255,136,0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  countdownText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  fomoCTA: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,215,0,0.06)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)' },
  fomoCTAText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  // Schedina bar
  schedinaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 4 : 4 },
  schedinaBarInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  schedinaBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  selCount: { backgroundColor: colors.background, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  selCountText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  schedinaBarText: { color: colors.background, fontWeight: '700', fontSize: 15 },
  schedinaBarOdds: { color: colors.background, fontWeight: '800', fontSize: 15 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  selRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  selInfo: { flex: 1 },
  selMatch: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  selBet: { color: colors.primary, fontSize: 13, marginTop: 2 },
  modalDivider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  quotaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  quotaLabel: { color: colors.textSecondary, fontSize: 14 },
  quotaValue: { color: colors.primary, fontSize: 22, fontWeight: '800' },
  importoLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 8 },
  importoInput: { backgroundColor: colors.background, borderRadius: 14, padding: 14, color: colors.textPrimary, fontSize: 20, fontWeight: '600', marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  quickStakes: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickStake: { flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  quickStakeActive: { backgroundColor: 'rgba(0,255,136,0.08)', borderColor: colors.primary },
  quickStakeText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  quickStakeTextActive: { color: colors.primary },
  winRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,255,136,0.08)', padding: 16, borderRadius: 16, marginBottom: 12 },
  winLabel: { color: colors.textSecondary, fontSize: 14 },
  winValue: { color: colors.primary, fontSize: 24, fontWeight: '800' },
  disclaimer: { color: colors.textMuted, fontSize: 10, textAlign: 'center' },
  // Elite FAB
  eliteFab: { position: 'absolute', bottom: 12, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,215,0,0.12)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  eliteFabText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
});
