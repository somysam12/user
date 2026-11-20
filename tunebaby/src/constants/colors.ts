export interface AppColors {
  bg: string;
  surface: string;
  card: string;
  cardAlt: string;
  glass: string;
  glassStrong: string;
  glassBorder: string;
  scrim: string;
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
  auroraA: string;
  auroraB: string;
  statusBar: 'light' | 'dark';
}

export const dark: AppColors = {
  bg: '#080A14',
  surface: '#111529',
  card: '#171C34',
  cardAlt: '#222845',
  glass: 'rgba(24, 30, 58, 0.72)',
  glassStrong: 'rgba(30, 37, 72, 0.90)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  scrim: 'rgba(3, 5, 14, 0.74)',
  accent: '#FF6B4A',
  accentLight: '#FF9A82',
  accentDim: 'rgba(255, 107, 74, 0.16)',
  text: '#F8F8FF',
  textSecondary: '#A9AEC9',
  textMuted: '#686F91',
  border: '#252C4A',
  borderLight: '#303757',
  success: '#5BD18A',
  warning: '#FFCB6B',
  error: '#FF6B73',
  liked: '#FF6B86',
  tabBar: 'rgba(16, 20, 40, 0.88)',
  tabBarBorder: 'rgba(255, 255, 255, 0.10)',
  miniPlayer: 'rgba(23, 28, 52, 0.94)',
  playerBg: '#080A14',
  auroraA: '#32206A',
  auroraB: '#173B58',
  statusBar: 'light',
};

export const light: AppColors = {
  bg: '#F2F4FB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#E9ECF8',
  glass: 'rgba(255, 255, 255, 0.74)',
  glassStrong: 'rgba(255, 255, 255, 0.93)',
  glassBorder: 'rgba(21, 26, 55, 0.10)',
  scrim: 'rgba(18, 22, 42, 0.50)',
  accent: '#F45D43',
  accentLight: '#FF836D',
  accentDim: 'rgba(244, 93, 67, 0.12)',
  text: '#11152A',
  textSecondary: '#626984',
  textMuted: '#9298B1',
  border: '#DDE1F0',
  borderLight: '#E9EBF5',
  success: '#319B62',
  warning: '#C78216',
  error: '#D6404E',
  liked: '#E54D70',
  tabBar: 'rgba(255, 255, 255, 0.90)',
  tabBarBorder: 'rgba(21, 26, 55, 0.10)',
  miniPlayer: 'rgba(255, 255, 255, 0.94)',
  playerBg: '#F2F4FB',
  auroraA: '#E1D8FF',
  auroraB: '#D9F2FF',
  statusBar: 'dark',
};

export const Colors = dark;
