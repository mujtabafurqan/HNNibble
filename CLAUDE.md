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
- **AI Summarization**: OpenAI GPT-4o-mini integration with intelligent caching

## Development Commands
- **Start Metro**: `npm start`
- **Run iOS**: `npx react-native run-ios`
- **Run Android**: `npx react-native run-android`
- **Type Check**: `npx tsc --noEmit`
- **Test**: `npm test`
- **Validate AI**: `node scripts/validateSummarization.js`
- **Test AI**: `node scripts/testSummarization.js [command]`
- **Monitor AI**: `node scripts/monitorSummarization.js`

## Development Phases
1. **Foundation**: Project setup, navigation, basic UI ✓
2. **Core Data**: HN API integration, content extraction ✓
3. **AI Integration**: Summarization service ✓
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

interface SummaryResponse {
  summary: string;
  wordCount: number;
  confidence: number;
  tokensUsed: number;
  processingTime: number;
  cached: boolean;
  model: string;
  cost?: number;
  metadata: SummaryMetadata;
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
- **AI Summarization**: OpenAI GPT-4o-mini API
  - Cost: ~$0.002 per summary (150 tokens)
  - Rate limit: Handled with exponential backoff
  - Models: GPT-4o-mini (primary), fallback strategies
  - Quality validation and retry logic

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
│   ├── contentExtractor.ts ✓
│   ├── summarizationService.ts ✓
│   ├── summaryCache.ts ✓
│   ├── summaryQueue.ts ✓
│   └── __tests__/ ✓
│       ├── summarizationService.test.ts ✓
│       ├── summaryCache.test.ts ✓
│       └── summaryQueue.test.ts ✓
├── utils/
│   ├── timeUtils.ts ✓
│   ├── storage.ts
│   └── notifications.ts
├── types/
│   ├── index.ts ✓
│   ├── navigation.ts ✓
│   └── summarization.ts ✓
├── constants/
│   ├── colors.ts ✓
│   ├── spacing.ts ✓
│   ├── typography.ts ✓
│   └── prompts.ts ✓
├── hooks/
│   └── useTheme.ts ✓
└── navigation/
    ├── RootNavigator.tsx ✓
    └── TabNavigator.tsx ✓
scripts/
├── testSummarization.js ✓
├── validateSummarization.js ✓
└── monitorSummarization.js ✓
.env.example ✓
```

## Task Breakdown Status
- [x] **Task 1**: Project setup and basic navigation
- [x] **Task 2**: Content extraction service
- [x] **Task 3**: AI summarization integration
  - [x] OpenAI GPT-4o-mini integration
  - [x] Intelligent caching system (LRU, content-based hashing)
  - [x] Background queue processing with priorities
  - [x] Quality validation and retry logic
  - [x] Cost tracking and optimization
  - [x] Comprehensive testing (66 test cases)
  - [x] Monitoring and validation tools
  - [x] UI integration with summary display
- [ ] **Task 4**: Local data management
- [ ] **Task 5**: User preferences and settings
- [ ] **Task 6**: Push notifications
- [ ] **Task 7**: Background processing
- [ ] **Task 8**: UI/UX polish
- [ ] **Task 9**: Testing and deployment

## AI Summarization Implementation

### Core Services
- **SummarizationService**: Main AI service with OpenAI integration
  - Intelligent prompt selection (technical, general, primary, fallback)
  - Cost optimization and token tracking
  - Quality validation and retry logic
  - Batch processing capabilities

- **SummaryCacheService**: Intelligent caching system
  - Content-based SHA256 hashing for deduplication
  - LRU eviction with access frequency consideration
  - Configurable expiry (7 days) and size limits (500 items)
  - 80%+ cache hit rate target

- **SummaryQueueService**: Background processing queue
  - Priority-based processing (high/normal/low)
  - Concurrent processing (3 simultaneous requests)
  - Exponential backoff retry logic
  - Real-time progress tracking

### Key Features
- **Smart Prompts**: Auto-selection based on content analysis
- **Cost Control**: ~$0.002 per summary, with $0.01 limit per summary
- **Quality Assurance**: Length validation, AI refusal detection, readability scoring
- **Performance**: Sub-5 second processing, intelligent caching
- **Monitoring**: Real-time metrics, cost tracking, error alerting

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Add your OpenAI API key
OPENAI_API_KEY=your_api_key_here

# Validate implementation
node scripts/validateSummarization.js

# Test functionality
node scripts/testSummarization.js full-report

# Monitor in real-time
node scripts/monitorSummarization.js
```

## Common Issues & Solutions
- **Content Extraction Failures**: Implement fallback to article metadata/description ✓
- **Rate Limiting**: Add intelligent caching and request spacing ✓
- **AI Cost Control**: Implement token limits and cost tracking ✓
- **Cache Management**: LRU eviction with size and time limits ✓
- **Quality Control**: Multi-layer validation with retry logic ✓
- **Notification Permissions**: Handle gracefully, provide clear user guidance
- **Background Processing**: Use appropriate background task libraries
- **Cross-Platform Differences**: Test on both iOS and Android regularly

## Testing Strategy
- **Unit Tests**: Service functions (API calls, summarization) ✓
  - 66 comprehensive test cases across all AI services
  - Mock OpenAI responses and AsyncStorage
  - Error handling and edge case coverage
- **Integration Tests**: Component rendering, navigation flows
- **AI-Specific Testing**: ✓
  - Quality validation on sample articles
  - Performance and cost analysis
  - Cache effectiveness measurement
  - Prompt optimization comparison
- **Manual Testing**: User flows, notification delivery, edge cases
- **Performance Testing**: App startup time, memory usage ✓

## Development Environment
- **Node.js**: v18+ required
- **React Native CLI**: Latest stable
- **OpenAI API**: Account with API key required
- **Dependencies**: All AI packages installed ✓
  - openai: ^5.10.1
  - react-native-dotenv: ^3.4.11
  - crypto-js: ^4.2.0
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