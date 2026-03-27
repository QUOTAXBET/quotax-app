export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  wallet_balance: number;
  total_bets: number;
  total_wins: number;
  total_profit: number;
  created_at: string;
}

export interface Match {
  match_id: string;
  sport: 'soccer' | 'nba' | 'ufc';
  league: string;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  match_date: string;
  status: 'upcoming' | 'live' | 'finished';
  home_score?: number;
  away_score?: number;
  odds_home: number;
  odds_draw?: number;
  odds_away: number;
}

export interface Prediction {
  prediction_id: string;
  match_id: string;
  sport: string;
  predicted_outcome: 'home' | 'draw' | 'away';
  confidence: number;
  reasoning: string;
  odds: number;
  expected_value: number;
  risk_level: 'low' | 'medium' | 'high';
}

export interface Bet {
  bet_id: string;
  user_id: string;
  match_id: string;
  sport: string;
  bet_type: string;
  stake: number;
  odds: number;
  potential_payout: number;
  status: 'pending' | 'won' | 'lost';
  actual_payout: number;
  created_at: string;
  settled_at?: string;
}

export interface PreMadeBet {
  premade_id: string;
  name: string;
  description: string;
  sport: string;
  matches: string[];
  total_odds: number;
  confidence: number;
  stake_recommendation: number;
  potential_payout: number;
}

export interface SimulationResult {
  stake: number;
  odds: number;
  potential_payout: number;
  potential_profit: number;
  win_probability: number;
  expected_value: number;
  match: Match;
}
