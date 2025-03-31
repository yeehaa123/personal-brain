/**
 * Centralized configuration for the personal-brain application
 * Loads values from environment variables with sensible defaults
 */

// Import environment variables from .env file if present
// dotenv import would go here if we were using it

// Log configuration
export const logConfig = {
  // Log levels
  consoleLevel: process.env.LOG_CONSOLE_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  fileLevel: process.env.LOG_FILE_LEVEL || 'debug',
  
  // Log file paths
  errorLogPath: process.env.ERROR_LOG_PATH || 'error.log',
  combinedLogPath: process.env.COMBINED_LOG_PATH || 'combined.log',
  debugLogPath: process.env.DEBUG_LOG_PATH || 'debug.log',
};

// AI Model configuration
export const aiConfig = {
  // OpenAI configuration
  openAI: {
    apiKey: process.env.OPENAI_API_KEY || '',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    embeddingDimension: parseInt(process.env.OPENAI_EMBEDDING_DIMENSION || '1536', 10),
    batchSize: parseInt(process.env.OPENAI_BATCH_SIZE || '10', 10),
    chunkSize: parseInt(process.env.OPENAI_CHUNK_SIZE || '512', 10),
    chunkOverlap: parseInt(process.env.OPENAI_CHUNK_OVERLAP || '100', 10),
    
    // Fallback embedding parameters
    fallbackSeed: 0.1,
    fallbackMultiplier: 10000,
    fallbackScaleFactor: 0.8,
    fallbackOffset: 0.4,
  },
  
  // Anthropic configuration
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    defaultModel: process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219',
    defaultMaxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.0'),
  },
};

// Text processing configuration
export const textConfig = {
  // Chunking parameters
  defaultChunkSize: parseInt(process.env.DEFAULT_CHUNK_SIZE || '512', 10),
  defaultChunkOverlap: parseInt(process.env.DEFAULT_CHUNK_OVERLAP || '100', 10),
  
  // Truncation thresholds
  tagContentMaxLength: parseInt(process.env.TAG_CONTENT_MAX_LENGTH || '10000', 10),
  
  // Tag extraction
  defaultMaxTags: parseInt(process.env.DEFAULT_MAX_TAGS || '7', 10),
  defaultMaxKeywords: parseInt(process.env.DEFAULT_MAX_KEYWORDS || '10', 10),
  
  // Reading time calculation
  defaultWordsPerMinute: parseInt(process.env.DEFAULT_WORDS_PER_MINUTE || '200', 10),
};

// External API configuration
export const apiConfig = {
  // Wikipedia API configuration
  wikipedia: {
    baseUrl: process.env.WIKIPEDIA_API_URL || 'https://en.wikipedia.org/w/api.php',
    userAgent: process.env.WIKIPEDIA_USER_AGENT || 'PersonalBrain/1.0 (personal use)',
  },
  
  // News API configuration
  newsApi: {
    apiKey: process.env.NEWS_API_KEY || '',
    baseUrl: process.env.NEWS_API_URL || 'https://newsapi.org/v2',
    maxAgeHours: parseInt(process.env.NEWS_API_MAX_AGE_HOURS || '168', 10), // 24 * 7 = 168 hours (1 week)
  },
};

// Application paths
export const pathConfig = {
  profilesPath: process.env.PROFILES_PATH || './src/models/profiles',
  importPath: process.env.IMPORT_PATH || './articles',
};

// Database configuration
export const dbConfig = {
  dbPath: process.env.DB_PATH || './brain.db',
};

// Export the combined configuration
export default {
  log: logConfig,
  ai: aiConfig,
  text: textConfig,
  api: apiConfig,
  path: pathConfig,
  db: dbConfig,
};