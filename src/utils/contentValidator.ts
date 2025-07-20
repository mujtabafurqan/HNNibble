import { ContentValidationResult } from '../types/contentExtraction';

export class ContentValidator {
  private static readonly MIN_WORD_COUNT = 100;
  private static readonly MAX_WORD_COUNT = 50000;
  private static readonly MIN_TITLE_LENGTH = 10;
  private static readonly MAX_TITLE_LENGTH = 300;
  
  private static readonly SPAM_PATTERNS = [
    /\b(click here|subscribe now|limited time|act now)\b/gi,
    /\b(casino|poker|gambling|lottery)\b/gi,
    /\b(viagra|cialis|pharmacy)\b/gi,
    /\b(make money fast|work from home|get rich quick)\b/gi,
  ];

  private static readonly LOW_QUALITY_PATTERNS = [
    /^[\s\n\r]*$/,
    /^(.{1,20}\s*){1,5}$/,
    /^(error|404|not found|access denied)/gi,
    /^(loading|please wait|redirecting)/gi,
  ];

  static validateExtractedContent(
    title: string,
    content: string,
    url: string
  ): ContentValidationResult {
    const issues: string[] = [];
    let score = 100;

    const wordCount = this.countWords(content);
    const titleLength = title.trim().length;

    if (wordCount < this.MIN_WORD_COUNT) {
      issues.push(`Content too short: ${wordCount} words (minimum: ${this.MIN_WORD_COUNT})`);
      score -= 30;
    }

    if (wordCount > this.MAX_WORD_COUNT) {
      issues.push(`Content too long: ${wordCount} words (maximum: ${this.MAX_WORD_COUNT})`);
      score -= 10;
    }

    if (titleLength < this.MIN_TITLE_LENGTH) {
      issues.push(`Title too short: ${titleLength} characters`);
      score -= 20;
    }

    if (titleLength > this.MAX_TITLE_LENGTH) {
      issues.push(`Title too long: ${titleLength} characters`);
      score -= 10;
    }

    if (this.detectSpam(content)) {
      issues.push('Spam patterns detected');
      score -= 40;
    }

    if (this.isLowQuality(content)) {
      issues.push('Low quality content detected');
      score -= 35;
    }

    const readabilityScore = this.calculateReadabilityScore(content);
    if (readabilityScore < 30) {
      issues.push('Poor readability score');
      score -= 15;
    }

    if (this.hasTooManySpecialCharacters(content)) {
      issues.push('Too many special characters');
      score -= 10;
    }

    if (this.hasUnbalancedStructure(content)) {
      issues.push('Unbalanced content structure');
      score -= 10;
    }

    if (!this.isEnglishContent(content)) {
      issues.push('Non-English content detected');
      score -= 5;
    }

    const finalScore = Math.max(0, Math.min(100, score));
    const isValid = finalScore >= 60 && issues.length < 3;

    return {
      isValid,
      score: finalScore,
      issues,
      wordCount,
      readabilityScore,
    };
  }

  static countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0 && /\w/.test(word))
      .length;
  }

  private static detectSpam(content: string): boolean {
    return this.SPAM_PATTERNS.some(pattern => pattern.test(content));
  }

  private static isLowQuality(content: string): boolean {
    return this.LOW_QUALITY_PATTERNS.some(pattern => pattern.test(content));
  }

  private static calculateReadabilityScore(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = this.countWords(content);
    const syllables = this.countSyllables(content);

    if (sentences.length === 0 || words === 0) return 0;

    const avgWordsPerSentence = words / sentences.length;
    const avgSyllablesPerWord = syllables / words;

    const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    return Math.max(0, Math.min(100, fleschScore));
  }

  private static countSyllables(text: string): number {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    return words.reduce((total, word) => {
      let syllableCount = word.match(/[aeiouy]+/g)?.length || 1;
      if (word.endsWith('e')) syllableCount--;
      return total + Math.max(1, syllableCount);
    }, 0);
  }

  private static hasTooManySpecialCharacters(content: string): boolean {
    const specialChars = content.match(/[^\w\s.,!?;:'"()-]/g) || [];
    const totalChars = content.length;
    return totalChars > 0 && (specialChars.length / totalChars) > 0.1;
  }

  private static hasUnbalancedStructure(content: string): boolean {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) return true;

    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    const veryShortLines = lines.filter(line => line.length < avgLineLength * 0.3).length;
    const veryLongLines = lines.filter(line => line.length > avgLineLength * 3).length;

    return (veryShortLines + veryLongLines) / lines.length > 0.4;
  }

  private static isEnglishContent(content: string): boolean {
    const englishWords = [
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at'
    ];

    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    const englishWordCount = words.filter(word => englishWords.includes(word)).length;
    
    return words.length > 0 && (englishWordCount / words.length) > 0.05;
  }

  static getContentPreview(content: string, maxLength: number = 300): string {
    if (content.length <= maxLength) return content;
    
    const truncated = content.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxLength * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  static cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[^\x00-\x7F]/g, '')
      .trim();
  }

  static estimateReadingTime(content: string): number {
    const wordCount = this.countWords(content);
    const wordsPerMinute = 200;
    return Math.max(1, Math.round(wordCount / wordsPerMinute));
  }
}