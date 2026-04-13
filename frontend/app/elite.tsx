import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../src/context/AuthContext';
import { eliteAPI, badgesAPI } from '../src/utils/api';
import { colors } from '../src/utils/theme';
import BadgeUnlockPopup from '../src/components/BadgeUnlockPopup';

const SUGGESTIONS = [
  "Chi vince tra Inter e Milan?",
  "Lakers vs Celtics: pronostico?",
  "Islam Makhachev vs Charles Oliveira",
  "Real Madrid - Barcelona: analisi",
  "Consigli scommesse Serie A oggi",
];

export default function EliteScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isPremium } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [badgePopup, setBadgePopup] = useState<any>(null);
  const [access, setAccess] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scrollRef = useRef<ScrollView>(null);

  const userTier = !isAuthenticated ? 'guest' : (user?.subscription_tier || 'free');
  const canUse = userTier === 'pro' || userTier === 'premium';

  // Check access and load history
  useEffect(() => {
    if (user?.user_id) {
      eliteAPI.checkAccess(user.user_id).then(setAccess).catch(() => {});
      eliteAPI.getHistory(user.user_id).then(data => {
        if (data?.history) setHistory(data.history.map((h: any) => ({ query: h.query, response: { response: h.response, model: h.model, generated_at: h.created_at }, timestamp: h.created_at })));
      }).catch(() => {});
    }
  }, [user?.user_id]);

  const handleAsk = async () => {
    if (!query.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setLoading(true);
    setResponse(null);
    fadeAnim.setValue(0);
    slideAnim.setValue(30);

    try {
      const result = await eliteAPI.ask(query.trim());
      setResponse(result);
      setHistory(prev => [{ query: query.trim(), response: result, timestamp: new Date() }, ...prev].slice(0, 20));
      setQuery('');

      // Update remaining count for Pro
      if (result.remaining !== undefined && result.remaining !== null) {
        setAccess((prev: any) => prev ? { ...prev, remaining: result.remaining, used: (prev.limit || 3) - result.remaining } : prev);
      }

      // Animate response in
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();

      // Check elite badge
      if (user?.user_id) {
        try {
          const badgeResult = await badgesAPI.checkEliteBadge(user.user_id);
          if (badgeResult.granted && badgeResult.badge) {
            setBadgePopup(badgeResult.badge);
          }
        } catch {}
      }
    } catch (e: any) {
      // Handle 429 (rate limit) and 403 (no access)
      const status = e?.response?.status;
      const msg = e?.response?.data?.detail;
      if (status === 429 || status === 403) {
        setResponse({ query: query.trim(), response: msg || 'Limite raggiunto', error: true });
      }
      console.error(e);
    } finally { setLoading(false); }
  };

  // Locked screen for Guest/Free
  if (!canUse) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Ionicons name="diamond" size={20} color={colors.gold} />
            <Text style={s.headerTitle}>Elite AI</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>
        <View style={s.lockedContainer}>
          <View style={s.lockedIconWrap}><Ionicons name="lock-closed" size={40} color={colors.gold} /></View>
          <Text style={s.lockedTitle}>AI Personalizzata</Text>
          <Text style={s.lockedSub}>Chiedi all'AI qualsiasi previsione sportiva. Analisi personalizzate basate su dati avanzati.</Text>
          <View style={s.lockedTiers}>
            <View style={s.lockedTierRow}>
              <Ionicons name="star" size={16} color="#9B59B6" />
              <Text style={s.lockedTierText}><Text style={{ fontWeight: '800', color: '#9B59B6' }}>Pro</Text> — 3 richieste a settimana</Text>
            </View>
            <View style={s.lockedTierRow}>
              <Ionicons name="diamond" size={16} color={colors.gold} />
              <Text style={s.lockedTierText}><Text style={{ fontWeight: '800', color: colors.gold }}>Elite</Text> — richieste illimitate</Text>
            </View>
          </View>
          <TouchableOpacity style={s.lockedCTA} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/subscribe'); }}>
            <Text style={s.lockedCTAText}>{isAuthenticated ? 'Attiva Pro ora' : 'Registrati gratis'}</Text>
          </TouchableOpacity>
        </View>
        {badgePopup && <BadgeUnlockPopup badge={badgePopup} onDismiss={() => setBadgePopup(null)} />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Ionicons name="diamond" size={20} color={colors.gold} />
          <Text style={s.headerTitle}>Elite AI</Text>
        </View>
        <View style={s.headerRight}>
          {userTier === 'pro' && access && (
            <View style={s.proBadge}><Text style={s.proBadgeText}>{access.remaining ?? '?'}/{access.limit ?? 3}</Text></View>
          )}
          <View style={s.eliteBadge}><Text style={s.eliteBadgeText}>{userTier === 'premium' ? 'ELITE' : 'PRO'}</Text></View>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} style={s.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

          {/* Hero Section */}
          {!response && !loading && (
            <View style={s.hero}>
              <View style={s.heroIconWrap}><Ionicons name="sparkles" size={36} color={colors.gold} /></View>
              <Text style={s.heroTitle}>Chiedi all'AI</Text>
              <Text style={s.heroSub}>Scrivi il match o la domanda e ricevi un'analisi AI personalizzata basata su dati e statistiche avanzate</Text>
            </View>
          )}

          {/* Input */}
          <View style={s.inputSection}>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={query}
                onChangeText={setQuery}
                placeholder="Es: Chi vince tra Inter e Milan?"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={200}
                editable={!loading}
              />
              <TouchableOpacity
                style={[s.sendBtn, (!query.trim() || loading) && s.sendBtnDisabled]}
                onPress={handleAsk}
                disabled={!query.trim() || loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Ionicons name="send" size={18} color={colors.background} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={s.charCount}>{query.length}/200</Text>
          </View>

          {/* Suggestions */}
          {!response && !loading && (
            <View style={s.suggestions}>
              <Text style={s.suggestionsTitle}>Suggerimenti rapidi</Text>
              {SUGGESTIONS.map((sug, i) => (
                <TouchableOpacity key={i} style={s.suggestionChip} onPress={() => { Haptics.selectionAsync(); setQuery(sug); }} activeOpacity={0.7}>
                  <Ionicons name="flash" size={14} color={colors.primary} />
                  <Text style={s.suggestionText}>{sug}</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Loading Animation */}
          {loading && (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={s.loadingText}>L'AI sta analizzando i dati...</Text>
              <Text style={s.loadingSub}>Analisi di 40+ variabili in corso</Text>
            </View>
          )}

          {/* AI Response */}
          {response && !loading && (
            <Animated.View style={[s.responseBox, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={s.responseHeader}>
                <View style={s.responseHeaderLeft}>
                  <Ionicons name="sparkles" size={16} color={colors.gold} />
                  <Text style={s.responseHeaderTitle}>Risposta AI</Text>
                </View>
                <Text style={s.responseModel}>{response.model}</Text>
              </View>
              <View style={s.responseDivider} />
              <Text style={s.responseText}>{response.response}</Text>
              <View style={s.responseFooter}>
                <Text style={s.responseTime}>Generato il {new Date(response.generated_at).toLocaleString('it-IT')}</Text>
              </View>
            </Animated.View>
          )}

          {/* History */}
          {history.length > 1 && (
            <View style={s.historySection}>
              <Text style={s.historyTitle}>Domande precedenti</Text>
              {history.slice(1).map((item, i) => (
                <TouchableOpacity key={i} style={s.historyItem} onPress={() => { setResponse(item.response); fadeAnim.setValue(1); slideAnim.setValue(0); }} activeOpacity={0.7}>
                  <Ionicons name="chatbubble-ellipses" size={14} color={colors.textMuted} />
                  <Text style={s.historyQuery} numberOfLines={1}>{item.query}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Premium gate for non-premium */}
          {!isPremium && (
            <View style={s.premiumGate}>
              <Ionicons name="diamond" size={28} color={colors.gold} />
              <Text style={s.premiumGateTitle}>Funzione Elite</Text>
              <Text style={s.premiumGateText}>Ogni utente gratuito ha 1 domanda al giorno. Con Premium, domande illimitate.</Text>
              <TouchableOpacity style={s.premiumGateCTA} onPress={() => router.push('/subscribe')} activeOpacity={0.7}>
                <Text style={s.premiumGateCTAText}>Passa a Premium</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.disclaimer}><Text style={s.disclaimerText}>Simulazione a scopo dimostrativo. Non incoraggiamo il gioco d'azzardo.</Text></View>

      <BadgeUnlockPopup
        visible={!!badgePopup}
        badge={badgePopup}
        onClose={() => setBadgePopup(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proBadge: { backgroundColor: 'rgba(155,89,182,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  proBadgeText: { color: '#9B59B6', fontSize: 10, fontWeight: '800' },
  eliteBadge: { backgroundColor: colors.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  eliteBadgeText: { color: colors.background, fontSize: 10, fontWeight: '800' },
  body: { flex: 1, padding: 16 },
  // Hero
  hero: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  heroIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(255,215,0,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  heroTitle: { fontSize: 24, fontWeight: '900', color: colors.textPrimary },
  heroSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
  // Input
  inputSection: { marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10 },
  input: { flex: 1, fontSize: 15, color: colors.textPrimary, maxHeight: 100, paddingVertical: 6 },
  sendBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
  charCount: { color: colors.textMuted, fontSize: 10, textAlign: 'right', marginTop: 4 },
  // Suggestions
  suggestions: { gap: 8, marginBottom: 20 },
  suggestionsTitle: { color: colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  suggestionText: { flex: 1, color: colors.textPrimary, fontSize: 13 },
  // Loading
  loadingBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { color: colors.gold, fontSize: 15, fontWeight: '700' },
  loadingSub: { color: colors.textMuted, fontSize: 12 },
  // Response
  responseBox: { backgroundColor: colors.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)', marginBottom: 16 },
  responseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  responseHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  responseHeaderTitle: { color: colors.gold, fontSize: 14, fontWeight: '700' },
  responseModel: { color: colors.textMuted, fontSize: 10 },
  responseDivider: { height: 1, backgroundColor: colors.border, marginBottom: 14 },
  responseText: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  responseFooter: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  responseTime: { color: colors.textMuted, fontSize: 10 },
  // History
  historySection: { gap: 8, marginTop: 8 },
  historyTitle: { color: colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  historyQuery: { flex: 1, color: colors.textPrimary, fontSize: 12 },
  // Premium gate
  premiumGate: { alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.05)', borderRadius: 20, padding: 24, marginTop: 20, gap: 10, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)' },
  premiumGateTitle: { color: colors.gold, fontSize: 18, fontWeight: '800' },
  premiumGateText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  premiumGateCTA: { backgroundColor: colors.gold, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  premiumGateCTAText: { color: colors.background, fontWeight: '800', fontSize: 14 },
  disclaimer: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  disclaimerText: { color: colors.textMuted, fontSize: 9, textAlign: 'center' },
  // Locked screen
  lockedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 14 },
  lockedIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,215,0,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  lockedTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '900' },
  lockedSub: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  lockedTiers: { gap: 10, marginTop: 8 },
  lockedTierRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockedTierText: { color: colors.textSecondary, fontSize: 14 },
  lockedCTA: { backgroundColor: colors.gold, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, marginTop: 12 },
  lockedCTAText: { color: colors.background, fontWeight: '900', fontSize: 16 },
});
