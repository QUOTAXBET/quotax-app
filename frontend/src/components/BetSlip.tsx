import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { betsAPI } from '../utils/api';

const colors = {
  background: '#0B0F14',
  card: '#1A2332',
  primary: '#00FF88',
  gold: '#FFD700',
  loss: '#FF4D4D',
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
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string>('');

  const simulateBet = async () => {
    if (!selectedBet || !stake || parseFloat(stake) <= 0) {
      setError('Seleziona un esito e inserisci la puntata');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const result = await betsAPI.simulate(match.match_id, selectedBet, parseFloat(stake));
      setSimulation(result);
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
      await betsAPI.place(match.match_id, selectedBet, parseFloat(stake));
      onBetPlaced?.();
      onClose();
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scommetti</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.matchTitle}>{match.home_team} vs {match.away_team}</Text>
      <Text style={styles.matchLeague}>{match.league}</Text>

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

      <Text style={styles.sectionTitle}>Seleziona Esito</Text>
      <View style={styles.betOptions}>
        {betOptions.map((option) => (
          <TouchableOpacity
            key={option.type}
            style={[styles.betOption, selectedBet === option.type && styles.betOptionSelected]}
            onPress={() => setSelectedBet(option.type)}
          >
            <Text style={[styles.betLabel, selectedBet === option.type && styles.betLabelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
            <Text style={[styles.betOdds, selectedBet === option.type && styles.betOddsSelected]}>
              {option.odds}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Importo (€)</Text>
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
          <TouchableOpacity key={amount} style={styles.quickStake} onPress={() => setStake(amount.toString())}>
            <Text style={styles.quickStakeText}>€{amount}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.simulateButton} onPress={simulateBet} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.background} /> : (
          <><Ionicons name="calculator" size={20} color={colors.background} /><Text style={styles.simulateText}>Simula Scommessa</Text></>
        )}
      </TouchableOpacity>

      {simulation && (
        <View style={styles.simulationResult}>
          <Text style={styles.simulationTitle}>Risultato Simulazione</Text>
          <View style={styles.simulationGrid}>
            <View style={styles.simItem}>
              <Text style={styles.simLabel}>Vincita Potenziale</Text>
              <Text style={styles.simValue}>€{simulation.potential_payout.toFixed(2)}</Text>
            </View>
            <View style={styles.simItem}>
              <Text style={styles.simLabel}>Profitto</Text>
              <Text style={[styles.simValue, { color: colors.primary }]}>+€{simulation.potential_profit.toFixed(2)}</Text>
            </View>
            <View style={styles.simItem}>
              <Text style={styles.simLabel}>Probabilità</Text>
              <Text style={styles.simValue}>{simulation.win_probability.toFixed(1)}%</Text>
            </View>
            <View style={styles.simItem}>
              <Text style={styles.simLabel}>Valore Atteso</Text>
              <Text style={[styles.simValue, { color: simulation.expected_value >= 0 ? colors.primary : colors.loss }]}>
                {simulation.expected_value >= 0 ? '+' : ''}€{simulation.expected_value.toFixed(2)}
              </Text>
            </View>
          </View>

          {isLoggedIn && (
            <TouchableOpacity style={styles.placeButton} onPress={placeBet} disabled={placing}>
              {placing ? <ActivityIndicator color={colors.background} /> : <Text style={styles.placeText}>Piazza Scommessa</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  matchTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  matchLeague: { color: colors.textMuted, fontSize: 13, marginBottom: 16 },
  aiSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: 12, borderRadius: 12, marginBottom: 16 },
  aiText: { color: colors.textSecondary, fontSize: 13, flex: 1 },
  aiHighlight: { color: colors.gold, fontWeight: '700' },
  sectionTitle: { color: colors.textSecondary, fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  betOptions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  betOption: { flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  betOptionSelected: { borderColor: colors.primary, backgroundColor: 'rgba(0, 255, 136, 0.1)' },
  betLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 4 },
  betLabelSelected: { color: colors.textPrimary },
  betOdds: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  betOddsSelected: { color: colors.primary },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 16, color: colors.textPrimary, fontSize: 18, marginBottom: 12 },
  quickStakes: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickStake: { flex: 1, backgroundColor: colors.border, borderRadius: 8, padding: 10, alignItems: 'center' },
  quickStakeText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  error: { color: colors.loss, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  simulateButton: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  simulateText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  simulationResult: { marginTop: 20, backgroundColor: colors.background, borderRadius: 16, padding: 16 },
  simulationTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 16 },
  simulationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  simItem: { width: '48%' },
  simLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  simValue: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  placeButton: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center' },
  placeText: { color: colors.background, fontSize: 16, fontWeight: '700' },
});
