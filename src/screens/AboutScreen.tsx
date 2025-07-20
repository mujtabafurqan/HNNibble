import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../components';
import { Colors, Spacing, Typography, APP_CONFIG } from '../constants';

export const AboutScreen: React.FC = () => {
  const navigation = useNavigation();
  const [isDark] = useState(false); // TODO: Connect to theme context

  const colors = isDark ? Colors.dark : Colors;

  const handleEmailPress = () => {
    Linking.openURL('mailto:support@hnnibble.com');
  };

  const handleGitHubPress = () => {
    Linking.openURL('https://github.com/username/hnnibble');
  };

  const handleTwitterPress = () => {
    Linking.openURL('https://twitter.com/hnnibble');
  };

  const renderFeature = (icon: keyof typeof Ionicons.glyphMap, title: string, description: string) => (
    <View style={styles.feature}>
      <View style={[styles.featureIcon, { backgroundColor: Colors.primaryLight }]}>
        <Ionicons name={icon} size={24} color={Colors.card} />
      </View>
      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );

  const renderLink = (icon: keyof typeof Ionicons.glyphMap, title: string, onPress: () => void) => (
    <TouchableOpacity
      style={[styles.link, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <Text style={[styles.linkText, { color: colors.text }]}>
        {title}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header 
        title="About"
        showBackButton
        onBackPress={() => navigation.goBack()}
        isDark={isDark}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Info */}
        <View style={styles.appInfo}>
          <View style={[styles.appIcon, { backgroundColor: Colors.primary }]}>
            <Ionicons name="newspaper" size={40} color={Colors.card} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>
            {APP_CONFIG.name}
          </Text>
          <Text style={[styles.appVersion, { color: colors.textSecondary }]}>
            Version {APP_CONFIG.version}
          </Text>
          <Text style={[styles.appDescription, { color: colors.textSecondary }]}>
            AI-powered summaries of Hacker News stories, delivered in bite-sized nibbles
          </Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Features
          </Text>
          
          {renderFeature(
            'flash',
            'Quick Summaries',
            'Get the key points of any Hacker News story in seconds'
          )}
          
          {renderFeature(
            'refresh',
            'Real-time Updates',
            'Stay current with the latest tech news and discussions'
          )}
          
          {renderFeature(
            'settings',
            'Personalized',
            'Customize your reading experience with preferences and filters'
          )}
          
          {renderFeature(
            'phone-portrait',
            'Mobile-first',
            'Designed specifically for reading on mobile devices'
          )}
        </View>

        {/* Technology */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Built With
          </Text>
          <View style={styles.techGrid}>
            <View style={[styles.techItem, { backgroundColor: colors.card }]}>
              <Text style={[styles.techText, { color: colors.text }]}>React Native</Text>
            </View>
            <View style={[styles.techItem, { backgroundColor: colors.card }]}>
              <Text style={[styles.techText, { color: colors.text }]}>TypeScript</Text>
            </View>
            <View style={[styles.techItem, { backgroundColor: colors.card }]}>
              <Text style={[styles.techText, { color: colors.text }]}>Expo</Text>
            </View>
            <View style={[styles.techItem, { backgroundColor: colors.card }]}>
              <Text style={[styles.techText, { color: colors.text }]}>AI APIs</Text>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Get in Touch
          </Text>
          
          {renderLink('mail', 'Send us feedback', handleEmailPress)}
          {renderLink('logo-github', 'View on GitHub', handleGitHubPress)}
          {renderLink('logo-twitter', 'Follow us on Twitter', handleTwitterPress)}
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Legal
          </Text>
          
          {renderLink('document-text', 'Privacy Policy', () => console.log('Privacy Policy'))}
          {renderLink('document', 'Terms of Service', () => console.log('Terms of Service'))}
          {renderLink('information-circle', 'Open Source Licenses', () => console.log('Licenses'))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Made with ❤️ for the Hacker News community
          </Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            © 2024 HN Nibble. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.screenPadding,
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: Typography.fontSizes.title,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.xs,
  },
  appVersion: {
    fontSize: Typography.fontSizes.md,
    marginBottom: Spacing.md,
  },
  appDescription: {
    fontSize: Typography.fontSizes.md,
    textAlign: 'center',
    lineHeight: Typography.lineHeights.relaxed * Typography.fontSizes.md,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: Spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: Spacing.xs,
  },
  featureDescription: {
    fontSize: Typography.fontSizes.md,
    lineHeight: Typography.lineHeights.normal * Typography.fontSizes.md,
  },
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  techItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    margin: Spacing.xs,
  },
  techText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  linkText: {
    flex: 1,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.medium,
    marginLeft: Spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  footerText: {
    fontSize: Typography.fontSizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
});