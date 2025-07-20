declare module '@env' {
  export const OPENAI_API_KEY: string;
  export const OPENAI_MODEL: string;
  export const OPENAI_MAX_TOKENS: string;
  export const OPENAI_TEMPERATURE: string;
  export const SUMMARY_TIMEOUT_MS: string;
  export const SUMMARY_RETRY_ATTEMPTS: string;
  export const SUMMARY_CACHE_EXPIRY_DAYS: string;
  export const MAX_CACHE_SIZE: string;
  export const MAX_CONCURRENT_SUMMARIES: string;
  export const MAX_COST_PER_SUMMARY_USD: string;
  export const MIN_SUMMARY_LENGTH_WORDS: string;
  export const MAX_SUMMARY_LENGTH_WORDS: string;
  export const ENABLE_QUALITY_VALIDATION: string;
}