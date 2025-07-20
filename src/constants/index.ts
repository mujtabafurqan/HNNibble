export { Colors, getColors } from './colors';
export { Spacing } from './spacing';
export { Typography } from './typography';

export const APP_CONFIG = {
  name: 'HN Nibble',
  version: '1.0.0',
  hackerNewsApiUrl: 'https://hacker-news.firebaseio.com/v0',
  maxStoriesPerFetch: 30,
  cacheExpiration: 5 * 60 * 1000, // 5 minutes
  summaryApiTimeout: 10000, // 10 seconds
};