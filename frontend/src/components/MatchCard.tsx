import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match, Prediction } from '../types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
  onPress?: () => void;
}

const getSportIcon = (sport: string) => {
  switch (sport) {
    case 'soccer': return 'football';
    case 'nba': return 'basketball';
    case 'ufc': return 'fitness';
    default: return 'trophy';
  }
};

const getSportLabel = (sport: string) => {
  switch (sport) {
    case 'soccer': return 'CALCIO';
    case 'nba': return 'NBA';
    case 'ufc': return 'UFC';
    default: return sport.toUpperCase();
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'low': return '#10B981';
    case 'medium': return '#F59E0B';
    case 'high': return '#EF4444';
    default: return '#6B7280';
  }
};

const getOutcomeLabel = (outcome: string, homeTeam: string, awayTeam: string) => {
  switch (outcome) {
    case 'home': return homeTeam;
    case 'away': return awayTeam;
    case 'draw': return 'Pareggio';
    default: return outcome;
  }
};

export default function MatchCard({ match, prediction, onPress }: MatchCardProps) {
  const matchDate = new Date(match.match_date);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.sportBadge}>
          <Ionicons name={getSportIcon(match.sport) as any} size={14} color="#fff" />
          <Text style={styles.sportText}>{getSportLabel(match.sport)}</Text>
        </View>
        <Text style={styles.league}>{match.league}</Text>
      </View>

      <View style={styles.teams}>
        <View style={styles.team}>
          <Ionicons name="shield" size={32} color="#6366F1" />
          <Text style={styles.teamName} numberOfLines={2}>{match.home_team}</Text>
        </View>
        
        <View style={styles.vsContainer}>
          <Text style={styles.vs}>VS</Text>
          <Text style={styles.date}>{format(matchDate, 'd MMM', { locale: it })}</Text>
          <Text style={styles.time}>{format(matchDate, 'HH:mm')}</Text>
        </View>

        <View style={styles.team}>
          <Ionicons name="shield" size={32} color="#EC4899" />
          <Text style={styles.teamName} numberOfLines={2}>{match.away_team}</Text>
        </View>
      </View>

      <View style={styles.odds}>
        <View style={styles.oddsItem}>
          <Text style={styles.oddsLabel}>Casa</Text>
          <Text style={styles.oddsValue}>{match.odds_home}</Text>
        </View>
        {match.odds_draw && (
          <View style={styles.oddsItem}>
            <Text style={styles.oddsLabel}>Pareggio</Text>
            <Text style={styles.oddsValue}>{match.odds_draw}</Text>
          </View>
        )}
        <View style={styles.oddsItem}>
          <Text style={styles.oddsLabel}>Ospite</Text>
          <Text style={styles.oddsValue}>{match.odds_away}</Text>
        </View>
      </View>

      {prediction && (
        <View style={styles.prediction}>
          <View style={styles.predictionHeader}>
            <Ionicons name="analytics" size={16} color="#6366F1" />
            <Text style={styles.predictionTitle}>Pronostico IA</Text>
          </View>
          <View style={styles.predictionContent}>
            <View style={styles.predictionOutcome}>
              <Text style={styles.outcomeLabel}>Scelta:</Text>
              <Text style={styles.outcomeValue}>
                {getOutcomeLabel(prediction.predicted_outcome, match.home_team, match.away_team)}
              </Text>
            </View>
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>Affidabilità</Text>
              <View style={styles.confidenceBar}>
                <View 
                  style={[
                    styles.confidenceFill, 
                    { width: `${prediction.confidence}%`, backgroundColor: getRiskColor(prediction.risk_level) }
                  ]} 
                />
              </View>
              <Text style={[styles.confidenceValue, { color: getRiskColor(prediction.risk_level) }]}>
                {prediction.confidence}%
              </Text>
            </View>
          </View>
        </View>
      )}
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
    alignItems: 'center',
    marginBottom: 16,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  sportText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  league: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  team: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  teamName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  vsContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  vs: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  date: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 4,
  },
  time: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
  },
  odds: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  oddsItem: {
    alignItems: 'center',
  },
  oddsLabel: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 4,
  },
  oddsValue: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
  },
  prediction: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  predictionTitle: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
  },
  predictionContent: {
    gap: 8,
  },
  predictionOutcome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  outcomeLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  outcomeValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    width: 70,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: '700',
    width: 45,
    textAlign: 'right',
  },
});
