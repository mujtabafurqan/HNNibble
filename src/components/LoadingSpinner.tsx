import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../constants';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  isDark?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message, 
  size = 'large',
  isDark = false 
}) => {
  const colors = isDark ? Colors.dark : Colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator 
        size={size} 
        color={Colors.primary} 
        style={styles.spinner}
      />
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding,
  },
  spinner: {
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: Typography.fontSizes.md,
    textAlign: 'center',
    lineHeight: Typography.lineHeights.normal * Typography.fontSizes.md,
  },
});