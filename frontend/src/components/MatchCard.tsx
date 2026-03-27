import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

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

interface MatchCardProps {
  match: any;
  prediction?: any;
  onPress?: () => void;
  isLocked?: boolean;
  viewers?: number;
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
    case 'low': return colors.primary;
    case 'medium': return colors.pending;
    case 'high': return colors.loss;
    default: return colors.textMuted;
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

export default function MatchCard({ match, prediction, onPress, isLocked, viewers }: MatchCardProps) {
  const matchDate = new Date(match.match_date);
  const fomoViewers = viewers || Math.floor(Math.random() * 30) + 8;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.sportBadge}>
          <Ionicons name={getSportIcon(match.sport) as any} size={14} color={colors.background} />
          <Text style={styles.sportText}>{getSportLabel(match.sport)}</Text>
        </View>
        <Text style={styles.league}>{match.league}</Text>
      </View>

      <View style={styles.teams}>
        <View style={styles.team}>
          <Ionicons name="shield" size={32} color={colors.primary} />
          <Text style={styles.teamName} numberOfLines={2}>{match.home_team}</Text>
        </View>
        
        <View style={styles.vsContainer}>
          <Text style={styles.vs}>VS</Text>
          <Text style={styles.date}>{format(matchDate, 'd MMM', { locale: it })}</Text>
          <Text style={styles.time}>{format(matchDate, 'HH:mm')}</Text>
        </View>

        <View style={styles.team}>
          <Ionicons name="shield" size={32} color={colors.loss} />
          <Text style={styles.teamName} numberOfLines={2}>{match.away_team}</Text>
        </View>
      </View>

      <View style={styles.odds}>
        <View style={styles.oddsItem}>
          <Text style={styles.oddsLabel}>1</Text>
          <Text style={styles.oddsValue}>{match.odds_home}</Text>
        </View>
        {match.odds_draw && (
          <View style={styles.oddsItem}>
            <Text style={styles.oddsLabel}>X</Text>
            <Text style={styles.oddsValue}>{match.odds_draw}</Text>
          </View>
        )}
        <View style={styles.oddsItem}>
          <Text style={styles.oddsLabel}>2</Text>
          <Text style={styles.oddsValue}>{match.odds_away}</Text>
        </View>
      </View>

      {/* Prediction Section */}
      {prediction && !isLocked && (
        <View style={styles.prediction}>
          <View style={styles.predictionHeader}>
            <Ionicons name="analytics" size={16} color={colors.primary} />
            <Text style={styles.predictionTitle}>Pronostico AI</Text>
            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(prediction.risk_level) + '30' }]}>
              <Text style={[styles.riskText, { color: getRiskColor(prediction.risk_level) }]}>
                {prediction.risk_level === 'low' ? 'SICURO' : prediction.risk_level === 'medium' ? 'MEDIO' : 'RISCHIOSO'}
              </Text>
            </View>
          </View>
          <View style={styles.predictionContent}>
            <View style={styles.predictionOutcome}>
              <Text style={styles.outcomeLabel}>Scelta:</Text>
              <Text style={styles.outcomeValue}>
                {getOutcomeLabel(prediction.predicted_outcome, match.home_team, match.away_team)}
              </Text>
              <Text style={styles.predOdds}>@{prediction.odds}</Text>
            </View>
            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>Affidabilit\u00e0</Text>
              <View style={styles.confidenceBar}>
                <View style={[styles.confidenceFill, { width: `${prediction.confidence}%`, backgroundColor: getRiskColor(prediction.risk_level) }]} />
              </View>
              <Text style={[styles.confidenceValue, { color: getRiskColor(prediction.risk_level) }]}>
                {prediction.confidence}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Locked Prediction */}
      {isLocked && (
        <TouchableOpacity style={styles.lockedSection}>
          <Ionicons name="lock-closed" size={18} color={colors.gold} />
          <Text style={styles.lockedText}>Sblocca pronostico premium</Text>
        </TouchableOpacity>
      )}

      {/* FOMO Viewers */}
      <View style={styles.fomoBar}>
        <View style={styles.fomoLeft}>
          <Ionicons name="eye" size={13} color={colors.primary} />
          <Text style={styles.fomoText}>{fomoViewers} stanno guardando</Text>
        </View>
        <TouchableOpacity style={styles.ctaMini}>
          <Text style={styles.ctaMiniText}>Scommetti</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.background} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sportBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  sportText: { color: colors.background, fontSize: 11, fontWeight: '700' },
  league: { color: colors.textSecondary, fontSize: 12 },
  teams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  team: { flex: 1, alignItems: 'center', gap: 8 },
  teamName: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  vsContainer: { alignItems: 'center', paddingHorizontal: 12 },
  vs: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  date: { color: colors.textSecondary, fontSize: 11, marginTop: 4 },
  time: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  odds: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.background, borderRadius: 12, padding: 12, marginBottom: 12 },
  oddsItem: { alignItems: 'center' },
  oddsLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  oddsValue: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  prediction: { backgroundColor: colors.background, borderRadius: 12, padding: 12 },
  predictionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  predictionTitle: { color: colors.primary, fontSize: 12, fontWeight: '600', flex: 1 },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  riskText: { fontSize: 9, fontWeight: '700' },
  predictionContent: { gap: 8 },
  predictionOutcome: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  outcomeLabel: { color: colors.textSecondary, fontSize: 12 },
  outcomeValue: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  predOdds: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confidenceLabel: { color: colors.textSecondary, fontSize: 11, width: 70 },
  confidenceBar: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  confidenceFill: { height: '100%', borderRadius: 3 },
  confidenceValue: { fontSize: 13, fontWeight: '700', width: 45, textAlign: 'right' },
  lockedSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.gold, borderStyle: 'dashed' },
  lockedText: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  fomoBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  fomoLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fomoText: { color: colors.textMuted, fontSize: 11 },
  ctaMini: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  ctaMiniText: { color: colors.background, fontSize: 12, fontWeight: '700' },
});
