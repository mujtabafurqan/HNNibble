import { PromptTemplate, SummaryPromptType } from '../types/summarization';

export const SUMMARIZATION_PROMPTS: Record<SummaryPromptType, PromptTemplate> = {
  primary: {
    type: 'primary',
    template: `Summarize this article in exactly 2-3 sentences for a tech-savvy audience. Focus on the key insights, findings, or announcements. Make it engaging and informative while preserving technical accuracy.

Title: {title}
Content: {content}

Instructions:
- Write 2-3 clear, concise sentences
- Focus on the most important takeaways
- Use accessible language while maintaining technical precision
- Avoid unnecessary jargon or filler words
- Make it interesting and worth reading

Summary:`,
    description: 'Primary prompt for technical articles and general HN content',
    useCase: ['technical articles', 'startups', 'programming', 'general tech news'],
    maxTokens: 150
  },

  technical: {
    type: 'technical',
    template: `Create a concise technical summary in exactly 2-3 sentences for software developers and engineers. Focus on implementation details, technical specifications, and practical implications.

Title: {title}
Content: {content}

Instructions:
- Emphasize technical details and implementation approaches
- Include relevant technologies, frameworks, or methodologies mentioned
- Highlight performance implications or architectural decisions
- Use precise technical terminology
- Keep it practical and actionable

Summary:`,
    description: 'Specialized prompt for highly technical content',
    useCase: ['programming tutorials', 'system architecture', 'performance analysis', 'technical deep-dives'],
    maxTokens: 150
  },

  general: {
    type: 'general',
    template: `Explain this article in exactly 2-3 simple sentences for a general audience. Focus on the main idea and why it matters, avoiding technical jargon.

Title: {title}
Content: {content}

Instructions:
- Use plain, accessible language
- Explain technical concepts in simple terms
- Focus on the broader impact or significance
- Make it understandable to non-technical readers
- Maintain accuracy while simplifying complexity

Summary:`,
    description: 'Simplified prompt for non-technical audiences',
    useCase: ['business news', 'policy discussions', 'general interest stories', 'social topics'],
    maxTokens: 120
  },

  fallback: {
    type: 'fallback',
    template: `In exactly 2-3 sentences, what are the main points of this article?

Title: {title}
Content: {content}

Summary:`,
    description: 'Simple fallback prompt when other approaches fail',
    useCase: ['error recovery', 'unusual content', 'very short articles'],
    maxTokens: 100
  }
};

export function getPromptForContent(title: string, content: string): PromptTemplate {
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  
  // Technical keywords that suggest using the technical prompt
  const technicalKeywords = [
    'api', 'framework', 'library', 'algorithm', 'performance', 'benchmark',
    'architecture', 'database', 'programming', 'code', 'implementation',
    'javascript', 'python', 'rust', 'go', 'typescript', 'react', 'vue',
    'docker', 'kubernetes', 'aws', 'cloud', 'devops', 'ml', 'ai',
    'neural', 'machine learning', 'deep learning', 'gpu', 'cpu'
  ];
  
  // General/business keywords that suggest using the general prompt
  const generalKeywords = [
    'business', 'startup', 'funding', 'ipo', 'acquisition', 'policy',
    'regulation', 'privacy', 'security breach', 'market', 'economy',
    'social', 'society', 'ethics', 'law', 'legal'
  ];
  
  // Count keyword matches
  const technicalScore = technicalKeywords.reduce((score, keyword) => {
    if (titleLower.includes(keyword) || contentLower.includes(keyword)) {
      return score + 1;
    }
    return score;
  }, 0);
  
  const generalScore = generalKeywords.reduce((score, keyword) => {
    if (titleLower.includes(keyword) || contentLower.includes(keyword)) {
      return score + 1;
    }
    return score;
  }, 0);
  
  // Decide which prompt to use
  if (technicalScore > generalScore && technicalScore >= 2) {
    return SUMMARIZATION_PROMPTS.technical;
  } else if (generalScore > technicalScore && generalScore >= 2) {
    return SUMMARIZATION_PROMPTS.general;
  } else {
    return SUMMARIZATION_PROMPTS.primary;
  }
}

export function formatPrompt(template: string, title: string, content: string): string {
  return template
    .replace('{title}', title.trim())
    .replace('{content}', content.trim());
}

export const SYSTEM_PROMPT = `You are an expert article summarizer specializing in technology content from Hacker News. Your goal is to create concise, accurate, and engaging summaries that capture the essence of articles for busy tech professionals.

Key principles:
- Always write exactly 2-3 sentences
- Prioritize the most important and interesting information
- Maintain accuracy while being concise
- Use clear, professional language
- Focus on actionable insights when possible
- Avoid speculation or adding information not in the source`;

export const QUALITY_CHECK_PROMPT = `Evaluate this summary for quality on a scale of 1-10:

Original Title: {title}
Summary: {summary}

Rate the summary based on:
1. Accuracy (does it represent the article correctly?)
2. Clarity (is it easy to understand?)
3. Completeness (does it capture the key points?)
4. Conciseness (is it appropriately brief?)

Provide only a single number from 1-10:`;

export const PROMPT_TOKENS = {
  primary: 180,
  technical: 200,
  general: 160,
  fallback: 80,
  system: 120,
  qualityCheck: 100
} as const;