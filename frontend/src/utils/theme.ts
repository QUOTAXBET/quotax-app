// EdgeBet Theme Colors
export const colors = {
  // Base
  background: '#0B0F14',
  backgroundLight: '#111820',
  card: '#1A2332',
  cardHover: '#1F2933',
  
  // Primary (Profit Green)
  primary: '#00FF88',
  primaryDark: '#00CC6A',
  primaryGlow: 'rgba(0, 255, 136, 0.3)',
  
  // Secondary
  secondary: '#1F2933',
  secondaryLight: '#2A3847',
  
  // Accent (Premium Gold)
  gold: '#FFD700',
  goldDark: '#E6C200',
  goldGlow: 'rgba(255, 215, 0, 0.3)',
  
  // Status
  profit: '#00FF88',
  loss: '#FF4D4D',
  pending: '#FFB800',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  
  // Borders
  border: '#2A3847',
  borderLight: '#374151',
  
  // Overlays
  overlay: 'rgba(11, 15, 20, 0.8)',
  blur: 'rgba(11, 15, 20, 0.6)',
};

export const shadows = {
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  goldGlow: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
