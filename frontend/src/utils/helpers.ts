import { colors } from './theme';

// Sport helpers used across multiple screens
export const getSportIcon = (sport: string): string => 
  sport === 'soccer' ? 'football' : sport === 'nba' ? 'basketball' : 'fitness';

export const getSportLabel = (sport: string): string => 
  sport === 'soccer' ? 'CALCIO' : sport === 'nba' ? 'NBA' : 'UFC';

export const getOutcomeLabel = (outcome: string, home: string, away: string): string => 
  outcome === 'home' ? home : outcome === 'away' ? away : 'Pareggio';

export const getRiskColor = (risk: string): string => 
  risk === 'low' ? colors.primary : risk === 'medium' ? '#FFB800' : colors.loss;

export const getRiskLabel = (risk: string): string => 
  risk === 'low' ? 'SICURO' : risk === 'medium' ? 'MEDIO' : 'RISCHIOSO';

export const getRiskLabelFull = (risk: string): string => 
  risk === 'low' ? 'Rischio Basso' : risk === 'medium' ? 'Rischio Medio' : 'Rischio Alto';

// Time formatting helpers
export const getTimeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ora';
  if (diffMin < 60) return `${diffMin} min fa`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h fa`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}g fa`;
};

// Tier helpers
export const getTierColor = (tier: string): string => 
  tier === 'elite' ? colors.gold : tier === 'premium' ? colors.primary : tier === 'pro' ? '#9B59B6' : colors.textMuted;

export const getTierLabel = (tier: string): string => 
  tier === 'elite' ? 'ELITE' : tier === 'premium' ? 'PREMIUM' : tier === 'pro' ? 'PRO' : 'FREE';
