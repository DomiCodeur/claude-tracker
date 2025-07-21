/**
 * Claude Code Session File Reader
 * Cross-platform reader for Claude Code session JSONL files
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { globSync } from 'glob';
import { ClaudeMessage, SessionUsage } from './types.js';

export class ClaudeReader {
  private claudeDir: string;

  constructor() {
    this.claudeDir = join(homedir(), '.claude');
  }

  /**
   * Find the most recent Claude Code session file
   */
  findLatestSessionFile(): string | null {
    try {
      const projectsDir = join(this.claudeDir, 'projects');
      
      if (!existsSync(projectsDir)) {
        return null;
      }

      // Find all JSONL files in projects subdirectories
      const patterns = [
        join(projectsDir, '**/*.jsonl'),
        join(projectsDir, '**/conversations_*.jsonl')
      ];

      let allFiles: string[] = [];
      
      for (const pattern of patterns) {
        try {
          const files = globSync(pattern, { absolute: true });
          allFiles.push(...files);
        } catch (error) {
          // Ignore glob errors and continue
        }
      }

      if (allFiles.length === 0) {
        return null;
      }

      // Find most recently modified file
      const latestFile = allFiles.reduce((latest, current) => {
        const currentStats = statSync(current);
        const latestStats = statSync(latest);
        
        return currentStats.mtime > latestStats.mtime ? current : latest;
      });

      return latestFile;
    } catch (error) {
      console.error('Error finding session file:', error);
      return null;
    }
  }

  /**
   * Parse a Claude Code session file and extract usage data
   */
  parseSessionFile(filePath: string): SessionUsage | null {
    try {
      if (!existsSync(filePath)) {
        return null;
      }

      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let sessionStart: Date | null = null;

      for (const line of lines) {
        try {
          const message: ClaudeMessage = JSON.parse(line);

          // Get session start time from first message
          if (!sessionStart && message.timestamp) {
            sessionStart = new Date(message.timestamp);
          }

          // Extract token usage from assistant messages
          if (message.type === 'assistant' && message.message?.usage) {
            const usage = message.message.usage;
            totalInputTokens += usage.input_tokens || 0;
            totalOutputTokens += usage.output_tokens || 0;
          }
        } catch (parseError) {
          // Skip invalid JSON lines
          continue;
        }
      }

      if (!sessionStart) {
        return null;
      }

      // Calculate reset time (5 hours from session start)
      const resetTime = new Date(sessionStart.getTime() + (5 * 60 * 60 * 1000));
      const now = new Date();
      
      let timeRemaining = null;
      if (now < resetTime) {
        const remainingMs = resetTime.getTime() - now.getTime();
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        timeRemaining = { hours, minutes };
      }

      return {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        sessionStart,
        resetTime,
        timeRemaining
      };
    } catch (error) {
      console.error('Error parsing session file:', error);
      return null;
    }
  }

  /**
   * Get current session usage data
   */
  getCurrentUsage(): SessionUsage | null {
    const sessionFile = this.findLatestSessionFile();
    
    if (!sessionFile) {
      return null;
    }

    return this.parseSessionFile(sessionFile);
  }
}