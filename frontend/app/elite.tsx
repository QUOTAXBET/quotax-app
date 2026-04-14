import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Keyboard, Modal } from 'react-native';
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

const EVENT_OPTIONS = [3, 5, 7, 10];
const RISK_LEVELS = [
  { key: 'low', label: 'Basso', emoji: '🟢', desc: 'Quote basse, alta probabilità' },
  { key: 'medium', label: 'Medio', emoji: '🟡', desc: 'Bilanciato rischio/rendimento' },
  { key: 'high', label: 'Alto', emoji: '🔴', desc: 'Quote alte, alta vincita potenziale' },
];

export default function EliteScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isPremium } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [badgePopup, setBadgePopup] = useState<any>(null);

  // Schedina Personalizzata AI
  const [showSchedina, setShowSchedina] = useState(false);
  const [schedinaStep, setSchedinaStep] = useState(0);
  const [schedinaEvents, setSchedinaEvents] = useState(5);
  const [schedinaStake, setSchedinaStake] = useState('10');
  const [schedinaTarget, setSchedinaTarget] = useState('50');
  const [schedinaRisk, setSchedinaRisk] = useState('medium');
  const [schedinaGenerating, setSchedinaGenerating] = useState(false);
  const [schedinaResult, setSchedinaResult] = useState<any>(null);
  const ctaPulse = useRef(new Animated.Value(1)).current;
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

  // CTA pulse animation
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(ctaPulse, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
      Animated.timing(ctaPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);

  const handleOpenSchedina = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSchedinaStep(0);
    setSchedinaResult(null);
    setSchedinaEvents(5);
    setSchedinaStake('10');
    setSchedinaTarget('50');
    setSchedinaRisk('medium');
    setShowSchedina(true);
  };

  const handleGenerateSchedina = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSchedinaGenerating(true);
    setSchedinaStep(4);
    const riskLabel = RISK_LEVELS.find(r => r.key === schedinaRisk)?.label || 'Medio';
    const prompt = `Crea una schedina personalizzata con queste specifiche:
- Numero eventi: ${schedinaEvents}
- Puntata: €${schedinaStake}
- Vincita desiderata: €${schedinaTarget}
- Livello di rischio: ${riskLabel}

Genera una schedina completa con:
1. Lista eventi (partita, esito consigliato, quota stimata)
2. Quota totale combinata
3. Vincita stimata
4. Breve spiegazione strategica

Formatta in modo chiaro e leggibile. Usa emoji per rendere visivamente accattivante.`;

    try {
      const res = await eliteAPI.ask(user?.user_id || '', prompt);
      setSchedinaResult(res);
    } catch (e: any) {
      setSchedinaResult({ response: 'Errore nella generazione. Riprova.', model: 'error' });
    } finally {
      setSchedinaGenerating(false);
    }
  };

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
            <Text style={s.lockedCTAText}>{isAuthenticated ? 'Attiva ora' : 'Registrati gratis'}</Text>
          </TouchableOpacity>
        </View>
        {badgePopup && <BadgeUnlockPopup visible={!!badgePopup} badge={badgePopup} onClose={() => setBadgePopup(null)} />}
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

          {/* Schedina Personalizzata CTA */}
          {!response && !loading && (
            <Animated.View style={{ transform: [{ scale: ctaPulse }], marginHorizontal: 16, marginBottom: 8 }}>
              <TouchableOpacity style={s.schedinaCTA} onPress={handleOpenSchedina} activeOpacity={0.85}>
                <Ionicons name="flash" size={20} color={colors.background} />
                <View style={s.schedinaCTATextWrap}>
                  <Text style={s.schedinaCTATitle}>Schedina Personalizzata AI</Text>
                  <Text style={s.schedinaCTASub}>L'AI crea la schedina perfetta per te</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.background} />
              </TouchableOpacity>
            </Animated.View>
          )}

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

          {/* Upgrade CTA for Pro users */}
          {userTier === 'pro' && (
            <View style={s.premiumGate}>
              <Ionicons name="diamond" size={28} color={colors.gold} />
              <Text style={s.premiumGateTitle}>Passa a Elite</Text>
              <Text style={s.premiumGateText}>Con il piano Pro hai {access?.limit || 3} richieste a settimana. Passa a Elite per richieste illimitate e report settimanali.</Text>
              <TouchableOpacity style={s.premiumGateCTA} onPress={() => router.push('/subscribe')} activeOpacity={0.7}>
                <Text style={s.premiumGateCTAText}>Attiva Elite</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.disclaimer}><Text style={s.disclaimerText}>Simulazione a scopo dimostrativo. Non incoraggiamo il gioco d'azzardo.</Text></View>

      {/* Schedina Personalizzata Modal */}
      <Modal visible={showSchedina} transparent animationType="slide" onRequestClose={() => setShowSchedina(false)}>
        <View style={s.scModalOverlay}>
          <View style={s.scModal}>
            {/* Header */}
            <View style={s.scHeader}>
              <View style={s.scHeaderLeft}>
                <Ionicons name="flash" size={20} color={colors.gold} />
                <Text style={s.scHeaderTitle}>Schedina Personalizzata AI</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSchedina(false)} style={s.scCloseBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {/* Step indicators */}
              {schedinaStep < 4 && (
                <View style={s.scSteps}>
                  {[0, 1, 2, 3].map(i => (
                    <View key={i} style={[s.scStepDot, i <= schedinaStep && s.scStepDotActive]} />
                  ))}
                </View>
              )}

              {/* Step 0: Number of events */}
              {schedinaStep === 0 && (
                <View style={s.scStepContent}>
                  <Text style={s.scStepTitle}>Quanti eventi vuoi inserire?</Text>
                  <Text style={s.scStepSub}>Scegli il numero di partite nella tua schedina</Text>
                  <View style={s.scOptionsRow}>
                    {EVENT_OPTIONS.map(n => (
                      <TouchableOpacity key={n} style={[s.scOption, schedinaEvents === n && s.scOptionActive]} onPress={() => { Haptics.selectionAsync(); setSchedinaEvents(n); }}>
                        <Text style={[s.scOptionText, schedinaEvents === n && s.scOptionTextActive]}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={s.scNextBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSchedinaStep(1); }}>
                    <Text style={s.scNextText}>Avanti</Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.background} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Step 1: Stake */}
              {schedinaStep === 1 && (
                <View style={s.scStepContent}>
                  <Text style={s.scStepTitle}>Quanto vuoi puntare?</Text>
                  <Text style={s.scStepSub}>Inserisci la puntata (simulazione)</Text>
                  <View style={s.scInputWrap}>
                    <Text style={s.scInputPrefix}>€</Text>
                    <TextInput style={s.scInput} value={schedinaStake} onChangeText={setSchedinaStake} keyboardType="numeric" placeholder="10" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={s.scBtnRow}>
                    <TouchableOpacity style={s.scBackBtn} onPress={() => setSchedinaStep(0)}>
                      <Ionicons name="arrow-back" size={16} color={colors.textMuted} />
                      <Text style={s.scBackText}>Indietro</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.scNextBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSchedinaStep(2); }}>
                      <Text style={s.scNextText}>Avanti</Text>
                      <Ionicons name="arrow-forward" size={16} color={colors.background} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Step 2: Target */}
              {schedinaStep === 2 && (
                <View style={s.scStepContent}>
                  <Text style={s.scStepTitle}>Quanto vuoi ottenere?</Text>
                  <Text style={s.scStepSub}>Vincita desiderata (simulazione)</Text>
                  <View style={s.scInputWrap}>
                    <Text style={s.scInputPrefix}>€</Text>
                    <TextInput style={s.scInput} value={schedinaTarget} onChangeText={setSchedinaTarget} keyboardType="numeric" placeholder="50" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={s.scBtnRow}>
                    <TouchableOpacity style={s.scBackBtn} onPress={() => setSchedinaStep(1)}>
                      <Ionicons name="arrow-back" size={16} color={colors.textMuted} />
                      <Text style={s.scBackText}>Indietro</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.scNextBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSchedinaStep(3); }}>
                      <Text style={s.scNextText}>Avanti</Text>
                      <Ionicons name="arrow-forward" size={16} color={colors.background} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Step 3: Risk */}
              {schedinaStep === 3 && (
                <View style={s.scStepContent}>
                  <Text style={s.scStepTitle}>Livello di rischio?</Text>
                  <Text style={s.scStepSub}>Scegli quanto vuoi rischiare</Text>
                  <View style={s.scRiskOptions}>
                    {RISK_LEVELS.map(r => (
                      <TouchableOpacity key={r.key} style={[s.scRiskOption, schedinaRisk === r.key && s.scRiskOptionActive]} onPress={() => { Haptics.selectionAsync(); setSchedinaRisk(r.key); }}>
                        <Text style={s.scRiskEmoji}>{r.emoji}</Text>
                        <Text style={[s.scRiskLabel, schedinaRisk === r.key && s.scRiskLabelActive]}>{r.label}</Text>
                        <Text style={s.scRiskDesc}>{r.desc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={s.scBtnRow}>
                    <TouchableOpacity style={s.scBackBtn} onPress={() => setSchedinaStep(2)}>
                      <Ionicons name="arrow-back" size={16} color={colors.textMuted} />
                      <Text style={s.scBackText}>Indietro</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.scGenerateBtn} onPress={handleGenerateSchedina}>
                      <Ionicons name="sparkles" size={16} color={colors.background} />
                      <Text style={s.scGenerateText}>Genera Schedina</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Step 4: Generating / Result */}
              {schedinaStep === 4 && (
                <View style={s.scStepContent}>
                  {schedinaGenerating ? (
                    <View style={s.scGenerating}>
                      <ActivityIndicator size="large" color={colors.gold} />
                      <Text style={s.scGenTitle}>L'AI sta creando la tua schedina...</Text>
                      <Text style={s.scGenSub}>Analisi di {schedinaEvents} eventi in corso</Text>
                    </View>
                  ) : schedinaResult ? (
                    <View style={s.scResult}>
                      <View style={s.scResultHeader}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                        <Text style={s.scResultTitle}>Ecco la tua schedina personalizzata</Text>
                      </View>
                      <Text style={s.scResultSub}>Abbiamo creato questa schedina in base ai tuoi obiettivi utilizzando l'analisi AI.</Text>
                      <View style={s.scResultParams}>
                        <View style={s.scResultParam}><Text style={s.scResultParamLabel}>Eventi</Text><Text style={s.scResultParamValue}>{schedinaEvents}</Text></View>
                        <View style={s.scResultParam}><Text style={s.scResultParamLabel}>Puntata</Text><Text style={s.scResultParamValue}>€{schedinaStake}</Text></View>
                        <View style={s.scResultParam}><Text style={s.scResultParamLabel}>Target</Text><Text style={s.scResultParamValue}>€{schedinaTarget}</Text></View>
                        <View style={s.scResultParam}><Text style={s.scResultParamLabel}>Rischio</Text><Text style={s.scResultParamValue}>{RISK_LEVELS.find(r => r.key === schedinaRisk)?.emoji}</Text></View>
                      </View>
                      <View style={s.scResultBody}>
                        <Text style={s.scResultText}>{schedinaResult.response}</Text>
                      </View>
                      <TouchableOpacity style={s.scNewBtn} onPress={() => { setSchedinaStep(0); setSchedinaResult(null); }}>
                        <Ionicons name="refresh" size={16} color={colors.primary} />
                        <Text style={s.scNewBtnText}>Crea un'altra schedina</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  // Schedina CTA
  schedinaCTA: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.gold, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 18 },
  schedinaCTATextWrap: { flex: 1 },
  schedinaCTATitle: { color: colors.background, fontSize: 16, fontWeight: '900' },
  schedinaCTASub: { color: 'rgba(0,0,0,0.5)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  // Schedina Modal
  scModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  scModal: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', paddingTop: 20, paddingHorizontal: 20 },
  scHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  scHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scHeaderTitle: { color: colors.gold, fontSize: 16, fontWeight: '800' },
  scCloseBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scSteps: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  scStepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  scStepDotActive: { backgroundColor: colors.gold, width: 24 },
  scStepContent: { gap: 16 },
  scStepTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  scStepSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  scOptionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 },
  scOption: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border },
  scOptionActive: { borderColor: colors.gold, backgroundColor: 'rgba(255,215,0,0.1)' },
  scOptionText: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  scOptionTextActive: { color: colors.gold },
  scInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 18 },
  scInputPrefix: { color: colors.gold, fontSize: 24, fontWeight: '900', marginRight: 8 },
  scInput: { flex: 1, color: colors.textPrimary, fontSize: 24, fontWeight: '800', paddingVertical: 16 },
  scBtnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  scBackBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  scBackText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  scNextBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary },
  scNextText: { color: colors.background, fontSize: 15, fontWeight: '800' },
  scRiskOptions: { gap: 10, marginTop: 4 },
  scRiskOption: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.background, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: colors.border },
  scRiskOptionActive: { borderColor: colors.gold, backgroundColor: 'rgba(255,215,0,0.06)' },
  scRiskEmoji: { fontSize: 24 },
  scRiskLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', flex: 1 },
  scRiskLabelActive: { color: colors.gold },
  scRiskDesc: { color: colors.textMuted, fontSize: 11, flex: 2 },
  scGenerateBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.gold },
  scGenerateText: { color: colors.background, fontSize: 15, fontWeight: '900' },
  scGenerating: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  scGenTitle: { color: colors.gold, fontSize: 16, fontWeight: '800' },
  scGenSub: { color: colors.textMuted, fontSize: 12 },
  scResult: { gap: 14 },
  scResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scResultTitle: { color: colors.primary, fontSize: 17, fontWeight: '800', flex: 1 },
  scResultSub: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  scResultParams: { flexDirection: 'row', gap: 8 },
  scResultParam: { flex: 1, backgroundColor: colors.background, borderRadius: 14, padding: 10, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border },
  scResultParamLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  scResultParamValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  scResultBody: { backgroundColor: colors.background, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)' },
  scResultText: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  scNewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary },
  scNewBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
