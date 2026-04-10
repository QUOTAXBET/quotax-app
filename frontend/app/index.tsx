import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../src/context/AuthContext';
import { publicAPI, socialAPI } from '../src/utils/api';
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
  return <Text style={style}>{prefix}{val}{suffix}</Text>;
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [social, setSocial] = useState<any>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);

  const liveBlink = useRef(new Animated.Value(1)).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;
  const carouselAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAuthenticated && !authLoading) { router.replace('/(tabs)'); return; }
    checkOnboarding();
    fetchData();
    startAnims();
  }, [isAuthenticated, authLoading]);

  const checkOnboarding = async () => {
    try {
      const done = await AsyncStorage.getItem('onboarding_done');
      // Onboarding is optional - user can skip
    } catch (e) {}
  };

  const fetchData = async () => {
    try {
      const [s, a] = await Promise.all([publicAPI.getStats(), socialAPI.getActivity()]);
      setStats(s); setSocial(a);
    } catch (e) {}
  };

  const startAnims = () => {
    Animated.loop(Animated.sequence([
      Animated.timing(liveBlink, { toValue: 0.2, duration: 600, useNativeDriver: true }),
      Animated.timing(liveBlink, { toValue: 1, duration: 600, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(ctaPulse, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
      Animated.timing(ctaPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ])).start();
    // Carousel autoplay
    const interval = setInterval(() => {
      setCarouselIdx(prev => (prev + 1) % WINS.length);
    }, 3000);
    return () => clearInterval(interval);
  };

  const handleCTA = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding');
  };

  return (
    <SafeAreaView style={st.container}>
      <View style={st.inner}>
        {/* Logo */}
        <View style={st.logoRow}>
          <Ionicons name="trending-up" size={28} color={C.green} />
          <Text style={st.logoText}>EdgeBet</Text>
        </View>

        {/* Headline */}
        <Text style={st.headline}>Pronostici basati su dati, non su opinioni</Text>
        <Text style={st.subheadline}>L'algoritmo AI che analizza 40+ variabili per ogni evento</Text>

        {/* Animated Stats */}
        {stats && (
          <View style={st.statsRow}>
            <View style={st.statBox}>
              <CountUp to={stats.roi_7d} prefix="+" suffix="%" style={st.statVal} />
              <Text style={st.statLbl}>ROI</Text>
            </View>
            <View style={st.statBox}>
              <CountUp to={stats.win_rate} suffix="%" style={st.statVal} />
              <Text style={st.statLbl}>Win Rate</Text>
            </View>
            <View style={st.statBox}>
              <CountUp to={stats.streak} style={st.statVal} />
              <Text style={st.statLbl}>Serie Vinte</Text>
            </View>
          </View>
        )}

        {/* Live Banner */}
        {social?.activities?.[0] && (
          <View style={st.liveBanner}>
            <Animated.View style={[st.liveDot, { opacity: liveBlink }]} />
            <Text style={st.liveLabel}>LIVE</Text>
            <Text style={st.liveText} numberOfLines={1}>
              {social.activities[0].user} ha vinto +€{social.activities[0].amount?.toFixed(0)} — {social.activities[0].time}
            </Text>
          </View>
        )}

        {/* Win Carousel */}
        <View style={st.carousel}>
          <View style={st.carouselCard}>
            <Text style={st.carouselAmount}>{WINS[carouselIdx].amount}</Text>
            <Text style={st.carouselDetail}>{WINS[carouselIdx].detail}</Text>
          </View>
          <View style={st.dots}>
            {WINS.map((_, i) => <View key={i} style={[st.dot, i === carouselIdx && st.dotActive]} />)}
          </View>
        </View>

        {/* CTA */}
        <View style={st.ctaSection}>
          <Animated.View style={{ transform: [{ scale: ctaPulse }], width: '100%' }}>
            <TouchableOpacity onPress={handleCTA} activeOpacity={0.8} style={st.ctaWrap}>
              <LinearGradient colors={[C.green, '#00CC6A']} style={st.ctaBtn}>
                <Text style={st.ctaText}>Inizia Gratis — Registrati in 30 secondi</Text>
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
  inner: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  logoText: { fontSize: 26, fontWeight: '800', color: C.text },
  headline: { fontSize: 26, fontWeight: '800', color: C.text, textAlign: 'center', lineHeight: 34 },
  subheadline: { fontSize: 14, color: C.sub, textAlign: 'center', marginTop: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  statBox: { backgroundColor: C.card, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, alignItems: 'center', minWidth: 95, borderWidth: 1, borderColor: C.border },
  statVal: { fontSize: 22, fontWeight: '800', color: C.green },
  statLbl: { fontSize: 10, color: C.muted, marginTop: 3 },
  liveBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,77,77,0.1)', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, alignSelf: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  liveLabel: { color: C.red, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  liveText: { color: C.sub, fontSize: 13, flex: 1 },
  carousel: { alignItems: 'center' },
  carouselCard: { backgroundColor: C.card, borderRadius: 18, paddingVertical: 20, paddingHorizontal: 32, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,255,136,0.2)', width: width - 80 },
  carouselAmount: { fontSize: 36, fontWeight: '800', color: C.green },
  carouselDetail: { fontSize: 13, color: C.sub, marginTop: 4 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  dotActive: { backgroundColor: C.green, width: 16 },
  ctaSection: { alignItems: 'center', gap: 12 },
  ctaWrap: { borderRadius: 16, overflow: 'hidden', width: '100%' },
  ctaBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 16 },
  ctaText: { color: C.bg, fontSize: 16, fontWeight: '800' },
  guestBtn: { paddingVertical: 8 },
  guestText: { color: C.muted, fontSize: 13 },
});
