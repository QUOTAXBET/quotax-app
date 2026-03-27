import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PreMadeBetCard from '../../src/components/PreMadeBetCard';
import { premadeBetsAPI, matchesAPI } from '../../src/utils/api';
import { PreMadeBet, Match } from '../../src/types';

export default function PreMadeScreen() {
  const [premadeBets, setPremadeBets] = useState<PreMadeBet[]>([]);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBet, setSelectedBet] = useState<PreMadeBet | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setError('');
    try {
      const [betsData, matchData] = await Promise.all([
        premadeBetsAPI.getAll(),
        matchesAPI.getAll(),
      ]);

      const matchMap: Record<string, Match> = {};
      (matchData || []).forEach((m: Match) => {
        matchMap[m.match_id] = m;
      });
      setMatches(matchMap);
      setPremadeBets(betsData || []);
    } catch (err: any) {
      console.error('Errore caricamento schedine:', err);
      setError('Errore nel caricamento');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleBetPress = (bet: PreMadeBet) => {
    setSelectedBet(bet);
    setShowDetails(true);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return '#10B981';
    if (confidence >= 55) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedine Pronte</Text>
        <Text style={styles.subtitle}>Combinazioni selezionate dall'IA</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Caricamento schedine...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366F1"
              colors={['#6366F1']}
            />
          }
        >
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{premadeBets.length}</Text>
              <Text style={styles.statLabel}>Schedine</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {premadeBets.filter(b => b.confidence >= 65).length}
              </Text>
              <Text style={styles.statLabel}>Alta Affidabilità</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                €{premadeBets.length > 0 ? Math.max(...premadeBets.map(b => b.potential_payout)).toFixed(0) : 0}
              </Text>
              <Text style={styles.statLabel}>Max Vincita</Text>
            </View>
          </View>

          {premadeBets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={48} color="#6B7280" />
              <Text style={styles.emptyText}>Nessuna schedina disponibile</Text>
            </View>
          ) : (
            premadeBets.map((bet) => (
              <PreMadeBetCard
                key={bet.premade_id}
                bet={bet}
                onPress={() => handleBetPress(bet)}
              />
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={showDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowDetails(false)}
            activeOpacity={1}
          />
          {selectedBet && (
            <View style={styles.detailsModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedBet.name}</Text>
                <TouchableOpacity onPress={() => setShowDetails(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDescription}>{selectedBet.description}</Text>

              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Quota Totale</Text>
                  <Text style={styles.modalStatValue}>{selectedBet.total_odds.toFixed(2)}</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Affidabilità</Text>
                  <Text style={[styles.modalStatValue, { color: getConfidenceColor(selectedBet.confidence) }]}>
                    {selectedBet.confidence}%
                  </Text>
                </View>
              </View>

              <Text style={styles.matchesTitle}>Partite Incluse</Text>
              <ScrollView style={styles.matchesList}>
                {selectedBet.matches.map((matchId, index) => {
                  const match = matches[matchId];
                  if (!match) return null;
                  return (
                    <View key={matchId} style={styles.matchItem}>
                      <View style={styles.matchNumber}>
                        <Text style={styles.matchNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.matchInfo}>
                        <Text style={styles.matchTeams}>
                          {match.home_team} vs {match.away_team}
                        </Text>
                        <Text style={styles.matchLeague}>{match.league}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.payoutSection}>
                <View>
                  <Text style={styles.payoutLabel}>Puntata Consigliata</Text>
                  <Text style={styles.payoutStake}>€{selectedBet.stake_recommendation}</Text>
                </View>
                <View>
                  <Text style={styles.payoutLabel}>Vincita Potenziale</Text>
                  <Text style={styles.payoutValue}>€{selectedBet.potential_payout.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  detailsModal: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 20,
  },
  modalStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  modalStatItem: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalStatLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 4,
  },
  modalStatValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  matchesTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  matchesList: {
    maxHeight: 200,
    marginBottom: 20,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  matchNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  matchInfo: {
    flex: 1,
  },
  matchTeams: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  matchLeague: {
    color: '#6B7280',
    fontSize: 12,
  },
  payoutSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
  },
  payoutLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 4,
  },
  payoutStake: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  payoutValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});
