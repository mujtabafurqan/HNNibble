import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { EnhancedStory } from './index';

export type RootStackParamList = {
  Main: undefined;
  ArticleDetail: { articleId: number; story?: EnhancedStory };
  About: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Settings: undefined;
};

export type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'> & 
  BottomTabNavigationProp<MainTabParamList, 'Home'>;

export type SettingsScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Settings'>;

export type ArticleDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ArticleDetail'>;
export type ArticleDetailScreenRouteProp = RouteProp<RootStackParamList, 'ArticleDetail'>;

export type AboutScreenNavigationProp = StackNavigationProp<RootStackParamList, 'About'>;

export interface NavigationProps {
  navigation: HomeScreenNavigationProp | SettingsScreenNavigationProp | ArticleDetailScreenNavigationProp | AboutScreenNavigationProp;
}