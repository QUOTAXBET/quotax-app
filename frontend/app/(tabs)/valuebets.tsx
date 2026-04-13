import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { valueBetsAPI } from '../../src/utils/api';
import { colors } from '../../src/utils/theme';
import { useAuth } from '../../src/context/AuthContext';

const getSportIcon = (sport: string) => sport === 'soccer' ? 'football' : sport === 'nba' ? 'basketball' : 'fitness';
const getRiskColor = (risk: string) => risk === 'low' ? colors.primary : risk === 'medium' ? '#FFB800' : '#FF4D4D';

// Shimmer skeleton for Value Bet cards
function ValueBetSkeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: false }),
      Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: false }),
    ])).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });

  return (
    <Animated.View style={[st.skeletonCard, { opacity }]}>      
      <View style={st.skeletonRow}>
        <View style={[st.skeletonLine, { width: 70, height: 22, borderRadius: 10 }]} />
        <View style={[st.skeletonLine, { width: 100, height: 14 }]} />
      </View>
      <View style={[st.skeletonLine, { width: '65%', height: 18, marginTop: 12 }]} />
      <View style={[st.skeletonLine, { width: '100%', height: 80, borderRadius: 16, marginTop: 14 }]} />
      <View style={[st.skeletonLine, { width: '100%', height: 60, borderRadius: 16, marginTop: 10 }]} />
      <View style={[st.skeletonLine, { width: '100%', height: 50, borderRadius: 16, marginTop: 10 }]} />
      <View style={[st.skeletonLine, { width: '100%', height: 70, borderRadius: 14, marginTop: 10 }]} />
    </Animated.View>
  );
}

