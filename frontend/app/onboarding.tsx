import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const C = { bg: '#0B0F14', card: '#1A2332', green: '#00FF88', gold: '#FFD700', red: '#FF4D4D', text: '#FFF', sub: '#9CA3AF', muted: '#6B7280', border: '#2A3847' };

const STEPS = [
  {
    key: 'obiettivo',
    icon: 'trophy',
    title: 'Qual è il tuo obiettivo?',
    subtitle: 'Personalizziamo il feed in base a te',
    options: [
      { id: 'profit', label: 'Massimizzare il profitto', icon: 'trending-up' },
      { id: 'safe', label: 'Giocate sicure e costanti', icon: 'shield-checkmark' },
      { id: 'fun', label: 'Divertirmi con le analisi AI', icon: 'sparkles' },
    ],
  },
  {
    key: 'rischio',
    icon: 'speedometer',
    title: 'Che livello di rischio preferisci?',
    subtitle: 'Adattiamo i pronostici al tuo stile',
    options: [
      { id: 'low', label: 'Basso — Quota < 2.00', icon: 'shield', color: C.green },
      { id: 'medium', label: 'Medio — Quota 2.00–5.00', icon: 'flash', color: '#FFB800' },
      { id: 'high', label: 'Alto — Quota > 5.00', icon: 'flame', color: C.red },
    ],
  },
  {
    key: 'sport',
    icon: 'football',
    title: 'Quali sport ti interessano?',
    subtitle: 'Puoi selezionarne più di uno',
    options: [
      { id: 'soccer', label: 'Calcio', icon: 'football' },
      { id: 'nba', label: 'NBA', icon: 'basketball' },
      { id: 'ufc', label: 'UFC', icon: 'fitness' },
    ],
    multi: true,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0.33)).current;

  const current = STEPS[step];

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: (step + 1) / 3, duration: 400, useNativeDriver: false }).start();
  }, [step]);

  const animateTransition = (next: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -50, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      setSelected([]);
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  };

  const handleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (current.multi) {
      setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setSelected([id]);
      const newAnswers = { ...answers, [current.key]: id };
      setAnswers(newAnswers);
      if (step < 2) {
        setTimeout(() => animateTransition(step + 1), 300);
      }
    }
  };

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const finalAnswers = { ...answers, [current.key]: selected };
    try { await AsyncStorage.setItem('onboarding_done', 'true'); await AsyncStorage.setItem('preferences', JSON.stringify(finalAnswers)); } catch (e) {}
    router.replace('/login');
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <SafeAreaView style={st.container}>
      {/* Progress */}
      <View style={st.progressBar}><Animated.View style={[st.progressFill, { width: progressWidth }]} /></View>
      <Text style={st.stepLabel}>Passo {step + 1} di 3</Text>

      <Animated.View style={[st.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={st.iconWrap}>
          <LinearGradient colors={[C.green, '#00CC6A']} style={st.iconBg}>
            <Ionicons name={current.icon as any} size={36} color={C.bg} />
          </LinearGradient>
        </View>
        <Text style={st.title}>{current.title}</Text>
        <Text style={st.subtitle}>{current.subtitle}</Text>

        <View style={st.options}>
          {current.options.map((opt) => {
            const isSelected = selected.includes(opt.id);
            return (
              <TouchableOpacity key={opt.id} style={[st.option, isSelected && st.optionSelected]} onPress={() => handleSelect(opt.id)} activeOpacity={0.7}>
                <View style={[st.optIcon, isSelected && st.optIconSelected]}>
                  <Ionicons name={opt.icon as any} size={22} color={isSelected ? C.bg : (opt as any).color || C.sub} />
                </View>
                <Text style={[st.optLabel, isSelected && st.optLabelSelected]}>{opt.label}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color={C.green} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* Bottom */}
      <View style={st.bottom}>
        {current.multi && selected.length > 0 && (
          <TouchableOpacity style={st.ctaBtn} onPress={handleFinish} activeOpacity={0.8}>
            <LinearGradient colors={[C.green, '#00CC6A']} style={st.ctaGradient}>
              <Text style={st.ctaText}>Inizia</Text>
              <Ionicons name="arrow-forward" size={20} color={C.bg} />
            </LinearGradient>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => { try { AsyncStorage.setItem('onboarding_done', 'true'); } catch(e) {} router.replace('/(tabs)'); }}>
          <Text style={st.skip}>Salta per ora</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  progressBar: { height: 3, backgroundColor: C.border, marginHorizontal: 24, marginTop: 16, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.green, borderRadius: 2 },
  stepLabel: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 12 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  iconWrap: { alignItems: 'center', marginBottom: 24 },
  iconBg: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.text, fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: C.sub, fontSize: 14, textAlign: 'center', marginBottom: 32 },
  options: { gap: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  optionSelected: { borderColor: C.green, backgroundColor: 'rgba(0,255,136,0.06)' },
  optIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  optIconSelected: { backgroundColor: C.green },
  optLabel: { flex: 1, color: C.text, fontSize: 15, fontWeight: '600' },
  optLabelSelected: { color: C.green },
  bottom: { padding: 24, gap: 16, alignItems: 'center' },
  ctaBtn: { borderRadius: 16, overflow: 'hidden', width: '100%' },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  ctaText: { color: C.bg, fontSize: 17, fontWeight: '800' },
  skip: { color: C.muted, fontSize: 13 },
});
