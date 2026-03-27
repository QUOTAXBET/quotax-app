import axios from 'axios';
import { Platform } from 'react-native';

const API_URL = 'https://sharp-edge-6.preview.emergentagent.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

let sessionToken: string | null = null;

export const setSessionToken = (token: string | null) => {
  sessionToken = token;
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    if (token) localStorage.setItem('session_token', token);
    else localStorage.removeItem('session_token');
  }
};

export const getSessionToken = (): string | null => {
  if (sessionToken) return sessionToken;
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem('session_token');
  }
  return null;
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

// Public (for guests)
export const publicAPI = {
  getStats: async () => (await api.get('/public/stats')).data,
  getPreviewSchedule: async () => (await api.get('/public/preview-schedine')).data,
  getBankrollPreview: async () => (await api.get('/public/bankroll-preview')).data,
};

// Schedine
export const schedineAPI = {
  getAll: async () => (await api.get('/schedine')).data,
};

// Dashboard
export const dashboardAPI = {
  getStats: async () => (await api.get('/dashboard/stats')).data,
};

// Live
export const liveAPI = {
  getMatches: async () => (await api.get('/live')).data,
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

export default api;
