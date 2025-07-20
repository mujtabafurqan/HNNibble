import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Header } from '../components';
import { UserPreferences } from '../types';
import { RootStackParamList } from '../types/navigation';
import { Colors, Spacing, Typography } from '../constants';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [isDark] = useState(false); // TODO: Connect to theme context
  const [preferences, setPreferences] = useState<UserPreferences>({
    notificationsEnabled: true,
    summaryLength: 'medium',
    categories: ['Technology', 'Startups'],
    refreshInterval: 30,
    darkMode: false,
  });

  const colors = isDark ? Colors.dark : Colors;

  const handleToggleNotifications = () => {
    setPreferences(prev => ({
      ...prev,
      notificationsEnabled: !prev.notificationsEnabled
    }));
  };

  const handleToggleDarkMode = () => {
    setPreferences(prev => ({
      ...prev,
      darkMode: !prev.darkMode
    }));
  };

  const renderSettingItem = (
    title: string,
    subtitle?: string,
    rightComponent?: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.card }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
        {children}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Settings" isDark={isDark} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderSection(
          'NOTIFICATIONS',
          <>
            {renderSettingItem(
              'Push Notifications',
              'Get notified about new summaries',
              <Switch
                value={preferences.notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.border, true: Colors.primaryLight }}
                thumbColor={preferences.notificationsEnabled ? Colors.primary : colors.textMuted}
              />
            )}
            {renderSettingItem(
              'Refresh Interval',
              `Every ${preferences.refreshInterval} minutes`,
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />,
              () => console.log('Refresh interval pressed')
            )}
          </>
        )}

        {renderSection(
          'CONTENT',
          <>
            {renderSettingItem(
              'Summary Length',
              preferences.summaryLength.charAt(0).toUpperCase() + preferences.summaryLength.slice(1),
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />,
              () => console.log('Summary length pressed')
            )}
            {renderSettingItem(
              'Categories',
              `${preferences.categories.length} selected`,
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />,
              () => console.log('Categories pressed')
            )}
          </>
        )}

        {renderSection(
          'APPEARANCE',
          <>
            {renderSettingItem(
              'Dark Mode',
              'Use dark theme',
              <Switch
                value={preferences.darkMode}
                onValueChange={handleToggleDarkMode}
                trackColor={{ false: colors.border, true: Colors.primaryLight }}
                thumbColor={preferences.darkMode ? Colors.primary : colors.textMuted}
              />
            )}
          </>
        )}

        {renderSection(
          'ABOUT',
          <>
            {renderSettingItem(
              'About HN Nibble',
              'Version 1.0.0',
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />,
              () => navigation.navigate('About')
            )}
            {renderSettingItem(
              'Privacy Policy',
              undefined,
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />,
              () => console.log('Privacy policy pressed')
            )}
            {renderSettingItem(
              'Terms of Service',
              undefined,
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />,
              () => console.log('Terms pressed')
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  sectionContent: {
    marginHorizontal: Spacing.screenPadding,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.medium,
  },
  settingSubtitle: {
    fontSize: Typography.fontSizes.sm,
    marginTop: 2,
  },
});