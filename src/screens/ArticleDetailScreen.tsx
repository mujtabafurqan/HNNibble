import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Header, LoadingSpinner, ErrorMessage } from '../components';
import { EnhancedStory } from '../types';
import { RootStackParamList } from '../types/navigation';
import { Colors, Spacing, Typography } from '../constants';
import { ContentExtractorService } from '../services/contentExtractor';

type ArticleDetailScreenRouteProp = RouteProp<RootStackParamList, 'ArticleDetail'>;

export const ArticleDetailScreen: React.FC = () => {
  const route = useRoute<ArticleDetailScreenRouteProp>();
  const navigation = useNavigation();
  const [story, setStory] = useState<EnhancedStory | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDark] = useState(false); // TODO: Connect to theme context

  const colors = isDark ? Colors.dark : Colors;
  const { articleId, story: passedStory } = route.params;

  useEffect(() => {
    if (passedStory) {
      setStory(passedStory);
      // If content extraction hasn't been done or failed, try to extract it
      if (passedStory.url && (!passedStory.extractedContent || passedStory.extractionStatus === 'failed')) {
        extractContent(passedStory.url);
      }
    } else {
      setError('Story data not found');
    }
  }, [passedStory, articleId]);

  const extractContent = async (url: string) => {
    try {
      setExtracting(true);
      const extractedContent = await ContentExtractorService.extractArticleContent(url, {
        timeout: 10000,
        maxContentLength: 100000,
        minContentLength: 200,
      });

      if (story) {
        setStory(prev => prev ? {
          ...prev,
          extractedContent: {
            success: extractedContent.success,
            content: extractedContent.content,
            author: extractedContent.author,
            siteName: extractedContent.siteName,
            wordCount: extractedContent.wordCount,
            extractionMethod: extractedContent.extractionMethod,
            error: extractedContent.error,
          },
          extractionStatus: extractedContent.success ? 'success' : 'failed'
        } : null);
      }
    } catch (err) {
      console.warn('Content extraction failed:', err);
      if (story) {
        setStory(prev => prev ? {
          ...prev,
          extractionStatus: 'failed',
          extractedContent: {
            success: false,
            error: 'Content extraction failed'
          }
        } : null);
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleOpenOriginal = async () => {
    if (story?.url) {
      await Linking.openURL(story.url);
    }
  };

  const handleOpenComments = async () => {
    if (story?.commentsUrl) {
      await Linking.openURL(story.commentsUrl);
    }
  };

  const handleRetryExtraction = () => {
    if (story?.url) {
      extractContent(story.url);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReadingTime = () => {
    if (story?.extractedContent?.wordCount) {
      return Math.ceil(story.extractedContent.wordCount / 200);
    }
    return 1;
  };

  if (loading) {
    return <LoadingSpinner message="Loading article..." isDark={isDark} />;
  }

  if (error || !story) {
    return (
      <ErrorMessage 
        message={error || 'Story not found'} 
        onRetry={() => navigation.goBack()} 
        isDark={isDark}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header 
        title="Article"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightAction={{
          icon: 'open-outline',
          onPress: handleOpenOriginal
        }}
        isDark={isDark}
      />
      
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title and Metadata */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {story.title}
          </Text>
          
          <View style={styles.metadata}>
            <Text style={[styles.author, { color: colors.textSecondary }]}>
              by {story.by}
            </Text>
            <Text style={[styles.time, { color: colors.textMuted }]}>
              {formatTime(story.time)}
            </Text>
          </View>
          
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Ionicons name="arrow-up" size={16} color={Colors.primary} />
              <Text style={[styles.statText, { color: Colors.primary }]}>
                {story.score}
              </Text>
            </View>
            <TouchableOpacity style={styles.statItem} onPress={handleOpenComments}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.statText, { color: colors.textMuted }]}>
                {story.descendants || 0}
              </Text>
            </TouchableOpacity>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.statText, { color: colors.textMuted }]}>
                {getReadingTime()} min
              </Text>
            </View>
          </View>
        </View>

        {/* Extraction Status */}
        {story.extractedContent && (
          <View style={styles.extractionStatus}>
            <Text style={[styles.extractionLabel, { color: colors.textMuted }]}>
              Content extracted via {story.extractedContent.extractionMethod}
              {story.extractedContent.siteName && ` from ${story.extractedContent.siteName}`}
            </Text>
          </View>
        )}

        {/* Content Loading */}
        {extracting && (
          <View style={styles.section}>
            <LoadingSpinner message="Extracting content..." isDark={isDark} />
          </View>
        )}

        {/* AI Summary */}
        {story.summary && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              AI Summary {story.summary.cached ? '⚡' : '✨'}
            </Text>
            <Text style={[styles.summaryContent, { color: colors.textSecondary }]}>
              {story.summary.summary}
            </Text>
            <View style={styles.summaryMeta}>
              <Text style={[styles.summaryStats, { color: colors.textMuted }]}>
                {story.summary.wordCount} words • {story.summary.confidence ? Math.round(story.summary.confidence * 100) : 'N/A'}% confidence
                {story.summary.tokensUsed && ` • ${story.summary.tokensUsed} tokens`}
              </Text>
              {story.summary.cached && (
                <Text style={[styles.cachedNote, { color: colors.textMuted }]}>
                  Cached result
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Extracted Content */}
        {story.extractedContent?.success && story.extractedContent.content && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Article Content
            </Text>
            <Text style={[styles.articleContent, { color: colors.textSecondary }]}>
              {story.extractedContent.content}
            </Text>
            {story.extractedContent.author && (
              <Text style={[styles.authorNote, { color: colors.textMuted }]}>
                By {story.extractedContent.author}
              </Text>
            )}
          </View>
        )}

        {/* Content Extraction Failed */}
        {story.extractionStatus === 'failed' && !extracting && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Content Unavailable
            </Text>
            <Text style={[styles.errorText, { color: colors.textMuted }]}>
              {story.extractedContent?.error || 'Content extraction failed'}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: Colors.primary }]}
              onPress={handleRetryExtraction}
            >
              <Text style={[styles.retryButtonText, { color: Colors.card }]}>
                Retry Extraction
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Original Text Content (for Ask HN, Show HN etc.) */}
        {story.text && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Discussion
            </Text>
            <Text style={[styles.originalText, { color: colors.textSecondary }]}>
              {story.text}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {story.url && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.primary }]}
              onPress={handleOpenOriginal}
              activeOpacity={0.8}
            >
              <Ionicons name="open-outline" size={20} color={Colors.card} />
              <Text style={[styles.actionButtonText, { color: Colors.card }]}>
                Read Original
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: Colors.primary }]}
            onPress={handleOpenComments}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
            <Text style={[styles.actionButtonText, { color: Colors.primary }]}>
              HN Comments
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    padding: Spacing.screenPadding,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSizes.title,
    fontWeight: Typography.fontWeights.bold,
    lineHeight: Typography.lineHeights.tight * Typography.fontSizes.title,
    marginBottom: Spacing.md,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  author: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.medium,
  },
  time: {
    fontSize: Typography.fontSizes.sm,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  statText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    marginLeft: Spacing.xs,
  },
  extractionStatus: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    marginBottom: Spacing.lg,
  },
  extractionLabel: {
    fontSize: Typography.fontSizes.sm,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: Spacing.md,
  },
  articleContent: {
    fontSize: Typography.fontSizes.md,
    lineHeight: Typography.lineHeights.relaxed * Typography.fontSizes.md,
  },
  authorNote: {
    fontSize: Typography.fontSizes.sm,
    fontStyle: 'italic',
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: Typography.fontSizes.md,
    lineHeight: Typography.lineHeights.normal * Typography.fontSizes.md,
    marginBottom: Spacing.md,
  },
  retryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  originalText: {
    fontSize: Typography.fontSizes.md,
    lineHeight: Typography.lineHeights.relaxed * Typography.fontSizes.md,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    marginLeft: Spacing.sm,
  },
  summaryContent: {
    fontSize: Typography.fontSizes.md,
    lineHeight: Typography.lineHeights.relaxed * Typography.fontSizes.md,
    marginBottom: Spacing.sm,
  },
  summaryMeta: {
    marginTop: Spacing.sm,
  },
  summaryStats: {
    fontSize: Typography.fontSizes.sm,
    marginBottom: Spacing.xs,
  },
  cachedNote: {
    fontSize: Typography.fontSizes.xs,
    fontStyle: 'italic',
  },
});