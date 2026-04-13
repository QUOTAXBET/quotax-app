import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../src/utils/theme';

const PLANS = [
  {
    name: 'FREE',
    color: colors.primary,
    icon: 'person',
    price: 'Gratis',
    features: [
      { text: '1 pronostico al giorno', included: true },
      { text: 'Quote base visibili', included: true },
      { text: 'Classifica utenti', included: true },
      { text: 'Analisi AI completa', included: false },
      { text: 'Schedine AI illimitate', included: false },
      { text: 'Value Bets', included: false },
      { text: 'Elite AI Chat', included: false },
      { text: 'Report settimanale', included: false },
    ],
  },
  {
    name: 'PRO',
    color: '#9B59B6',
    icon: 'star',
    price: '€9.99/mese',
    popular: true,
    features: [
      { text: 'Pronostici illimitati', included: true },
      { text: 'Analisi AI completa', included: true },
      { text: 'Schedine AI illimitate', included: true },
      { text: 'Statistiche ROI personali', included: true },
      { text: '3 richieste AI Chat/sett.', included: true },
      { text: 'Value Bets', included: false },
      { text: 'AI Chat illimitata', included: false },
      { text: 'Report settimanale', included: false },
    ],
  },
  {
    name: 'ELITE',
    color: colors.gold,
    icon: 'diamond',
    price: '€19.99/mese',
    features: [
      { text: 'Tutto di Pro incluso', included: true },
      { text: 'Value Bets esclusive', included: true },
      { text: 'AI Chat illimitata', included: true },
      { text: 'Report settimanale AI', included: true },
      { text: 'Statistiche avanzate', included: true },
      { text: 'Badge esclusivi', included: true },
      { text: 'Supporto prioritario', included: true },
      { text: 'Accesso anticipato novita', included: true },
    ],
  },
];

export default function PlansScreen() {
  const router = useRouter();
  const ctaPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(ctaPulse, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
      Animated.timing(ctaPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Scegli il tuo Piano</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Intro */}
        <View style={s.intro}>
          <Ionicons name="flash" size={28} color={colors.primary} />
          <Text style={s.introTitle}>Sblocca la potenza dell'AI</Text>
          <Text style={s.introSub}>Confronta i piani e scopri quale fa per te</Text>
        </View>

        {/* Plan Cards */}
        {PLANS.map((plan) => (
          <View key={plan.name} style={[s.planCard, { borderColor: plan.color + '30' }, plan.popular && s.planCardPopular]}>
            {plan.popular && (
              <View style={[s.popularBadge, { backgroundColor: plan.color }]}>
                <Text style={s.popularText}>PIU POPOLARE</Text>
              </View>
            )}

            {/* Plan Header */}
            <View style={s.planHeader}>
              <View style={[s.planIconWrap, { backgroundColor: plan.color + '15', borderColor: plan.color + '30' }]}>
                <Ionicons name={plan.icon as any} size={22} color={plan.color} />
              </View>
              <View style={s.planNameWrap}>
                <Text style={[s.planName, { color: plan.color }]}>{plan.name}</Text>
                <Text style={s.planPrice}>{plan.price}</Text>
              </View>
            </View>

            {/* Features List */}
            <View style={s.featuresList}>
              {plan.features.map((feat, i) => (
                <View key={i} style={s.featureRow}>
                  <Ionicons
                    name={feat.included ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={feat.included ? plan.color : colors.textMuted}
                  />
                  <Text style={[s.featureText, !feat.included && s.featureDisabled]}>{feat.text}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Bottom CTA */}
        <View style={s.ctaSection}>
          <Animated.View style={{ transform: [{ scale: ctaPulse }], width: '100%' }}>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/login'); }}
              activeOpacity={0.85}
              style={s.ctaWrap}
            >
              <LinearGradient colors={[colors.primary, '#00CC6A']} style={s.ctaBtn}>
                <Ionicons name="rocket" size={20} color={colors.background} />
                <Text style={s.ctaText}>INIZIA GRATIS ORA</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          <Text style={s.ctaSub}>In un click sei dentro. Scegli il tuo piano e inizia.</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  scroll: { paddingHorizontal: 20 },
  // Intro
  intro: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  introTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  introSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  // Plan Card
  planCard: { backgroundColor: colors.card, borderRadius: 22, padding: 20, marginBottom: 16, borderWidth: 1.5, position: 'relative', overflow: 'hidden' },
  planCardPopular: { borderWidth: 2, borderColor: 'rgba(155,89,182,0.4)' },
  popularBadge: { position: 'absolute', top: 14, right: -28, paddingHorizontal: 32, paddingVertical: 4, transform: [{ rotate: '30deg' }] },
  popularText: { color: colors.background, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  planIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  planNameWrap: { flex: 1 },
  planName: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  planPrice: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginTop: 2 },
  // Features
  featuresList: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { color: colors.textPrimary, fontSize: 13, fontWeight: '500', flex: 1 },
  featureDisabled: { color: colors.textMuted, opacity: 0.5 },
  // CTA
  ctaSection: { alignItems: 'center', marginTop: 8, gap: 12 },
  ctaWrap: { borderRadius: 18, overflow: 'hidden', width: '100%' },
  ctaBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 18, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  ctaText: { color: colors.background, fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  ctaSub: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
