# HN Bytes - Claude Code Development Guide

## Project Overview
**App Name**: HN Bytes  
**Purpose**: Micro-learning app that delivers AI-summarized Hacker News articles at user-defined intervals  
**Platform**: React Native (iOS/Android)  
**Tech Stack**: React Native + TypeScript + Node.js backend

## Project Goals
- Fetch top Hacker News articles automatically
- Generate concise AI summaries (2-3 sentences)
- Deliver summaries via push notifications at user-set intervals
- Provide clean, educational app experience similar to learning apps
- Allow users to read full articles and HN comments

## Architecture Decisions
- **Frontend**: React Native with TypeScript for type safety
- **Navigation**: React Navigation (bottom tabs + stack)
- **State Management**: React Context (simple state needs)
- **Local Storage**: AsyncStorage for user preferences
- **Notifications**: React Native Push Notifications
- **Content Extraction**: Web scraping with readability libraries
- **AI Summarization**: OpenAI or Claude API integration

## Development Commands
- **Start Metro**: `npm start`
- **Run iOS**: `npx react-native run-ios`
- **Run Android**: `npx react-native run-android`
- **Type Check**: `npx tsc --noEmit`
- **Test**: `npm test`

## Development Phases
1. **Foundation**: Project setup, navigation, basic UI ✓
2. **Core Data**: HN API integration, content extraction
3. **AI Integration**: Summarization service
4. **User Features**: Settings, notifications, reading experience
5. **Polish**: Background processing, optimization, deployment

## Code Standards
- **TypeScript**: Strict mode enabled, proper type definitions
- **File Naming**: PascalCase for components, camelCase for utilities
- **Folder Structure**: Organized by feature/type (components, screens, services)
- **Styling**: StyleSheet with consistent theme/colors
- **Error Handling**: Comprehensive try/catch, user-friendly messages
- **Comments**: JSDoc for functions, inline for complex logic

## Key Data Models
```typescript
interface HackerNewsStory {
  id: number;
  title: string;
  url?: string;
  score: number;
  time: number;
  descendants: number; // comment count
  type: 'story' | 'job' | 'poll';
}

interface ArticleSummary {
  storyId: number;
  title: string;
  originalUrl: string;
  summary: string;
  hnCommentsUrl: string;
  createdAt: Date;
  isRead: boolean;
}

interface UserPreferences {
  notificationFrequency: 'hourly' | '2hours' | '4hours' | 'daily';
  enableNotifications: boolean;
  categories: string[];
  maxSummariesPerDay: number;
}
```

## External APIs & Services
- **Hacker News API**: `https://hacker-news.firebaseio.com/v0/`
  - Rate limit: ~5000 requests/hour (unofficial)
  - No authentication required
  - Returns JSON data
- **Content Extraction**: Web scraping (handle CORS, rate limits)
- **AI Summarization**: OpenAI/Claude API (track usage costs)

## File Structure
```
src/
├── components/
│   ├── ArticleCard.tsx ✓
│   ├── LoadingSpinner.tsx ✓
│   ├── ErrorMessage.tsx ✓
│   └── Header.tsx ✓
├── screens/
│   ├── HomeScreen.tsx ✓
│   ├── SettingsScreen.tsx ✓
│   ├── ArticleDetailScreen.tsx ✓
│   └── AboutScreen.tsx ✓
├── services/
│   ├── hackerNewsApi.ts ✓
│   ├── contentExtractor.ts
│   └── summarizationService.ts
├── utils/
│   ├── timeUtils.ts ✓
│   ├── storage.ts
│   └── notifications.ts
├── types/
│   ├── index.ts ✓
│   └── navigation.ts ✓
├── constants/
│   ├── colors.ts ✓
│   ├── spacing.ts ✓
│   └── typography.ts ✓
├── hooks/
│   └── useTheme.ts ✓
└── navigation/
    ├── RootNavigator.tsx ✓
    └── TabNavigator.tsx ✓
```

## Task Breakdown Status
- [x] **Task 1**: Project setup and basic navigation
- [ ] **Task 2**: Content extraction service
- [ ] **Task 3**: AI summarization integration
- [ ] **Task 4**: Local data management
- [ ] **Task 5**: User preferences and settings
- [ ] **Task 6**: Push notifications
- [ ] **Task 7**: Background processing
- [ ] **Task 8**: UI/UX polish
- [ ] **Task 9**: Testing and deployment

## Common Issues & Solutions
- **Content Extraction Failures**: Implement fallback to article metadata/description
- **Rate Limiting**: Add intelligent caching and request spacing
- **Notification Permissions**: Handle gracefully, provide clear user guidance
- **Background Processing**: Use appropriate background task libraries
- **Cross-Platform Differences**: Test on both iOS and Android regularly

## Testing Strategy
- **Unit Tests**: Service functions (API calls, summarization)
- **Integration Tests**: Component rendering, navigation flows
- **Manual Testing**: User flows, notification delivery, edge cases
- **Performance Testing**: App startup time, memory usage

## Development Environment
- **Node.js**: v18+ required
- **React Native CLI**: Latest stable
- **Platform Requirements**: 
  - iOS: Xcode 14+, iOS 13+ target
  - Android: Android Studio, API level 21+ target

## Claude Code Guidelines
- Each task should be self-contained and testable
- Include specific acceptance criteria for each task
- Provide example data and mock responses for development
- Write clear, actionable prompts with technical details
- Include error handling and edge case considerations
- Focus on incremental progress - each task builds on previous ones