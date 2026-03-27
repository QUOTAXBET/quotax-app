import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { betsAPI } from '../utils/api';

const colors = {
  background: '#0B0F14',
  card: '#1A2332',
  primary: '#00FF88',
  gold: '#FFD700',
  loss: '#FF4D4D',
  pending: '#FFB800',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#2A3847',
};

interface BetSlipProps {
  match: any;
  prediction?: any;
  onClose: () => void;
  onBetPlaced?: () => void;
  isLoggedIn: boolean;
}

export default function BetSlip({ match, prediction, onClose, onBetPlaced, isLoggedIn }: BetSlipProps) {
  const [selectedBet, setSelectedBet] = useState<string>('');
  const [stake, setStake] = useState<string>('');
  const [simulation, setSimulation] = useState<any>(null);
  const [betResult, setBetResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string>('');

  // Animations
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Pulse CTA
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const showResultAnimation = () => {
    Animated.parallel([
      Animated.spring(resultScale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
      Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const simulateBet = async () => {
    if (!selectedBet || !stake || parseFloat(stake) <= 0) {
      setError('Seleziona un esito e inserisci la puntata');
      return;
    }
    
    setLoading(true);
    setError('');
    setBetResult(null);
    resultScale.setValue(0);
    resultOpacity.setValue(0);
    
    try {
      const result = await betsAPI.simulate(match.match_id, selectedBet, parseFloat(stake));
      setSimulation(result);
      setTimeout(() => showResultAnimation(), 100);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Simulazione fallita');
    } finally {
      setLoading(false);
    }
  };

  const placeBet = async () => {
    if (!isLoggedIn) {
      setError('Accedi per piazzare scommesse');
      return;
    }
    
    setPlacing(true);
    setError('');
    try {
      const result = await betsAPI.place(match.match_id, selectedBet, parseFloat(stake));
      setBetResult(result);
      resultScale.setValue(0);
      resultOpacity.setValue(0);
      setTimeout(() => showResultAnimation(), 100);
      if (result.won) {
        onBetPlaced?.();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore nel piazzare la scommessa');
    } finally {
      setPlacing(false);
    }
  };

  const betOptions = [
    { type: 'home', label: match.home_team, odds: match.odds_home },
    ...(match.odds_draw ? [{ type: 'draw', label: 'Pareggio', odds: match.odds_draw }] : []),
    { type: 'away', label: match.away_team, odds: match.odds_away },
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="calculator" size={20} color={colors.primary} />
              <Text style={styles.title}>Simulatore</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Match Info */}
          <View style={styles.matchInfo}>
            <Text style={styles.matchTitle}>{match.home_team} vs {match.away_team}</Text>
            <Text style={styles.matchLeague}>{match.league}</Text>
          </View>

          {/* AI Suggestion */}
          {prediction && (
            <View style={styles.aiSuggestion}>
              <Ionicons name="sparkles" size={16} color={colors.gold} />
              <Text style={styles.aiText}>
                Suggerimento AI: <Text style={styles.aiHighlight}>
                  {prediction.predicted_outcome === 'home' ? match.home_team : prediction.predicted_outcome === 'away' ? match.away_team : 'Pareggio'}
                </Text> ({prediction.confidence}% sicurezza)
              </Text>
            </View>
          )}

          {/* Bet Options */}
          <Text style={styles.sectionTitle}>SELEZIONA ESITO</Text>
          <View style={styles.betOptions}>
            {betOptions.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[styles.betOption, selectedBet === option.type && styles.betOptionSelected]}
                onPress={() => setSelectedBet(option.type)}
                activeOpacity={0.7}
              >
                <Text style={[styles.betLabel, selectedBet === option.type && styles.betLabelSelected]} numberOfLines={1}>
                  {option.label}
                </Text>
                <Text style={[styles.betOdds, selectedBet === option.type && styles.betOddsSelected]}>
                  {option.odds}
                </Text>
                {prediction && prediction.predicted_outcome === option.type && (
                  <View style={styles.aiDot}>
                    <Ionicons name="sparkles" size={10} color={colors.gold} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Stake Input */}
          <Text style={styles.sectionTitle}>IMPORTO (\u20AC)</Text>
          <TextInput
            style={styles.input}
            value={stake}
            onChangeText={setStake}
            keyboardType="decimal-pad"
            placeholder="Inserisci importo"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.quickStakes}>
            {[10, 25, 50, 100].map((amount) => (
              <TouchableOpacity 
                key={amount} 
                style={[styles.quickStake, stake === amount.toString() && styles.quickStakeActive]} 
                onPress={() => setStake(amount.toString())}
              >
                <Text style={[styles.quickStakeText, stake === amount.toString() && styles.quickStakeTextActive]}>\u20AC{amount}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Simulate Button */}
          <Animated.View style={{ transform: [{ scale: !simulation ? pulseAnim : 1 }] }}>
            <TouchableOpacity style={styles.simulateButton} onPress={simulateBet} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.background} /> : (
                <>
                  <Ionicons name="calculator" size={20} color={colors.background} />
                  <Text style={styles.simulateText}>Simula Scommessa</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Simulation Result */}
          {simulation && !betResult && (
            <Animated.View style={[styles.simulationResult, { transform: [{ scale: resultScale }], opacity: resultOpacity }]}>
              <View style={styles.simHeader}>
                <Ionicons name="analytics" size={20} color={colors.primary} />
                <Text style={styles.simulationTitle}>Risultato Simulazione</Text>
              </View>
              <View style={styles.simulationGrid}>
                <View style={styles.simItem}>
                  <Text style={styles.simLabel}>Vincita Potenziale</Text>
                  <Text style={styles.simValue}>\u20AC{simulation.potential_payout.toFixed(2)}</Text>
                </View>
                <View style={styles.simItem}>
                  <Text style={styles.simLabel}>Profitto</Text>
                  <Text style={[styles.simValue, { color: colors.primary }]}>+\u20AC{simulation.potential_profit.toFixed(2)}</Text>
                </View>
                <View style={styles.simItem}>
                  <Text style={styles.simLabel}>Probabilit\u00e0</Text>
                  <Text style={styles.simValue}>{simulation.win_probability.toFixed(1)}%</Text>
                </View>
                <View style={styles.simItem}>
                  <Text style={styles.simLabel}>Valore Atteso</Text>
                  <Text style={[styles.simValue, { color: simulation.expected_value >= 0 ? colors.primary : colors.loss }]}>
                    {simulation.expected_value >= 0 ? '+' : ''}\u20AC{simulation.expected_value.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Risk indicator */}
              <View style={styles.riskRow}>
                <Text style={styles.riskLabel}>Rischio:</Text>
                <View style={[styles.riskBadge, { 
                  backgroundColor: simulation.risk_level === 'low' ? colors.primary + '20' : 
                    simulation.risk_level === 'medium' ? colors.pending + '20' : colors.loss + '20' 
                }]}>
                  <Text style={[styles.riskText, { 
                    color: simulation.risk_level === 'low' ? colors.primary : 
                      simulation.risk_level === 'medium' ? colors.pending : colors.loss 
                  }]}>
                    {simulation.risk_level === 'low' ? 'BASSO' : simulation.risk_level === 'medium' ? 'MEDIO' : 'ALTO'}
                  </Text>
                </View>
              </View>

              {isLoggedIn ? (
                <TouchableOpacity style={styles.placeButton} onPress={placeBet} disabled={placing}>
                  {placing ? <ActivityIndicator color={colors.background} /> : (
                    <>
                      <Ionicons name="flash" size={18} color={colors.background} />
                      <Text style={styles.placeText}>Piazza Scommessa Virtuale</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.loginHint}>
                  <Ionicons name="lock-closed" size={16} color={colors.gold} />
                  <Text style={styles.loginHintText}>Accedi per piazzare scommesse virtuali</Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* Bet Result */}
          {betResult && (
            <Animated.View style={[styles.betResultContainer, { transform: [{ scale: resultScale }], opacity: resultOpacity }]}>
              <View style={[styles.betResultCard, betResult.won ? styles.betResultWon : styles.betResultLost]}>
                <Ionicons 
                  name={betResult.won ? 'checkmark-circle' : 'close-circle'} 
                  size={48} 
                  color={betResult.won ? colors.primary : colors.loss} 
                />
                <Text style={[styles.betResultTitle, { color: betResult.won ? colors.primary : colors.loss }]}>
                  {betResult.won ? 'HAI VINTO!' : 'SCOMMESSA PERSA'}
                </Text>
                <Text style={styles.betResultMessage}>{betResult.message}</Text>
                {betResult.won && (
                  <Text style={styles.betResultPayout}>+\u20AC{betResult.payout.toFixed(2)}</Text>
                )}
                <Text style={styles.betResultBalance}>Saldo: \u20AC{betResult.new_balance.toFixed(2)}</Text>
                <TouchableOpacity style={styles.closeResultBtn} onPress={onClose}>
                  <Text style={styles.closeResultText}>Chiudi</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  closeBtn: { padding: 4 },
  matchInfo: { marginBottom: 16 },
  matchTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  matchLeague: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  aiSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.2)' },
  aiText: { color: colors.textSecondary, fontSize: 13, flex: 1 },
  aiHighlight: { color: colors.gold, fontWeight: '700' },
  sectionTitle: { color: colors.textSecondary, fontSize: 11, marginBottom: 10, letterSpacing: 1.5, fontWeight: '600' },
  betOptions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  betOption: { flex: 1, backgroundColor: colors.background, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  betOptionSelected: { borderColor: colors.primary, backgroundColor: 'rgba(0, 255, 136, 0.08)' },
  betLabel: { color: colors.textSecondary, fontSize: 11, marginBottom: 4 },
  betLabelSelected: { color: colors.textPrimary },
  betOdds: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  betOddsSelected: { color: colors.primary },
  aiDot: { position: 'absolute', top: 4, right: 4 },
  input: { backgroundColor: colors.background, borderRadius: 14, padding: 16, color: colors.textPrimary, fontSize: 20, fontWeight: '600', marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  quickStakes: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickStake: { flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  quickStakeActive: { backgroundColor: 'rgba(0, 255, 136, 0.1)', borderColor: colors.primary },
  quickStakeText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  quickStakeTextActive: { color: colors.primary },
  error: { color: colors.loss, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  simulateButton: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  simulateText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  simulationResult: { marginTop: 20, backgroundColor: colors.background, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border },
  simHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  simulationTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  simulationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  simItem: { width: '47%', backgroundColor: colors.card, borderRadius: 12, padding: 12 },
  simLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  simValue: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  riskLabel: { color: colors.textSecondary, fontSize: 13 },
  riskBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  riskText: { fontSize: 12, fontWeight: '700' },
  placeButton: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, marginTop: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  placeText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  loginHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: 14, backgroundColor: 'rgba(255, 215, 0, 0.08)', borderRadius: 12 },
  loginHintText: { color: colors.gold, fontSize: 13 },
  betResultContainer: { marginTop: 20 },
  betResultCard: { borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 2 },
  betResultWon: { backgroundColor: 'rgba(0, 255, 136, 0.08)', borderColor: colors.primary },
  betResultLost: { backgroundColor: 'rgba(255, 77, 77, 0.08)', borderColor: colors.loss },
  betResultTitle: { fontSize: 24, fontWeight: '800', marginTop: 12 },
  betResultMessage: { color: colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' },
  betResultPayout: { color: colors.primary, fontSize: 36, fontWeight: '800', marginTop: 12 },
  betResultBalance: { color: colors.textSecondary, fontSize: 14, marginTop: 8 },
  closeResultBtn: { backgroundColor: colors.card, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  closeResultText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
});
