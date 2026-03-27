import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match, SimulationResult } from '../types';
import { betsAPI } from '../utils/api';

interface BetSlipProps {
  match: Match;
  onClose: () => void;
  onBetPlaced?: () => void;
  isLoggedIn: boolean;
}

export default function BetSlip({ match, onClose, onBetPlaced, isLoggedIn }: BetSlipProps) {
  const [selectedBet, setSelectedBet] = useState<string>('');
  const [stake, setStake] = useState<string>('');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Piazza Scommessa</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.matchTitle}>
        {match.home_team} vs {match.away_team}
      </Text>

      <Text style={styles.sectionTitle}>Seleziona Esito</Text>
      <View style={styles.betOptions}>
        {betOptions.map((option) => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.betOption,
              selectedBet === option.type && styles.betOptionSelected,
            ]}
            onPress={() => setSelectedBet(option.type)}
          >
            <Text style={[
              styles.betLabel,
              selectedBet === option.type && styles.betLabelSelected,
            ]} numberOfLines={1}>
              {option.label}
            </Text>
            <Text style={[
              styles.betOdds,
              selectedBet === option.type && styles.betOddsSelected,
            ]}>
              {option.odds}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Importo Puntata (€)</Text>
      <TextInput
        style={styles.input}
        value={stake}
        onChangeText={setStake}
        keyboardType="decimal-pad"
        placeholder="Inserisci importo"
        placeholderTextColor="#6B7280"
      />

      <View style={styles.quickStakes}>
        {[10, 25, 50, 100].map((amount) => (
          <TouchableOpacity
            key={amount}
            style={styles.quickStake}
            onPress={() => setStake(amount.toString())}
          >
            <Text style={styles.quickStakeText}>€{amount}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.simulateButton}
        onPress={simulateBet}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="calculator" size={20} color="#fff" />
            <Text style={styles.simulateText}>Simula Scommessa</Text>
          </>
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
              <Text style={styles.simLabel}>Profitto Potenziale</Text>
              <Text style={[styles.simValue, { color: '#10B981' }]}>
                +€{simulation.potential_profit.toFixed(2)}
              </Text>
            </View>
            <View style={styles.simItem}>
              <Text style={styles.simLabel}>Probabilità Vittoria</Text>
              <Text style={styles.simValue}>{simulation.win_probability.toFixed(1)}%</Text>
            </View>
            <View style={styles.simItem}>
              <Text style={styles.simLabel}>Valore Atteso</Text>
              <Text style={[
                styles.simValue,
                { color: simulation.expected_value >= 0 ? '#10B981' : '#EF4444' }
              ]}>
                {simulation.expected_value >= 0 ? '+' : ''}€{simulation.expected_value.toFixed(2)}
              </Text>
            </View>
          </View>

          {isLoggedIn && (
            <TouchableOpacity
              style={styles.placeButton}
              onPress={placeBet}
              disabled={placing}
            >
              {placing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.placeText}>Piazza Scommessa</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  matchTitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  betOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  betOption: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  betOptionSelected: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  betLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  betLabelSelected: {
    color: '#fff',
  },
  betOdds: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: '700',
  },
  betOddsSelected: {
    color: '#6366F1',
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 18,
    marginBottom: 12,
  },
  quickStakes: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickStake: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  quickStakeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  simulateButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  simulateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  simulationResult: {
    marginTop: 20,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
  },
  simulationTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  simulationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  simItem: {
    width: '48%',
  },
  simLabel: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 4,
  },
  simValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  placeButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  placeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
