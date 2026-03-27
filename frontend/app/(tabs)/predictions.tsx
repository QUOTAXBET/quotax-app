import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SportFilter from '../../src/components/SportFilter';
import { predictionsAPI, matchesAPI } from '../../src/utils/api';
import { Prediction, Match } from '../../src/types';

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'low': return '#10B981';
    case 'medium': return '#F59E0B';
    case 'high': return '#EF4444';
    default: return '#6B7280';
  }
};

const getOutcomeLabel = (outcome: string, match: Match) => {
  switch (outcome) {
    case 'home': return match.home_team;
    case 'away': return match.away_team;
    case 'draw': return 'Draw';
    default: return outcome;
  }
};

export default function PredictionsScreen() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [selectedSport, setSelectedSport] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'confidence' | 'ev'>('confidence');

  const fetchData = async () => {
    try {
      const [predData, matchData] = await Promise.all([
        selectedSport === 'all'
          ? predictionsAPI.getAll()
          : predictionsAPI.getBySport(selectedSport),
        selectedSport === 'all'
          ? matchesAPI.getAll()
          : matchesAPI.getBySport(selectedSport),
      ]);

      const matchMap: Record<string, Match> = {};
      matchData.forEach((m: Match) => {
        matchMap[m.match_id] = m;
      });
      setMatches(matchMap);

      // Sort predictions
      const sorted = [...predData].sort((a, b) => {
        if (sortBy === 'confidence') return b.confidence - a.confidence;
        return b.expected_value - a.expected_value;
      });
      setPredictions(sorted);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [selectedSport, sortBy]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [selectedSport, sortBy]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Predictions</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'confidence' && styles.sortButtonActive]}
            onPress={() => setSortBy('confidence')}
          >
            <Text style={[styles.sortText, sortBy === 'confidence' && styles.sortTextActive]}>
              Confidence
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'ev' && styles.sortButtonActive]}
            onPress={() => setSortBy('ev')}
          >
            <Text style={[styles.sortText, sortBy === 'ev' && styles.sortTextActive]}>
              Value
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <SportFilter selected={selectedSport} onSelect={setSelectedSport} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Analyzing predictions...</Text>
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
          {predictions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="analytics-outline" size={48} color="#6B7280" />
              <Text style={styles.emptyText}>No predictions available</Text>
            </View>
          ) : (
            predictions.map((pred) => {
              const match = matches[pred.match_id];
              if (!match) return null;

              return (
                <View key={pred.prediction_id} style={styles.predictionCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.sportBadge}>
                      <Text style={styles.sportText}>{pred.sport.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.riskBadge, { backgroundColor: getRiskColor(pred.risk_level) + '20' }]}>
                      <Text style={[styles.riskText, { color: getRiskColor(pred.risk_level) }]}>
                        {pred.risk_level.toUpperCase()} RISK
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.matchTitle}>
                    {match.home_team} vs {match.away_team}
                  </Text>
                  <Text style={styles.league}>{match.league}</Text>

                  <View style={styles.predictionDetails}>
                    <View style={styles.predictionMain}>
                      <Text style={styles.pickLabel}>Our Pick</Text>
                      <Text style={styles.pickValue}>
                        {getOutcomeLabel(pred.predicted_outcome, match)}
                      </Text>
                      <Text style={styles.oddsValue}>@ {pred.odds.toFixed(2)}</Text>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Confidence</Text>
                        <View style={styles.confidenceBar}>
                          <View
                            style={[
                              styles.confidenceFill,
                              { width: `${pred.confidence}%`, backgroundColor: getRiskColor(pred.risk_level) },
                            ]}
                          />
                        </View>
                        <Text style={[styles.statValue, { color: getRiskColor(pred.risk_level) }]}>
                          {pred.confidence}%
                        </Text>
                      </View>

                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Expected Value</Text>
                        <Text
                          style={[
                            styles.evValue,
                            { color: pred.expected_value >= 0 ? '#10B981' : '#EF4444' },
                          ]}
                        >
                          {pred.expected_value >= 0 ? '+' : ''}{pred.expected_value.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.reasoningSection}>
                    <Ionicons name="bulb" size={16} color="#F59E0B" />
                    <Text style={styles.reasoningText}>{pred.reasoning}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
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
    marginBottom: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1F2937',
  },
  sortButtonActive: {
    backgroundColor: '#6366F1',
  },
  sortText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  sortTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
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
  predictionCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sportBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskText: {
    fontSize: 10,
    fontWeight: '700',
  },
  matchTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  league: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 16,
  },
  predictionDetails: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  predictionMain: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  pickLabel: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 4,
  },
  pickValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  oddsValue: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 8,
  },
  confidenceBar: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  evValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  reasoningSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 10,
  },
  reasoningText: {
    flex: 1,
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
  },
});
