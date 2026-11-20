export interface AppColors {
  bg: string;
  surface: string;
  card: string;
  cardAlt: string;
  accent: string;
  accentLight: string;
  accentDim: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  success: string;
  warning: string;
  error: string;
  liked: string;
  tabBar: string;
  tabBarBorder: string;
  miniPlayer: string;
  playerBg: string;
  statusBar: 'light' | 'dark';
}

export const dark: AppColors = {
  bg: '#0D0F1A',
  surface: '#161829',
  card: '#1E2130',
  cardAlt: '#242742',
  accent: '#FF6B4A',
  accentLight: '#FF8A6E',
  accentDim: '#FF6B4A33',
  text: '#FFFFFF',
  textSecondary: '#8B8FA8',
  textMuted: '#4B5168',
  border: '#252840',
  borderLight: '#2D3148',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  liked: '#FF6B4A',
  tabBar: '#10121F',
  tabBarBorder: '#1E2130',
  miniPlayer: '#161829',
  playerBg: '#0D0F1A',
  statusBar: 'light',
};

export const light: AppColors = {
  bg: '#F5F7FC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#EEF0F8',
  accent: '#FF6B4A',
  accentLight: '#FF8A6E',
  accentDim: '#FF6B4A22',
  text: '#0D0F1A',
  textSecondary: '#5A5E78',
  textMuted: '#9B9EAF',
  border: '#DDE0EE',
  borderLight: '#ECEEF8',
  success: '#3D9B42',
  warning: '#D4820A',
  error: '#CC2929',
  liked: '#FF6B4A',
  tabBar: '#FFFFFF',
  tabBarBorder: '#DDE0EE',
  miniPlayer: '#FFFFFF',
  playerBg: '#F5F7FC',
  statusBar: 'dark',
};

// Backward-compat default: dark theme
export const Colors = dark;
