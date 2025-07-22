/**
 * Claude Tracker - Type Definitions
 */

export interface SessionUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  sessionStart: Date;
  resetTime: Date;
  timeRemaining: {
    hours: number;
    minutes: number;
  } | null;
}

export interface ClaudeMessage {
  type: string;
  timestamp: string;
  requestId?: string;
  message?: {
    id?: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
}

export interface TrackerConfig {
  sessionLimit: number; // 70000 for Claude Code Pro
  sessionHours: number; // 5 hours
  updateInterval: number; // milliseconds
}

export interface ProgressDisplay {
  percentage: number;
  progressBar: string;
  tokensUsed: string;
  tokenLimit: string;
  resetInfo: string;
}