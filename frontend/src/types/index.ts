export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  subscription_tier: 'free' | 'base' | 'pro' | 'premium';
  subscription_expires?: string;
  wallet_balance: number;
  total_bets: number;
  total_wins: number;
  total_profit: number;
  created_at: string;
}

export interface Match {
  sport: string;
  league: string;
  home: string;
  away: string;
  bet_type: string;
  odds: number;
  match_time: string;
}

export interface Schedina {
  schedina_id: string;
  matches: Match[];
  total_odds: number;
  stake: number;
  potential_win: number;
  actual_win: number;
  status: 'pending' | 'won' | 'lost';
  is_premium: boolean;
  is_locked?: boolean;
  is_blurred?: boolean;
  confidence: number;
  ai_analysis?: string;
  created_at: string;
  viewers: number;
}

export interface LiveMatch {
  match_id: string;
  sport: string;
  league: string;
  home: string;
  away: string;
  score: string;
  minute: string | number;
  odds_home: number;
  odds_draw?: number;
  odds_away: number;
  odds_trend?: 'up' | 'down' | 'stable';
  is_hot: boolean;
  alert?: string;
}

export interface AIPrediction {
  prediction_id: string;
  sport: string;
  league: string;
  home: string;
  away: string;
  predicted_outcome: string;
  confidence: number;
  probability: number;
  value_rating: number;
  is_value_bet: boolean;
  analysis: string;
  odds: number;
  match_time: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
}

export interface PlatformStats {
  roi_7d: number;
  roi_30d?: number;
  win_rate: number;
  total_bets: number;
  total_wins: number;
  streak: number;
  bankroll_history: { date: string; value: number }[];
  last_win: { amount: number; time: string };
  active_users: number;
}

export interface SocialActivity {
  activities: {
    type: 'win' | 'subscribe';
    user: string;
    amount?: number;
    plan?: string;
    time: string;
  }[];
  viewing_now: number;
  subscribed_today: number;
}
