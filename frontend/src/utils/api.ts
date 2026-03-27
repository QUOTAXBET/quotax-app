import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://sharp-edge-6.preview.emergentagent.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  createSession: async (sessionId: string) => {
    const response = await api.post('/auth/session', { session_id: sessionId });
    if (response.data.session_token) {
      await AsyncStorage.setItem('session_token', response.data.session_token);
    }
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  logout: async () => {
    await api.post('/auth/logout');
    await AsyncStorage.removeItem('session_token');
  },
};

export const matchesAPI = {
  getAll: async () => {
    const response = await api.get('/matches');
    return response.data;
  },
  getBySport: async (sport: string) => {
    const response = await api.get(`/matches/${sport}`);
    return response.data;
  },
  getById: async (matchId: string) => {
    const response = await api.get(`/match/${matchId}`);
    return response.data;
  },
};

export const predictionsAPI = {
  getAll: async () => {
    const response = await api.get('/predictions');
    return response.data;
  },
  getBySport: async (sport: string) => {
    const response = await api.get(`/predictions/${sport}`);
    return response.data;
  },
  getByMatch: async (matchId: string) => {
    const response = await api.get(`/prediction/${matchId}`);
    return response.data;
  },
};

export const betsAPI = {
  place: async (matchId: string, betType: string, stake: number) => {
    const response = await api.post('/bets', { match_id: matchId, bet_type: betType, stake });
    return response.data;
  },
  simulate: async (matchId: string, betType: string, stake: number) => {
    const response = await api.post('/bets/simulate', { match_id: matchId, bet_type: betType, stake });
    return response.data;
  },
  getHistory: async () => {
    const response = await api.get('/bets/history');
    return response.data;
  },
  settle: async (betId: string, won: boolean) => {
    const response = await api.post(`/bets/${betId}/settle`, null, { params: { won } });
    return response.data;
  },
};

export const premadeBetsAPI = {
  getAll: async () => {
    const response = await api.get('/premade-bets');
    return response.data;
  },
  getBySport: async (sport: string) => {
    const response = await api.get(`/premade-bets/${sport}`);
    return response.data;
  },
};

export const userAPI = {
  getWallet: async () => {
    const response = await api.get('/user/wallet');
    return response.data;
  },
  resetWallet: async () => {
    const response = await api.post('/user/wallet/reset');
    return response.data;
  },
};

export const dataAPI = {
  refresh: async () => {
    const response = await api.post('/refresh-data');
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/stats/overview');
    return response.data;
  },
};

export default api;
