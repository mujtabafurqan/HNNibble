import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../constants';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isDark?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  title = 'Something went wrong',
  message, 
  onRetry,
  isDark = false 
}) => {
  const colors = isDark ? Colors.dark : Colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Ionicons 
        name="warning-outline" 
        size={48} 
        color={Colors.error} 
        style={styles.icon}
      />
      
      <Text style={[styles.title, { color: colors.text }]}>
        {title}
      </Text>
      
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>
      
      {onRetry && (
        <TouchableOpacity 
          style={[styles.retryButton, { borderColor: Colors.primary }]}
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <Text style={[styles.retryText, { color: Colors.primary }]}>
            Try Again
          </Text>
        </TouchableOpacity>
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
  icon: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.semibold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: Typography.fontSizes.md,
    textAlign: 'center',
    lineHeight: Typography.lineHeights.normal * Typography.fontSizes.md,
    marginBottom: Spacing.xl,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.buttonPadding,
    borderWidth: 2,
    borderRadius: 8,
  },
  retryText: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
});