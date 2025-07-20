# HN Nibble 📱

AI-powered summaries of Hacker News stories in bite-sized nibbles.

## Overview

HN Nibble is a React Native app built with Expo that provides concise, AI-generated summaries of Hacker News articles. Instead of reading full articles, users can quickly digest the key points and decide which stories are worth diving deeper into.

## Features

- 📰 **Smart Summaries**: AI-powered article summaries with key points
- 🔄 **Real-time Updates**: Pull-to-refresh for latest stories
- 🎨 **Clean Interface**: Educational app-style design with card-based layout
- ⚙️ **Customizable**: Settings for summary length, categories, and notifications
- 📱 **Cross-platform**: Built with React Native for iOS and Android
- 🌙 **Dark Mode Ready**: Theme support (implementation in progress)

## Tech Stack

- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **TypeScript** - Type safety and better development experience
- **React Navigation** - Navigation library with tabs and stack navigation
- **Expo Vector Icons** - Comprehensive icon library
- **Async Storage** - Local data persistence

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ArticleCard.tsx  # Individual article display
│   ├── LoadingSpinner.tsx
│   ├── ErrorMessage.tsx
│   └── Header.tsx
├── screens/            # Screen components
│   ├── HomeScreen.tsx   # Main feed of stories
│   ├── SettingsScreen.tsx
│   ├── ArticleDetailScreen.tsx
│   └── AboutScreen.tsx
├── navigation/         # Navigation configuration
│   ├── RootNavigator.tsx
│   └── TabNavigator.tsx
├── services/          # API and external services
│   └── hackerNewsApi.ts
├── types/             # TypeScript type definitions
│   ├── index.ts
│   └── navigation.ts
├── constants/         # App constants and theming
│   ├── colors.ts
│   ├── spacing.ts
│   └── typography.ts
├── hooks/             # Custom React hooks
└── utils/             # Helper functions
```

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development)
- Android Studio/Emulator (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/hnnibble.git
   cd HNNibble
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   - iOS: `npm run ios` or scan QR code with Expo Go
   - Android: `npm run android` or scan QR code with Expo Go
   - Web: `npm run web`

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run in web browser
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint (when configured)

## Development

### Type Safety

The project uses TypeScript for type safety. Key type definitions:

- `HackerNewsStory` - Original HN story structure
- `ArticleSummary` - Processed story with AI summary
- `UserPreferences` - User settings and preferences
- Navigation types for React Navigation

### Styling

The app uses a consistent design system with:

- **Colors**: Hacker News orange theme with dark mode support
- **Typography**: Consistent font sizes and weights
- **Spacing**: Standardized spacing scale
- **Components**: Reusable styled components

### Navigation

- **Tab Navigation**: Main app navigation between Home and Settings
- **Stack Navigation**: Modal-style screens for article details and about page
- **Type-safe Navigation**: Full TypeScript support for navigation parameters

## Future Enhancements

- [ ] AI summary integration with OpenAI/Anthropic APIs
- [ ] Offline reading with local storage
- [ ] Push notifications for trending stories
- [ ] User accounts and personalized recommendations
- [ ] Social features (sharing, bookmarking)
- [ ] Search functionality
- [ ] Category filtering
- [ ] Reading history and statistics

## API Integration

The app is designed to integrate with:

1. **Hacker News API** - For fetching story data
2. **AI Summary API** - For generating article summaries (to be implemented)
3. **User Preferences API** - For syncing settings across devices

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Hacker News for providing the API and community
- The React Native and Expo teams for excellent development tools
- The open-source community for inspiration and resources

---

Made with ❤️ for the Hacker News community