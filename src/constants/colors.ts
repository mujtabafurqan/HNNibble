export const Colors = {
  primary: '#FF6600',      // Hacker News orange
  primaryDark: '#E55A00',  // Darker orange
  primaryLight: '#FF8533', // Lighter orange
  
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  card: '#FFFFFF',
  cardShadow: 'rgba(0, 0, 0, 0.1)',
  
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Dark mode colors
  dark: {
    background: '#1A1A1A',
    backgroundSecondary: '#2D2D2D',
    text: '#FFFFFF',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    border: '#374151',
    borderLight: '#2D2D2D',
    card: '#252525',
  }
};

export const getColors = (isDark: boolean) => {
  return isDark ? {
    ...Colors,
    background: Colors.dark.background,
    backgroundSecondary: Colors.dark.backgroundSecondary,
    text: Colors.dark.text,
    textSecondary: Colors.dark.textSecondary,
    textMuted: Colors.dark.textMuted,
    border: Colors.dark.border,
    borderLight: Colors.dark.borderLight,
    card: Colors.dark.card,
  } : Colors;
};