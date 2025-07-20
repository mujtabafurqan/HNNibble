import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { EnhancedStory } from '../types';
import { Colors, Spacing, Typography } from '../constants';

interface ArticleCardProps {
  story: EnhancedStory;
  onPress: () => void;
  onRetryExtraction?: () => void;
  isDark?: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ 
  story, 
  onPress, 
  onRetryExtraction,
  isDark = false 
}) => {
  const colors = isDark ? Colors.dark : Colors;
  
  const getContentPreview = () => {
    if (!story.url) {
      return story.text ? story.text.substring(0, 150) + '...' : 'Discussion on Hacker News';
    }

    if (story.extractionStatus === 'loading') {
      return 'Extracting content...';
    }

    if (story.extractionStatus === 'success' && story.extractedContent?.content) {
      return story.extractedContent.content.substring(0, 150) + '...';
    }

    if (story.extractionStatus === 'failed') {
      return story.extractedContent?.error || 'Content extraction failed. Tap to view original.';
    }

    return `Article from ${story.domain || 'external site'}`;
  };

  const getExtractionStatusIcon = () => {
    switch (story.extractionStatus) {
      case 'loading':
        return <ActivityIndicator size="small" color={Colors.primary} style={styles.extractionIcon} />;
      case 'success':
        return <Text style={[styles.extractionIcon, { color: Colors.success || '#28a745' }]}>✓</Text>;
      case 'failed':
        return <Text style={[styles.extractionIcon, { color: Colors.error || '#dc3545' }]}>⚠</Text>;
      default:
        return null;
    }
  };

  const getTagsFromStory = () => {
    const tags: string[] = [];
    
    if (story.domain && typeof story.domain === 'string') {
      tags.push(story.domain);
    }
    
    if (story.extractedContent?.extractionMethod && typeof story.extractedContent.extractionMethod === 'string') {
      tags.push(story.extractedContent.extractionMethod);
    }
    
    if (!story.url) {
      tags.push('Discussion');
    }
    
    return tags.slice(0, 2);
  };

  const tags = getTagsFromStory();

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.card }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {story.title || 'Untitled'}
          </Text>
          {getExtractionStatusIcon()}
        </View>
        <View style={styles.metadata}>
          <Text style={[styles.author, { color: colors.textSecondary }]}>
            by {story.by || 'Unknown'}
          </Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>
            {story.timeAgo || 'Unknown time'}
          </Text>
        </View>
      </View>
      
      <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={3}>
        {getContentPreview()}
      </Text>
      
      {story.extractionStatus === 'failed' && onRetryExtraction && (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={(e) => {
            e.stopPropagation();
            onRetryExtraction();
          }}
        >
          <Text style={[styles.retryText, { color: Colors.primary }]}>
            Retry extraction
          </Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.footer}>
        <View style={styles.tags}>
          {tags.map((tag, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: Colors.primaryLight }]}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <View style={styles.stats}>
          {story.extractedContent?.wordCount && (
            <Text style={[styles.readingTime, { color: colors.textMuted }]}>
              {Math.ceil(story.extractedContent.wordCount / 200)} min read
            </Text>
          )}
          <Text style={[styles.score, { color: Colors.primary }]}>
            ↑ {story.score || 0}
          </Text>
          <Text style={[styles.comments, { color: colors.textMuted }]}>
            💬 {story.descendants || 0}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.cardPadding,
    marginHorizontal: Spacing.screenPadding,
    marginVertical: Spacing.sm,
    borderRadius: 12,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    lineHeight: Typography.lineHeights.tight * Typography.fontSizes.lg,
    flex: 1,
    marginRight: Spacing.sm,
  },
  extractionIcon: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    minWidth: 20,
    textAlign: 'center',
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  author: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  time: {
    fontSize: Typography.fontSizes.sm,
  },
  summary: {
    fontSize: Typography.fontSizes.md,
    lineHeight: Typography.lineHeights.normal * Typography.fontSizes.md,
    marginBottom: Spacing.md,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  retryText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    flex: 1,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    marginRight: Spacing.xs,
  },
  tagText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.card,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readingTime: {
    fontSize: Typography.fontSizes.sm,
    marginRight: Spacing.md,
  },
  score: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    marginRight: Spacing.sm,
  },
  comments: {
    fontSize: Typography.fontSizes.sm,
  },
});