export default function ValueBetsScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  // Staggered card entry animations
  const cardAnims = useRef<Animated.Value[]>([]).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const userTier = !isAuthenticated ? 'guest' : (user?.subscription_tier || 'free');
  const isElite = userTier === 'premium';

  useEffect(() => {
    fetchData();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.02, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);

  const fetchData = async () => {
    try {
      const res = await valueBetsAPI.getAll();
      setData(res);
      // Setup staggered animations for cards
      const bets = res?.value_bets || [];
      while (cardAnims.length < bets.length) {
        cardAnims.push(new Animated.Value(0));
      }
      // Trigger staggered entry
      setTimeout(() => {
        Animated.stagger(120, cardAnims.slice(0, bets.length).map(a =>
          Animated.spring(a, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true })
        )).start();
        // Glow pulse
        Animated.loop(Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
        ])).start();
      }, 100);
    } catch (e) {}
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Reset card anims
    cardAnims.forEach(a => a.setValue(0));
    await fetchData();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRefreshing(false);
  }, []);

  if (loading) return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <View style={st.headerLeft}>
          <Ionicons name="flash" size={22} color="#FFD700" />
          <Text style={st.title}>Value Bets AI</Text>
        </View>
      </View>
      <View style={{ padding: 16 }}><ValueBetSkeleton /><ValueBetSkeleton /><ValueBetSkeleton /></View>
    </SafeAreaView>
  );

  // Non-Elite: Show locked state
  if (!isElite) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}>
          <View style={st.headerLeft}>
            <Ionicons name="flash" size={22} color="#FFD700" />
            <View>
              <Text style={st.title}>Value Bets AI</Text>
              <Text style={st.subtitle}>Quote con potenziale vantaggio</Text>
            </View>
          </View>
        </View>
        <View style={st.infoBox}>
          <Ionicons name="information-circle" size={16} color={colors.gold} />
          <Text style={st.infoBoxText}>{"Cos'\u00e8 una Value Bet? \u00c8 una quota che il bookmaker ha stimato pi\u00f9 alta del dovuto. Secondo la nostra AI, la probabilit\u00e0 reale \u00e8 maggiore rispetto a quella implicita nella quota."}</Text>
        </View>

        {/* Preview cards blurred */}
        <ScrollView contentContainerStyle={st.scrollContent}>
          {[1, 2].map(i => (
            <View key={i} style={st.previewCard}>
              <View style={st.blurredLines}>
                <View style={[st.blurLine, { width: '60%' }]} />
                <View style={[st.blurLine, { width: '80%' }]} />
                <View style={[st.blurLine, { width: '45%' }]} />
              </View>
            </View>
          ))}

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={st.lockedBanner}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/subscribe?plan=elite'); }}
              activeOpacity={0.8}
            >
              <Ionicons name="diamond" size={32} color={colors.gold} />
              <Text style={st.lockedTitle}>Funzione esclusiva Elite</Text>
              <Text style={st.lockedSub}>Le Value Bets mostrano quote potenzialmente errate dei bookmaker che puoi sfruttare a tuo vantaggio</Text>
              <View style={st.lockedBtn}>
                <Text style={st.lockedBtnText}>Passa a Elite</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.background} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Elite: Full content
  const bets = data?.value_bets || [];

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <View style={st.headerLeft}>
          <Ionicons name="flash" size={22} color="#FFD700" />
          <View>
            <Text style={st.title}>Value Bets AI</Text>
            <Text style={st.subtitle}>Quote con potenziale vantaggio secondo la nostra AI</Text>
          </View>
        </View>
        {data?.date && <Text style={st.dateText}>{data.date}</Text>}
      </View>

      <View style={st.infoBox}>
        <Ionicons name="information-circle" size={16} color={colors.gold} />
        <Text style={st.infoBoxText}>{"Cos'\u00e8 una Value Bet? \u00c8 una quota che il bookmaker ha stimato pi\u00f9 alta del dovuto. Secondo la nostra AI, la probabilit\u00e0 reale \u00e8 maggiore rispetto a quella implicita nella quota."}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {bets.map((vb: any, idx: number) => {
          const anim = cardAnims[idx] || new Animated.Value(1);
          const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.2] });
          return (
          <Animated.View key={vb.value_bet_id} style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }}>
          <TouchableOpacity
            style={st.card}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            activeOpacity={0.9}
          >
            {/* Neon glow line at top */}
            <Animated.View style={[st.cardGlowLine, { opacity: glowOpacity }]} />

            {/* Header */}
            <View style={st.cardHeader}>
              <View style={st.sportTag}>
                <Ionicons name={getSportIcon(vb.sport) as any} size={12} color={colors.background} />
                <Text style={st.sportTagText}>{vb.sport.toUpperCase()}</Text>
              </View>
              <Text style={st.leagueText}>{vb.league}</Text>
              {vb.is_dropping && (
                <View style={st.urgencyTag}>
                  <Ionicons name="trending-down" size={11} color="#FF4D4D" />
                  <Text style={st.urgencyText}>IN CALO</Text>
                </View>
              )}
            </View>

            <Text style={st.matchTeams}>{vb.home_team} vs {vb.away_team}</Text>

            {/* Main Pick */}
            <View style={st.pickBox}>
              <Text style={st.pickLabel}>Scelta AI</Text>
              <Text style={st.pickOutcome}>{vb.outcome_label} {vb.outcome_type}</Text>
              <Text style={st.pickOdds}>@{vb.bookmaker_odds}</Text>
            </View>

            {/* Odds Comparison Block */}
            <View style={st.oddsCompare}>
              <View style={st.oddsRow}>
                <View style={st.oddsItem}>
                  <Text style={st.oddsLabel}>Quota bookmaker</Text>
                  <Text style={st.oddsValue}>{vb.bookmaker_odds}</Text>
                </View>
                <View style={st.oddsDivider}><Ionicons name="swap-horizontal" size={18} color={colors.textMuted} /></View>
                <View style={st.oddsItem}>
                  <Text style={st.oddsLabel}>Quota stimata AI</Text>
                  <Text style={[st.oddsValue, { color: colors.primary }]}>{vb.ai_estimated_odds}</Text>
                </View>
              </View>
              <View style={st.valueDetected}>
                <View style={st.valueGlow} />
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                <Text style={st.valueLabel}>Valore rilevato</Text>
              </View>
            </View>

            {/* Edge with glow */}
            <View style={st.edgeBanner}>
              <View style={st.edgeGlow} />
              <View style={st.edgeIcon}><Ionicons name="analytics" size={18} color={colors.primary} /></View>
              <View style={st.edgeContent}>
                <Text style={st.edgeLabel}>Edge sul mercato</Text>
                <Text style={st.edgePercent}>+{vb.edge_percentage}% EDGE</Text>
              </View>
              <View style={[st.riskPill, { backgroundColor: getRiskColor(vb.risk_level) + '18' }]}>
                <View style={[st.riskDot, { backgroundColor: getRiskColor(vb.risk_level) }]} />
                <Text style={[st.riskText, { color: getRiskColor(vb.risk_level) }]}>
                  {vb.risk_level === 'low' ? 'Basso' : vb.risk_level === 'medium' ? 'Medio' : 'Alto'}
                </Text>
              </View>
            </View>

            {/* Bookmaker */}
            <View style={st.bookmakerRow}>
              <Ionicons name="globe-outline" size={14} color={colors.textMuted} />
              <Text style={st.bookmakerText}>Disponibile su: <Text style={st.bookmakerName}>{vb.bookmaker}</Text></Text>
            </View>

            {/* AI Explanation */}
            <View style={st.explanationBox}>
              <Ionicons name="bulb" size={16} color={colors.gold} />
              <Text style={st.explanationText}>{vb.explanation}</Text>
            </View>

            {/* Urgency */}
            {vb.urgency_text && (
              <View style={st.urgencyBanner}>
                <Text style={st.urgencyBannerIcon}>{'📉'}</Text>
                <Text style={st.urgencyBannerText}>{vb.urgency_text}</Text>
              </View>
            )}
          </TouchableOpacity>
          </Animated.View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  dateText: { color: colors.textMuted, fontSize: 12 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 16, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'rgba(255,215,0,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)' },
  infoBoxText: { color: colors.textMuted, fontSize: 11, flex: 1, lineHeight: 16 },
  scrollContent: { padding: 16, paddingTop: 4 },
  // Locked state
  previewCard: { backgroundColor: colors.card, borderRadius: 18, padding: 18, marginBottom: 10, opacity: 0.25 },
  blurredLines: { gap: 10 },
  blurLine: { height: 12, backgroundColor: colors.textMuted, borderRadius: 6, opacity: 0.3 },
  lockedBanner: { alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,215,0,0.06)', padding: 28, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.2)', marginTop: 8 },
  lockedTitle: { color: colors.gold, fontSize: 20, fontWeight: '900' },
  lockedSub: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  lockedBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.gold, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
  lockedBtnText: { color: colors.background, fontSize: 15, fontWeight: '800' },
  // Skeleton
  skeletonCard: { backgroundColor: colors.card, borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  skeletonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skeletonLine: { backgroundColor: colors.border, borderRadius: 8, height: 14 },
  // Card
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)', overflow: 'hidden', position: 'relative' },
  cardGlowLine: { position: 'absolute', top: 0, left: '10%', width: '80%', height: 2, backgroundColor: colors.gold, borderRadius: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sportTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  sportTagText: { color: colors.background, fontSize: 10, fontWeight: '800' },
  leagueText: { color: colors.textMuted, fontSize: 11, flex: 1 },
  urgencyTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,77,77,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urgencyText: { color: '#FF4D4D', fontSize: 9, fontWeight: '800' },
  matchTeams: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 14 },
  // Main Pick
  pickBox: { backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)', alignItems: 'center' },
  pickLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  pickOutcome: { color: colors.textPrimary, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  pickOdds: { color: colors.gold, fontSize: 28, fontWeight: '900' },
  // Odds Comparison
  oddsCompare: { backgroundColor: colors.background, borderRadius: 16, padding: 16, marginBottom: 14 },
  oddsRow: { flexDirection: 'row', alignItems: 'center' },
  oddsItem: { flex: 1, alignItems: 'center' },
  oddsLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 4, fontWeight: '600' },
  oddsValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '900' },
  oddsDivider: { paddingHorizontal: 12 },
  valueDetected: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, position: 'relative' },
  valueGlow: { position: 'absolute', bottom: -4, left: '25%', width: '50%', height: 12, backgroundColor: colors.primary, borderRadius: 6, opacity: 0.08 },
  valueLabel: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  // Edge
  edgeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,255,136,0.06)', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,255,136,0.15)', gap: 12, overflow: 'hidden', position: 'relative' },
  edgeGlow: { position: 'absolute', left: -20, top: '20%', width: 60, height: '60%', backgroundColor: colors.primary, borderRadius: 30, opacity: 0.06 },
  edgeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,255,136,0.12)', alignItems: 'center', justifyContent: 'center' },
  edgeContent: { flex: 1 },
  edgeLabel: { color: colors.textSecondary, fontSize: 11 },
  edgePercent: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  riskPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskText: { fontSize: 10, fontWeight: '700' },
  // Bookmaker
  bookmakerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 },
  bookmakerText: { color: colors.textMuted, fontSize: 12 },
  bookmakerName: { color: colors.textPrimary, fontWeight: '700' },
  // Explanation
  explanationBox: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,215,0,0.04)', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,215,0,0.08)' },
  explanationText: { color: colors.textSecondary, fontSize: 12, flex: 1, lineHeight: 18 },
  // Urgency
  urgencyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,77,77,0.06)', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,77,77,0.12)' },
  urgencyBannerIcon: { fontSize: 14 },
  urgencyBannerText: { color: '#FF4D4D', fontSize: 12, fontWeight: '600', flex: 1 },
});
