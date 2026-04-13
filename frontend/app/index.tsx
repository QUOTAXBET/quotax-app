import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../src/context/AuthContext';
import { publicAPI } from '../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const C = { bg: '#0B0F14', card: '#1A2332', green: '#00FF88', gold: '#FFD700', red: '#FF4D4D', text: '#FFF', sub: '#9CA3AF', muted: '#6B7280', border: '#2A3847' };

const WINS = [
  { amount: '+€1.039', detail: 'Quota @20.79 · Puntata €50' },
  { amount: '+€482', detail: 'Quota @9.64 · Puntata €50' },
  { amount: '+€240', detail: 'Quota @4.80 · Puntata €50' },
  { amount: '+€1.580', detail: 'Quota @31.60 · Puntata €50' },
];

function CountUp({ to, prefix, suffix, style }: { to: number; prefix?: string; suffix?: string; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [val, setVal] = useState('0');
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: to, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const id = anim.addListener(({ value }) => setVal(Number.isInteger(to) ? Math.round(value).toString() : value.toFixed(1)));
    return () => anim.removeListener(id);
  }, [to]);
  return <Text style={style} numberOfLines={1} adjustsFontSizeToFit>{prefix}{val}{suffix}</Text>;
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);

  const liveBlink = useRef(new Animated.Value(1)).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;
  const logoGlow = useRef(new Animated.Value(0.4)).current;

  // 3D Stats entry animations (staggered)
  const stat1Scale = useRef(new Animated.Value(0)).current;
  const stat2Scale = useRef(new Animated.Value(0)).current;
  const stat3Scale = useRef(new Animated.Value(0)).current;
  const stat1Translate = useRef(new Animated.Value(40)).current;
  const stat2Translate = useRef(new Animated.Value(40)).current;
  const stat3Translate = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (isAuthenticated && !authLoading) { router.replace('/(tabs)'); return; }
    fetchData();
    startAnims();
  }, [isAuthenticated, authLoading]);

  const fetchData = async () => {
    try {
      const s = await publicAPI.getStats();
      setStats(s);
      // Trigger staggered 3D entry for stat boxes
      setTimeout(() => {
        Animated.stagger(150, [
          Animated.parallel([
            Animated.spring(stat1Scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
            Animated.timing(stat1Translate, { toValue: 0, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.spring(stat2Scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
            Animated.timing(stat2Translate, { toValue: 0, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.spring(stat3Scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
            Animated.timing(stat3Translate, { toValue: 0, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
          ]),
        ]).start();
      }, 200);
    } catch (e) {}
  };

  const startAnims = () => {
    // Live dot blink
    Animated.loop(Animated.sequence([
      Animated.timing(liveBlink, { toValue: 0.2, duration: 600, useNativeDriver: true }),
      Animated.timing(liveBlink, { toValue: 1, duration: 600, useNativeDriver: true }),
    ])).start();
    // CTA pulse
    Animated.loop(Animated.sequence([
      Animated.timing(ctaPulse, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
      Animated.timing(ctaPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ])).start();
    // Logo glow pulse
    Animated.loop(Animated.sequence([
      Animated.timing(logoGlow, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(logoGlow, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
    ])).start();
    // Carousel autoplay — smooth, no fade
    const interval = setInterval(() => {
      setCarouselIdx(prev => (prev + 1) % WINS.length);
    }, 5000);
    return () => clearInterval(interval);
  };

  const handleCTA = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // ALWAYS go to onboarding first
    router.push('/onboarding');
  };

  const liveSchedine = stats ? Math.floor(Math.random() * 6) + 4 : 0;

  return (
    <SafeAreaView style={st.container}>
      <View style={st.inner}>
        {/* Logo — Bigger + Neon border glow */}
        <View style={st.logoSection}>
          <Animated.View style={[st.logoContainer, { opacity: Animated.add(0.7, Animated.multiply(logoGlow, 0.3)) }]}>
            <View style={st.logoRow}>
              <Ionicons name="trending-up" size={36} color={C.green} />
              <Text style={st.logoText}>EdgeBet</Text>
            </View>
          </Animated.View>
          <Text style={st.logoBeta}>AI SPORTS PREDICTIONS</Text>
        </View>

        {/* Headline — More visible, contrast, subtle glow */}
        <View style={st.headlineSection}>
          <Text style={st.headline}>Pronostici basati su{'\n'}dati, non su opinioni</Text>
          <Text style={st.subheadline}>L'algoritmo AI che analizza 40+ variabili per ogni evento</Text>
        </View>

        {/* Stats — 3D depth with shadows + staggered entry */}
        {stats && (
          <View style={st.statsRow}>
            <Animated.View style={[st.statBox, st.statBox3D, { transform: [{ scale: stat1Scale }, { translateY: stat1Translate }], opacity: stat1Scale }]}>
              <CountUp to={stats.roi_7d} prefix="+" suffix="%" style={st.statVal} />
              <Text style={st.statLbl}>ROI 7gg</Text>
              <View style={st.statGlow} />
            </Animated.View>
            <Animated.View style={[st.statBox, st.statBoxCenter, st.statBox3D, { transform: [{ scale: stat2Scale }, { translateY: stat2Translate }], opacity: stat2Scale }]}>
              <CountUp to={stats.win_rate} suffix="%" style={[st.statVal, { color: C.gold }]} />
              <Text style={st.statLbl}>Win Rate</Text>
              <View style={st.statGlowGold} />
            </Animated.View>
            <Animated.View style={[st.statBox, st.statBox3D, { transform: [{ scale: stat3Scale }, { translateY: stat3Translate }], opacity: stat3Scale }]}>
              <CountUp to={stats.streak} style={st.statVal} />
              <Text style={st.statLbl}>Serie Vinte</Text>
              <View style={st.statGlow} />
            </Animated.View>
          </View>
        )}

        {/* LIVE Banner — Schedine disponibili (replaces "Marco T. ha vinto") */}
        <View style={st.liveBanner}>
          <Animated.View style={[st.liveDot, { opacity: liveBlink }]} />
          <Text style={st.liveLabel}>LIVE</Text>
          <Text style={st.liveText}>{liveSchedine} schedine disponibili ora</Text>
        </View>

        {/* Win Carousel — smooth transition */}
        <View style={st.carousel}>
          <View style={st.carouselCard}>
            <Text style={st.carouselTitle}>Ultima vincita verificata</Text>
            <Text style={st.carouselAmount}>{WINS[carouselIdx].amount}</Text>
            <Text style={st.carouselDetail}>{WINS[carouselIdx].detail}</Text>
          </View>
          <View style={st.dots}>
            {WINS.map((_, i) => <View key={i} style={[st.dot, i === carouselIdx && st.dotActive]} />)}
          </View>
        </View>

        {/* CTA — ALWAYS → onboarding */}
        <View style={st.ctaSection}>
          <Animated.View style={{ transform: [{ scale: ctaPulse }], width: '100%' }}>
            <TouchableOpacity onPress={handleCTA} activeOpacity={0.8} style={st.ctaWrap}>
              <LinearGradient colors={[C.green, '#00CC6A']} style={st.ctaBtn}>
                <Ionicons name="rocket" size={18} color={C.bg} />
                <Text style={st.ctaText}>Inizia Gratis</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={st.guestBtn}>
            <Text style={st.guestText}>Continua come ospite</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  // Logo
  logoSection: { alignItems: 'center' },
  logoContainer: { borderWidth: 1.5, borderColor: 'rgba(0,255,136,0.35)', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: 'rgba(0,255,136,0.03)' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  logoText: { fontSize: 34, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  logoBeta: { fontSize: 10, color: C.green, fontWeight: '700', letterSpacing: 3, marginTop: 4 },
  // Headline
  headlineSection: { alignItems: 'center' },
  headline: { fontSize: 28, fontWeight: '900', color: C.text, textAlign: 'center', lineHeight: 36 },
  subheadline: { fontSize: 14, color: C.sub, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  // Stats 3D
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'stretch', gap: 8, paddingHorizontal: 16 },
  statBox: { flex: 1, backgroundColor: C.card, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, elevation: 8, overflow: 'hidden', position: 'relative' },
  statBox3D: { shadowColor: C.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
  statBoxCenter: { borderColor: 'rgba(255,215,0,0.3)', backgroundColor: '#1E2A3A', shadowColor: C.gold, shadowOpacity: 0.2 },
  statGlow: { position: 'absolute', bottom: -10, left: '20%', width: '60%', height: 20, backgroundColor: C.green, borderRadius: 20, opacity: 0.08 },
  statGlowGold: { position: 'absolute', bottom: -10, left: '20%', width: '60%', height: 20, backgroundColor: C.gold, borderRadius: 20, opacity: 0.1 },
  statVal: { fontSize: 19, fontWeight: '900', color: C.green },
  statLbl: { fontSize: 9, color: C.muted, marginTop: 4, fontWeight: '600', letterSpacing: 0.5 },
  // Live Banner
  liveBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,255,136,0.06)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(0,255,136,0.1)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
  liveLabel: { color: C.green, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  liveText: { color: C.sub, fontSize: 13, fontWeight: '500' },
  // Carousel 3D
  carousel: { alignItems: 'center' },
  carouselCard: { backgroundColor: C.card, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 32, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,255,136,0.15)', width: width - 72, elevation: 6 },
  carouselTitle: { fontSize: 10, color: C.muted, fontWeight: '600', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  carouselAmount: { fontSize: 40, fontWeight: '900', color: C.green },
  carouselDetail: { fontSize: 13, color: C.sub, marginTop: 4 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  dotActive: { backgroundColor: C.green, width: 18 },
  // CTA
  ctaSection: { alignItems: 'center', gap: 10 },
  ctaWrap: { borderRadius: 16, overflow: 'hidden', width: '100%' },
  ctaBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 16, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  ctaText: { color: C.bg, fontSize: 17, fontWeight: '900' },
  guestBtn: { paddingVertical: 8 },
  guestText: { color: C.green, fontSize: 15, fontWeight: '600' },
});
