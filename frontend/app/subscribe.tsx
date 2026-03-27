import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext';
import { subscriptionAPI } from '../src/utils/api';
import { colors } from '../src/utils/theme';
import { SubscriptionPlan } from '../src/types';

export default function SubscribeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [trial, setTrial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const data = await subscriptionAPI.getPlans();
      setPlans(data.plans);
      setTrial(data.trial);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setSubscribing(planId);
    try {
      await subscriptionAPI.subscribe(planId);
      await refreshUser();
      Alert.alert('Successo!', `Abbonamento ${planId.toUpperCase()} attivato!`, [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (e: any) {
      Alert.alert('Errore', e.response?.data?.detail || 'Errore durante l\'abbonamento');
    } finally {
      setSubscribing(null);
    }
  };

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
          <Text style={styles.subtitle}>Accesso completo ai dati e alle previsioni AI</Text>
        </View>

        {trial?.available && (
          <TouchableOpacity style={styles.trialBanner}>
            <LinearGradient colors={[colors.gold, colors.goldDark]} style={styles.trialGradient}>
              <Ionicons name="gift" size={24} color={colors.background} />
              <Text style={styles.trialText}>{trial.text}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <View key={plan.id} style={[
              styles.planCard,
              plan.highlighted && styles.planCardHighlighted,
              plan.id === 'premium' && styles.planCardPremium
            ]}>
              {plan.badge && (
                <View style={[styles.badge, plan.id === 'premium' ? styles.badgePremium : styles.badgePro]}>
                  <Text style={styles.badgeText}>{plan.badge}</Text>
                </View>
              )}

              <Text style={styles.planName}>{plan.name}</Text>
              
              <View style={styles.priceRow}>
                <Text style={styles.priceSymbol}>€</Text>
                <Text style={[styles.priceValue, plan.highlighted && styles.priceValueHighlighted]}>
                  {plan.price.toFixed(2).split('.')[0]}
                </Text>
                <Text style={styles.priceCents}>,{plan.price.toFixed(2).split('.')[1]}</Text>
                <Text style={styles.pricePeriod}>/{plan.period}</Text>
              </View>

              <View style={styles.featuresList}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color={plan.highlighted ? colors.primary : colors.textSecondary} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.subscribeBtn,
                  plan.highlighted && styles.subscribeBtnHighlighted,
                  plan.id === 'premium' && styles.subscribeBtnPremium
                ]}
                onPress={() => handleSubscribe(plan.id)}
                disabled={subscribing !== null}
              >
                {subscribing === plan.id ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={[
                    styles.subscribeBtnText,
                    (plan.highlighted || plan.id === 'premium') && styles.subscribeBtnTextDark
                  ]}>
                    {user?.subscription_tier === plan.id ? 'Attivo' : 'Scegli'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.guaranteeSection}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          <Text style={styles.guaranteeText}>Garanzia soddisfatti o rimborsati 7 giorni</Text>
        </View>

        <Text style={styles.disclaimer}>
          L'abbonamento si rinnova automaticamente. Puoi cancellare in qualsiasi momento.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 8 },
  header: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, marginBottom: 24 },
  iconBg: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  trialBanner: { marginHorizontal: 20, marginBottom: 24, borderRadius: 16, overflow: 'hidden' },
  trialGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16 },
  trialText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  plansContainer: { paddingHorizontal: 20, gap: 16 },
  planCard: { backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 2, borderColor: colors.border },
  planCardHighlighted: { borderColor: colors.primary, backgroundColor: 'rgba(0, 255, 136, 0.05)' },
  planCardPremium: { borderColor: colors.gold, backgroundColor: 'rgba(255, 215, 0, 0.05)' },
  badge: { position: 'absolute', top: -12, right: 20, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  badgePro: { backgroundColor: colors.primary },
  badgePremium: { backgroundColor: colors.gold },
  badgeText: { color: colors.background, fontSize: 11, fontWeight: '700' },
  planName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  priceSymbol: { fontSize: 18, color: colors.textSecondary, marginBottom: 4 },
  priceValue: { fontSize: 40, fontWeight: '800', color: colors.textPrimary },
  priceValueHighlighted: { color: colors.primary },
  priceCents: { fontSize: 20, color: colors.textSecondary, marginBottom: 4 },
  pricePeriod: { fontSize: 14, color: colors.textMuted, marginLeft: 4, marginBottom: 8 },
  featuresList: { gap: 10, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { color: colors.textPrimary, fontSize: 14 },
  subscribeBtn: { backgroundColor: colors.secondary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  subscribeBtnHighlighted: { backgroundColor: colors.primary },
  subscribeBtnPremium: { backgroundColor: colors.gold },
  subscribeBtnText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  subscribeBtnTextDark: { color: colors.background },
  guaranteeSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, marginBottom: 16 },
  guaranteeText: { color: colors.textSecondary, fontSize: 13 },
  disclaimer: { color: colors.textMuted, fontSize: 11, textAlign: 'center', paddingHorizontal: 40, marginBottom: 40, lineHeight: 16 },
});
