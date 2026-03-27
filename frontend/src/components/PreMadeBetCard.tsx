import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PreMadeBet } from '../types';

interface PreMadeBetCardProps {
  bet: PreMadeBet;
  onPress?: () => void;
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 70) return '#10B981';
  if (confidence >= 55) return '#F59E0B';
  return '#EF4444';
};

export default function PreMadeBetCard({ bet, onPress }: PreMadeBetCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.name}>{bet.name}</Text>
          <View style={styles.sportBadge}>
            <Text style={styles.sportText}>{bet.sport.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.confidenceContainer}>
          <Ionicons name="analytics" size={14} color={getConfidenceColor(bet.confidence)} />
          <Text style={[styles.confidence, { color: getConfidenceColor(bet.confidence) }]}>
            {bet.confidence}%
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{bet.description}</Text>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Quota Totale</Text>
          <Text style={styles.detailValue}>{bet.total_odds.toFixed(2)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Puntata Suggerita</Text>
          <Text style={styles.detailValue}>€{bet.stake_recommendation}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Vincita Potenziale</Text>
          <Text style={[styles.detailValue, { color: '#10B981' }]}>
            €{bet.potential_payout.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.matchCount}>
          <Ionicons name="layers" size={14} color="#6B7280" />
          <Text style={styles.matchCountText}>{bet.matches.length} partite</Text>
        </View>
        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>Vedi Dettagli</Text>
          <Ionicons name="chevron-forward" size={16} color="#6366F1" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sportBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sportText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidence: {
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    color: '#6B7280',
    fontSize: 10,
    marginBottom: 4,
  },
  detailValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchCountText: {
    color: '#6B7280',
    fontSize: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    color: '#6366F1',
    fontSize: 13,
    fontWeight: '600',
  },
});
