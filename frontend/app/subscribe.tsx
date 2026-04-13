import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext';
import { subscriptionAPI } from '../src/utils/api';
import { colors } from '../src/utils/theme';

export default function SubscribeScreen() {
  const router = useRouter();
  const { plan: planFilter } = useLocalSearchParams<{ plan?: string }>();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [trial, setTrial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Animations
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const fomoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchPlans();
    // FOMO pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(fomoAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(fomoAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fetchPlans = async () => {
    try {
      const data = await subscriptionAPI.getPlans();
      let allPlans = data.plans || [];
      // Filter plans if a specific plan is requested via query param
      if (planFilter === 'elite') {
        allPlans = allPlans.filter((p: any) => p.id === 'premium');
      } else if (planFilter === 'pro') {
        allPlans = allPlans.filter((p: any) => p.id === 'pro');
      }
      setPlans(allPlans);
      setTrial(data.trial);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan: any) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setSelectedPlan(plan);
    setShowConfirm(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPlan) return;
    setSubscribing(selectedPlan.id);
    setShowConfirm(false);
    
    try {
      await subscriptionAPI.subscribe(selectedPlan.id);
      await refreshUser();
      
      // Success animation
      setShowSuccess(true);
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } catch (e: any) {
      console.error('Subscribe error:', e);
    } finally {
      setSubscribing(null);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    successScale.setValue(0);
    successOpacity.setValue(0);
    router.replace('/(tabs)');
  };

  const fomoOpacity = fomoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.iconBg}>
            <Ionicons name="diamond" size={32} color={colors.background} />
          </LinearGradient>
          <Text style={styles.title}>Sblocca il Vero Vantaggio</Text>
          <Text style={styles.subtitle}>Accesso completo ai pronostici AI e analisi avanzate</Text>
        </View>

        {/* FOMO counter */}
        <Animated.View style={[styles.fomoBanner, { opacity: fomoOpacity }]}>
          <Ionicons name="people" size={18} color={colors.primary} />
          <Text style={styles.fomoText}>
            <Text style={styles.fomoHighlight}>{Math.floor(Math.random() * 20) + 35}</Text> persone si sono abbonate oggi
          </Text>
        </Animated.View>

        {/* Tier comparison removed - trial info now inline on each plan */}

        <View style={styles.plansContainer}>
          {plans.map((plan) => {
            const isActive = user?.subscription_tier === plan.id;
            const isElite = plan.id === 'premium';
            const firstMonthPrice = plan.first_month_price;
            return (
              <View key={plan.id} style={[
                styles.planCard,
                plan.highlighted && styles.planCardHighlighted,
                isElite && styles.planCardPremium,
                isActive && styles.planCardActive
              ]}>
                {plan.badge && (
                  <View style={[styles.badge, isElite ? styles.badgePremium : styles.badgePro]}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}

                <Text style={styles.planName}>{plan.name}</Text>
                
                <View style={styles.priceRow}>
                  <Text style={styles.priceSymbol}>{'\u20AC'}</Text>
                  <Text style={[styles.priceValue, plan.highlighted && styles.priceValueHighlighted, isElite && styles.priceValuePremium]}>
                    {plan.price.toFixed(2).split('.')[0]}
                  </Text>
                  <Text style={styles.priceCents}>,{plan.price.toFixed(2).split('.')[1]}</Text>
                  <Text style={styles.pricePeriod}>/{plan.period}</Text>
                </View>

                {/* First month discount for Elite */}
                {firstMonthPrice && !isActive && (
                  <View style={styles.firstMonthBanner}>
                    <Ionicons name="pricetag" size={14} color={colors.gold} />
                    <Text style={styles.firstMonthText}>Primo mese a solo €{firstMonthPrice.toFixed(2)}</Text>
                  </View>
                )}

                {/* Trial banner for Pro */}
                {plan.trial && !isActive && (
                  <View style={styles.trialInline}>
                    <Ionicons name="gift" size={14} color={colors.primary} />
                    <Text style={styles.trialInlineText}>{plan.trial.text}</Text>
                  </View>
                )}

                <View style={styles.featuresList}>
                  {plan.features.map((feature: string, idx: number) => (
                    <View key={idx} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={18} color={isElite ? colors.gold : plan.highlighted ? colors.primary : colors.textSecondary} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.subscribeBtn,
                    plan.highlighted && styles.subscribeBtnHighlighted,
                    isElite && styles.subscribeBtnPremium,
                    isActive && styles.subscribeBtnActive,
                  ]}
                  onPress={() => !isActive && handlePlanSelect(plan)}
                  disabled={subscribing !== null || isActive}
                >
                  {subscribing === plan.id ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={[
                      styles.subscribeBtnText,
                      (plan.highlighted || isElite) && styles.subscribeBtnTextDark,
                      isActive && styles.subscribeBtnTextActive,
                    ]}>
                      {isActive ? 'Piano Attivo' : isElite ? 'Passa a Elite' : plan.id === 'pro' ? 'Attiva Pro ora' : 'Scegli Piano'}
                    </Text>
                  )}
                </TouchableOpacity>

                {isElite && !isActive && firstMonthPrice && (
                  <Text style={styles.limitedOffer}>Risparmia €{(plan.price - firstMonthPrice).toFixed(2)} il primo mese!</Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.guaranteeSection}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          <Text style={styles.guaranteeText}>Garanzia soddisfatti o rimborsati 7 giorni</Text>
        </View>

        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
            <Text style={styles.trustText}>Pagamento sicuro</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="refresh" size={16} color={colors.textMuted} />
            <Text style={styles.trustText}>Cancella quando vuoi</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          L'abbonamento si rinnova automaticamente. Puoi cancellare in qualsiasi momento. Questo {'\u00e8'} un simulatore, nessun pagamento reale viene effettuato.
        </Text>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Conferma Abbonamento</Text>
            {selectedPlan && (
              <>
                <View style={styles.confirmPlanRow}>
                  <Text style={styles.confirmPlanName}>{selectedPlan.name}</Text>
                  {selectedPlan.trial ? (
                    <Text style={styles.confirmPlanPrice}>{'\u20AC'}{selectedPlan.trial.price.toFixed(2)}/{selectedPlan.trial.days}gg</Text>
                  ) : selectedPlan.first_month_price ? (
                    <Text style={styles.confirmPlanPrice}>{'\u20AC'}{selectedPlan.first_month_price.toFixed(2)}/1° mese</Text>
                  ) : (
                    <Text style={styles.confirmPlanPrice}>{'\u20AC'}{selectedPlan.price.toFixed(2)}/{selectedPlan.period}</Text>
                  )}
                </View>
                <View style={styles.confirmDivider} />
                {selectedPlan.trial ? (
                  <Text style={styles.confirmNote}>
                    Prova {selectedPlan.trial.days} giorni a solo €{selectedPlan.trial.price.toFixed(2)}, poi €{selectedPlan.price.toFixed(2)}/{selectedPlan.period}. Puoi cancellare in qualsiasi momento.
                  </Text>
                ) : selectedPlan.first_month_price ? (
                  <Text style={styles.confirmNote}>
                    Primo mese a €{selectedPlan.first_month_price.toFixed(2)}, poi €{selectedPlan.price.toFixed(2)}/{selectedPlan.period}. Attivazione immediata.
                  </Text>
                ) : (
                  <Text style={styles.confirmNote}>
                    Attivazione immediata. Accesso completo a tutti i pronostici premium e analisi AI.
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleConfirmPurchase}
                >
                  <Ionicons name="flash" size={18} color={colors.background} />
                  <Text style={styles.confirmBtnText}>Conferma e Attiva</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirm(false)}>
                  <Text style={styles.cancelBtnText}>Annulla</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="none" onRequestClose={handleSuccessClose}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.successCard, { transform: [{ scale: successScale }], opacity: successOpacity }]}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
            </View>
            <Text style={styles.successTitle}>Abbonamento Attivato!</Text>
            <Text style={styles.successSubtitle}>
              Ora hai accesso a tutti i pronostici premium e le analisi AI avanzate.
            </Text>
            <TouchableOpacity style={styles.successBtn} onPress={handleSuccessClose}>
              <Text style={styles.successBtnText}>Inizia a Vincere</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.background} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 8 },
  header: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, marginBottom: 20 },
  iconBg: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  fomoBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: 'rgba(0, 255, 136, 0.08)', borderRadius: 12, marginBottom: 16 },
  fomoText: { color: colors.textSecondary, fontSize: 13 },
  fomoHighlight: { color: colors.primary, fontWeight: '800' },
  trialBanner: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  trialGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16 },
  trialText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  plansContainer: { paddingHorizontal: 20, gap: 16 },
  planCard: { backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 2, borderColor: colors.border, position: 'relative' },
  planCardHighlighted: { borderColor: colors.primary, backgroundColor: 'rgba(0, 255, 136, 0.05)' },
  planCardPremium: { borderColor: colors.gold, backgroundColor: 'rgba(255, 215, 0, 0.05)' },
  planCardActive: { borderColor: colors.primary, backgroundColor: 'rgba(0, 255, 136, 0.1)' },
  badge: { position: 'absolute', top: -12, right: 20, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  badgePro: { backgroundColor: colors.primary },
  badgePremium: { backgroundColor: colors.gold },
  badgeText: { color: colors.background, fontSize: 11, fontWeight: '700' },
  planName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  priceSymbol: { fontSize: 18, color: colors.textSecondary, marginBottom: 4 },
  priceValue: { fontSize: 40, fontWeight: '800', color: colors.textPrimary },
  priceValueHighlighted: { color: colors.primary },
  priceValuePremium: { color: colors.gold },
  priceCents: { fontSize: 20, color: colors.textSecondary, marginBottom: 4 },
  pricePeriod: { fontSize: 14, color: colors.textMuted, marginLeft: 4, marginBottom: 8 },
  featuresList: { gap: 10, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { color: colors.textPrimary, fontSize: 14, flex: 1 },
  subscribeBtn: { backgroundColor: colors.secondary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  subscribeBtnHighlighted: { backgroundColor: colors.primary },
  subscribeBtnPremium: { backgroundColor: colors.gold },
  subscribeBtnActive: { backgroundColor: 'rgba(0, 255, 136, 0.2)', borderWidth: 1, borderColor: colors.primary },
  subscribeBtnText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  subscribeBtnTextDark: { color: colors.background },
  subscribeBtnTextActive: { color: colors.primary },
  limitedOffer: { color: colors.gold, fontSize: 11, textAlign: 'center', marginTop: 10, fontWeight: '600' },
  firstMonthBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,215,0,0.1)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  firstMonthText: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  trialInline: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,255,136,0.1)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,255,136,0.2)' },
  trialInlineText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  guaranteeSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, marginBottom: 12 },
  guaranteeText: { color: colors.textSecondary, fontSize: 13 },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 16 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { color: colors.textMuted, fontSize: 12 },
  disclaimer: { color: colors.textMuted, fontSize: 11, textAlign: 'center', paddingHorizontal: 40, marginBottom: 40, lineHeight: 16 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmCard: { backgroundColor: colors.card, borderRadius: 24, padding: 24, width: '100%', maxWidth: 380 },
  confirmTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  confirmPlanRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  confirmPlanName: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  confirmPlanPrice: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  confirmDivider: { height: 1, backgroundColor: colors.border, marginBottom: 16 },
  confirmNote: { color: colors.textSecondary, fontSize: 13, marginBottom: 20, lineHeight: 20 },
  confirmBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  confirmBtnText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: colors.textMuted, fontSize: 14 },
  successCard: { backgroundColor: colors.card, borderRadius: 24, padding: 32, width: '100%', maxWidth: 380, alignItems: 'center' },
  successIcon: { marginBottom: 16 },
  successTitle: { color: colors.primary, fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  successSubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  successBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', gap: 8 },
  successBtnText: { color: colors.background, fontSize: 16, fontWeight: '700' },
});
