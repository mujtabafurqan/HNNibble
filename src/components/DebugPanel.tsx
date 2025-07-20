import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../constants';
import { hackerNewsApi } from '../services/hackerNewsApi';
import { ContentExtractorService } from '../services/contentExtractor';

interface DebugPanelProps {
  extractionStats?: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
  };
  onRefresh?: () => void;
  onClearCache?: () => void;
  isDark?: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  extractionStats,
  onRefresh,
  onClearCache,
  isDark = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [apiStats, setApiStats] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);

  const colors = isDark ? Colors.dark : Colors;

  const refreshStats = () => {
    try {
      const hackerNewsStats = hackerNewsApi.getStats();
      const contentCacheStats = ContentExtractorService.getCacheStats();
      
      setApiStats(hackerNewsStats);
      setCacheStats(contentCacheStats);
    } catch (error) {
      console.warn('Failed to fetch debug stats:', error);
    }
  };

  const handleClearAllCaches = () => {
    Alert.alert(
      'Clear All Caches',
      'This will clear all cached API responses and extracted content. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            hackerNewsApi.clearCache();
            ContentExtractorService.clearCache();
            if (onClearCache) onClearCache();
            refreshStats();
            Alert.alert('Success', 'All caches cleared');
          }
        }
      ]
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isExpanded) {
    return (
      <TouchableOpacity 
        style={[styles.collapsedPanel, { backgroundColor: colors.card }]}
        onPress={() => {
          setIsExpanded(true);
          refreshStats();
        }}
      >
        <View style={styles.collapsedContent}>
          <Ionicons name="bug-outline" size={16} color={Colors.primary} />
          <Text style={[styles.collapsedText, { color: colors.textSecondary }]}>
            Debug Panel
          </Text>
          {extractionStats && (
            <Text style={[styles.statsPreview, { color: Colors.primary }]}>
              {extractionStats.completed}/{extractionStats.total}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.expandedPanel, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="bug-outline" size={20} color={Colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Debug Panel</Text>
        </View>
        <TouchableOpacity onPress={() => setIsExpanded(false)}>
          <Ionicons name="chevron-up" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Content Extraction Stats */}
        {extractionStats && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Content Extraction
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Colors.primary }]}>
                  {extractionStats.total}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Total
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Colors.success || '#28a745' }]}>
                  {extractionStats.completed}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Success
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Colors.error || '#dc3545' }]}>
                  {extractionStats.failed}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Failed
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Colors.warning || '#ffc107' }]}>
                  {extractionStats.inProgress}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Loading
                </Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${extractionStats.total > 0 ? (extractionStats.completed / extractionStats.total) * 100 : 0}%`,
                    backgroundColor: Colors.primary 
                  }
                ]} 
              />
            </View>
          </View>
        )}

        {/* API Stats */}
        {apiStats && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              HN API
            </Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                Rate Limit:
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {apiStats.rateLimiter.requestsInWindow}/{apiStats.rateLimiter.maxRequests}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                Cache Entries:
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {apiStats.cache.size}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                Cache Hits:
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {apiStats.cache.hits}
              </Text>
            </View>
          </View>
        )}

        {/* Content Cache Stats */}
        {cacheStats && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Content Cache
            </Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                Cached Articles:
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {cacheStats.size}
              </Text>
            </View>
            {cacheStats.keys.length > 0 && (
              <Text style={[styles.cacheDetails, { color: colors.textMuted }]}>
                Recent: {cacheStats.keys.slice(0, 3).map((key: string) => {
                  try {
                    const url = new URL(key);
                    return url.hostname.replace('www.', '');
                  } catch {
                    return 'invalid-url';
                  }
                }).join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Actions
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.primary }]}
              onPress={() => {
                refreshStats();
                if (onRefresh) onRefresh();
              }}
            >
              <Ionicons name="refresh" size={16} color={Colors.card} />
              <Text style={[styles.actionButtonText, { color: Colors.card }]}>
                Refresh
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.error || '#dc3545' }]}
              onPress={handleClearAllCaches}
            >
              <Ionicons name="trash" size={16} color={Colors.card} />
              <Text style={[styles.actionButtonText, { color: Colors.card }]}>
                Clear Cache
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            App Info
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
              Version:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              1.0.0-beta
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
              Build:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {new Date().toISOString().split('T')[0]}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  collapsedPanel: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 25,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  collapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapsedText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    marginLeft: Spacing.xs,
    marginRight: Spacing.sm,
  },
  statsPreview: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  expandedPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    maxHeight: '70%',
    borderRadius: 12,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    marginLeft: Spacing.sm,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
  },
  statLabel: {
    fontSize: Typography.fontSizes.xs,
    marginTop: Spacing.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  infoLabel: {
    fontSize: Typography.fontSizes.sm,
  },
  infoValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  cacheDetails: {
    fontSize: Typography.fontSizes.xs,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    marginLeft: Spacing.xs,
  },
});