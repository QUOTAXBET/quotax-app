import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://sharp-edge-6.preview.emergentagent.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

let sessionToken: string | null = null;
let tokenLoaded = false;

// Safe async storage wrapper - never crashes
const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      }
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.log('Storage read error (safe):', e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.log('Storage write error (safe):', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.log('Storage remove error (safe):', e);
    }
  },
};

export const loadToken = async (): Promise<string | null> => {
  if (tokenLoaded) return sessionToken;
  const token = await safeStorage.getItem('session_token');
  sessionToken = token;
  tokenLoaded = true;
  return token;
};

export const setSessionToken = (token: string | null) => {
  sessionToken = token;
  tokenLoaded = true;
  if (token) {
    safeStorage.setItem('session_token', token);
  } else {
    safeStorage.removeItem('session_token');
  }
};

export const getSessionToken = (): string | null => {
  return sessionToken;
};

api.interceptors.request.use((config) => {
  const token = getSessionToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const authAPI = {
  createSession: async (sessionId: string) => {
    const response = await api.post('/auth/session', { session_id: sessionId });
    if (response.data.session_token) setSessionToken(response.data.session_token);
    return response.data;
  },
  getMe: async () => (await api.get('/auth/me')).data,
  logout: async () => { await api.post('/auth/logout'); setSessionToken(null); },
};

// Matches + Predictions
export const matchesAPI = {
  getAll: async () => (await api.get('/matches')).data,
  getBySport: async (sport: string) => (await api.get(`/matches/${sport}`)).data,
  getPredictions: async () => (await api.get('/predictions')).data,
  getPredictionsBySport: async (sport: string) => (await api.get(`/predictions/${sport}`)).data,
  getStats: async () => (await api.get('/public/stats')).data,
};

// Public (Guest)
export const publicAPI = {
  getStats: async () => (await api.get('/public/stats')).data,
  getPreviewSchedule: async () => (await api.get('/public/preview-schedine')).data,
  getBankrollPreview: async () => (await api.get('/public/bankroll-preview')).data,
};

// Schedine
export const schedineAPI = {
  getAll: async () => (await api.get('/schedine')).data,
  follow: async (schedinaId: string) => (await api.post('/schedine/follow', { schedina_id: schedinaId })).data,
  getFollowed: async () => (await api.get('/schedine/followed')).data,
};

// Live
export const liveAPI = {
  getMatches: async () => (await api.get('/live')).data,
};

// Opportunities
export const opportunitiesAPI = {
  getDaily: async () => (await api.get('/opportunities')).data,
};

// Value Bets (Elite)
export const valueBetsAPI = {
  getAll: async () => (await api.get('/value-bets')).data,
};

// User Stats (Pro/Elite)
export const userStatsAPI = {
  get: async (userId: string) => (await api.get(`/stats/user/${userId}`)).data,
};

// Weekly Report (Elite)
export const weeklyReportAPI = {
  get: async (userId: string) => (await api.get(`/report/weekly/${userId}`)).data,
};

// Referral
export const referralAPI = {
  get: async (userId: string) => (await api.get(`/referral/${userId}`)).data,
  apply: async (code: string, userId: string) => (await api.post('/referral/apply', { code, user_id: userId })).data,
};

// AI
export const aiAPI = {
  getPredictions: async () => (await api.get('/ai/predictions')).data,
};

// Subscription
export const subscriptionAPI = {
  getPlans: async () => (await api.get('/subscription/plans')).data,
  subscribe: async (planId: string) => (await api.post('/subscription/subscribe', { plan_id: planId })).data,
};

// Social
export const socialAPI = {
  getActivity: async () => (await api.get('/social/activity')).data,
};

// User
export const userAPI = {
  getWallet: async () => (await api.get('/user/wallet')).data,
  resetWallet: async () => (await api.post('/user/wallet/reset')).data,
};

// Bets
export const betsAPI = {
  simulate: async (matchId: string, betType: string, stake: number) => 
    (await api.post('/bets/simulate', { match_id: matchId, bet_type: betType, stake })).data,
  place: async (matchId: string, betType: string, stake: number) => 
    (await api.post('/bets', { match_id: matchId, bet_type: betType, stake })).data,
  getHistory: async () => (await api.get('/bets/history')).data,
};

// Elite AI
export const eliteAPI = {
  ask: async (query: string, sport?: string) => 
    (await api.post('/elite/ask', { query, sport })).data,
  saveChat: async (userId: string, query: string, response: string, model: string) =>
    (await api.post('/elite/save', { user_id: userId, query, response, model })).data,
  getHistory: async (userId: string) =>
    (await api.get(`/elite/history/${userId}`)).data,
  checkAccess: async (userId: string) =>
    (await api.get(`/elite/access/${userId}`)).data,
};

// Badges & Gamification
export const badgesAPI = {
  getDefinitions: async () => (await api.get('/badges/definitions')).data,
  getUserBadges: async (userId: string) => (await api.get(`/badges/user/${userId}`)).data,
  checkEliteBadge: async (userId: string) => (await api.post(`/badges/check-elite/${userId}`)).data,
};

// Leaderboard
export const leaderboardAPI = {
  get: async () => (await api.get('/leaderboard')).data,
};

// Notifications
export const notificationsAPI = {
  getAll: async (userId: string) => (await api.get(`/notifications/${userId}`)).data,
  markRead: async (notificationId: string) => (await api.post(`/notifications/mark-read/${notificationId}`)).data,
  markAllRead: async (userId: string) => (await api.post(`/notifications/mark-all-read/${userId}`)).data,
  getPreferences: async (userId: string) => (await api.get(`/notifications/preferences/${userId}`)).data,
  updatePreferences: async (userId: string, prefs: any) => (await api.put(`/notifications/preferences/${userId}`, prefs)).data,
  deleteNotification: async (notificationId: string) => (await api.delete(`/notifications/${notificationId}`)).data,
  getTypes: async () => (await api.get('/notifications/types')).data,
};

// Dev Tools (for testing subscription tiers)
export const devAPI = {
  switchTier: async (userId: string, tier: string) =>
    (await api.post('/dev/switch-tier', { user_id: userId, tier })).data,
  getUser: async (userId: string) =>
    (await api.get(`/dev/user/${userId}`)).data,
};

export default api;
