import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { aiAPI } from '../../src/utils/api';
import { colors } from '../../src/utils/theme';
import { AIPrediction } from '../../src/types';

export default function AIScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const result = await aiAPI.getPredictions();
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.gold} /></View>;
  }

  // Locked state for guests and free users
  if (data?.locked) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles" size={24} color={colors.gold} />
            <Text style={styles.title}>AI Predictions</Text>
          </View>
        </View>

        <View style={styles.lockedContainer}>
          <LinearGradient colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.05)']} style={styles.lockedCard}>
            <Ionicons name="lock-closed" size={48} color={colors.gold} />
            <Text style={styles.lockedTitle}>Contenuto Premium</Text>
            <Text style={styles.lockedSubtitle}>{data.message}</Text>

            {/* Preview */}
            {data.preview && data.preview.length > 0 && (
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>Anteprima</Text>
                {data.preview.map((pred: AIPrediction) => (
                  <View key={pred.prediction_id} style={styles.previewCard}>
                    <View style={styles.previewHeader}>
                      <Text style={styles.previewLeague}>{pred.league}</Text>
                      {pred.is_value_bet && (
                        <View style={styles.valueBadge}>
                          <Text style={styles.valueBadgeText}>VALUE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.previewMatch}>{pred.home} vs {pred.away}</Text>
                    <View style={styles.blurOverlay}>
                      <Text style={styles.blurText}>Sblocca per vedere</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.upgradeCta} onPress={() => router.push('/subscribe')}>
              <LinearGradient colors={[colors.gold, colors.goldDark]} style={styles.upgradeGradient}>
                <Ionicons name="diamond" size={20} color={colors.background} />
                <Text style={styles.upgradeText}>Sblocca AI Predictions</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  // Full access
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={24} color={colors.gold} />
          <Text style={styles.title}>AI Predictions</Text>
        </View>
        {data.limited && (
          <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/subscribe')}>
            <Text style={styles.upgradeBtnText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {data.predictions?.map((pred: AIPrediction) => (
          <View key={pred.prediction_id} style={[styles.predictionCard, pred.is_value_bet && styles.valueBetCard]}>
            {pred.is_value_bet && (
              <View style={styles.valueBanner}>
                <Ionicons name="flash" size={14} color={colors.background} />
                <Text style={styles.valueBannerText}>VALUE BET</Text>
              </View>
            )}

            <View style={styles.predHeader}>
              <Text style={styles.predLeague}>{pred.league}</Text>
              <Text style={styles.predOdds}>@{pred.odds.toFixed(2)}</Text>
            </View>

            <Text style={styles.predMatch}>{pred.home} vs {pred.away}</Text>

            <View style={styles.predictionMain}>
              <View style={styles.predictionOutcome}>
                <Text style={styles.predictionLabel}>Previsione AI</Text>
                <Text style={styles.predictionValue}>
                  {pred.predicted_outcome === 'home' ? pred.home : pred.predicted_outcome === 'away' ? pred.away : 'Pareggio'}
                </Text>
              </View>
              <View style={styles.confidenceBar}>
                <View style={[styles.confidenceFill, { width: `${pred.confidence}%` }]} />
              </View>
              <Text style={styles.confidenceText}>{pred.confidence}% sicurezza</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Probabilità</Text>
                <Text style={styles.statValue}>{(pred.probability * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Value Rating</Text>
                <Text style={[styles.statValue, { color: pred.value_rating > 1.1 ? colors.primary : colors.textPrimary }]}>
                  {pred.value_rating.toFixed(2)}x
                </Text>
              </View>
            </View>

            <View style={styles.analysisBox}>
              <Ionicons name="bulb" size={16} color={colors.gold} />
              <Text style={styles.analysisText}>{pred.analysis}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  upgradeBtn: { backgroundColor: colors.gold, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  upgradeBtnText: { color: colors.background, fontWeight: '700', fontSize: 13 },
  lockedContainer: { flex: 1, padding: 20 },
  lockedCard: { flex: 1, borderRadius: 24, padding: 24, alignItems: 'center', justifyContent: 'center' },
  lockedTitle: { color: colors.gold, fontSize: 24, fontWeight: '800', marginTop: 16 },
  lockedSubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8 },
  previewSection: { width: '100%', marginTop: 24 },
  previewTitle: { color: colors.textSecondary, fontSize: 12, marginBottom: 12 },
  previewCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  previewLeague: { color: colors.textMuted, fontSize: 11 },
  valueBadge: { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  valueBadgeText: { color: colors.background, fontSize: 9, fontWeight: '700' },
  previewMatch: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  blurOverlay: { backgroundColor: colors.overlay, borderRadius: 8, padding: 12, marginTop: 12, alignItems: 'center' },
  blurText: { color: colors.gold, fontSize: 12 },
  upgradeCta: { width: '100%', marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  upgradeGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  upgradeText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  scrollContent: { padding: 20 },
  predictionCard: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  valueBetCard: { borderColor: colors.primary },
  valueBanner: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  valueBannerText: { color: colors.background, fontSize: 10, fontWeight: '700' },
  predHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  predLeague: { color: colors.textMuted, fontSize: 12 },
  predOdds: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  predMatch: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  predictionMain: { backgroundColor: colors.secondary, borderRadius: 16, padding: 16, marginBottom: 16 },
  predictionOutcome: { alignItems: 'center', marginBottom: 12 },
  predictionLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  predictionValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  confidenceBar: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  confidenceFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  confidenceText: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  statItem: { alignItems: 'center' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  statValue: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  analysisBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: 12, borderRadius: 12 },
  analysisText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
