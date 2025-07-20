import React, { useState } from 'react';
import { View, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ArticleCard, LoadingSpinner, ErrorMessage, Header, DebugPanel } from '../components';
import { EnhancedStory } from '../types';
import { RootStackParamList } from '../types/navigation';
import { Colors, Spacing } from '../constants';
import { useHackerNews } from '../hooks/useHackerNews';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [isDark] = useState(false); // TODO: Connect to theme context
  
  const {
    stories,
    loading,
    refreshing,
    error,
    extractionProgress,
    summarizationProgress,
    extractionStats,
    summarizationStats,
    refreshStories,
    retryExtraction,
    retrySummarization,
    clearCache,
  } = useHackerNews(20);

  const enhanceStoryWithExtraction = (story: any): EnhancedStory => {
    const extractionData = extractionProgress.get(story.id);
    const summarizationData = summarizationProgress.get(story.id);
    
    let extractionStatus: 'loading' | 'success' | 'failed' | 'none' = 'none';
    let extractedContent = undefined;

    if (extractionData === 'loading') {
      extractionStatus = 'loading';
    } else if (extractionData === 'failed') {
      extractionStatus = 'failed';
    } else if (typeof extractionData === 'object') {
      extractionStatus = extractionData.success ? 'success' : 'failed';
      extractedContent = {
        success: extractionData.success,
        content: extractionData.content,
        author: extractionData.author,
        siteName: extractionData.siteName,
        wordCount: extractionData.wordCount,
        extractionMethod: extractionData.extractionMethod,
        error: extractionData.error,
      };
    }

    // Determine summarization status
    let summaryStatus: 'loading' | 'success' | 'failed' | 'none' = 'none';
    let summary = undefined;

    if (summarizationData === 'loading') {
      summaryStatus = 'loading';
    } else if (summarizationData === 'failed') {
      summaryStatus = 'failed';
    } else if (typeof summarizationData === 'object') {
      summaryStatus = 'success';
      summary = summarizationData;
    }

    return {
      ...story,
      extractionStatus,
      extractedContent,
      summaryStatus,
      summary,
    };
  };

  const handleArticlePress = (story: EnhancedStory) => {
    navigation.navigate('ArticleDetail', { 
      articleId: story.id,
      story: story 
    });
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings' as any); // Navigate to Settings tab
  };

  if (loading && stories.length === 0) {
    return <LoadingSpinner message="Loading latest stories..." isDark={isDark} />;
  }

  if (error && stories.length === 0) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={refreshStories} 
        isDark={isDark}
      />
    );
  }

  const enhancedStories = stories.map(enhanceStoryWithExtraction);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Header 
        title="HN Nibble"
        rightAction={{
          icon: 'settings-outline',
          onPress: handleSettingsPress
        }}
        isDark={isDark}
      />
      
      <FlatList
        data={enhancedStories}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ArticleCard
            story={item}
            onPress={() => handleArticlePress(item)}
            onRetryExtraction={() => retryExtraction(item.id)}
            onRetrySummarization={() => retrySummarization(item.id)}
            summary={item.summary}
            summaryStatus={item.summaryStatus}
            isDark={isDark}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshStories}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      
      {__DEV__ && (
        <DebugPanel
          extractionStats={extractionStats}
          onRefresh={refreshStories}
          onClearCache={clearCache}
          isDark={isDark}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingVertical: Spacing.sm,
  },
});