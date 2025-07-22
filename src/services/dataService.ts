/**
 * Data Service
 * Handles Claude Code session data reading and processing
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { globSync } from 'glob';
import { SessionUsage, ClaudeMessage } from '../types.js';

interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  totalTokens: number;
}

interface SessionBlock {
  id: string;
  startTime: Date;
  endTime: Date;
  actualEndTime?: Date;
  isActive: boolean;
  entries: ClaudeMessage[];
  tokenCounts: TokenCounts;
}

export class DataService {
  private cache: {
    data: SessionBlock | null;
    timestamp: number;
    ttl: number;
  };

  constructor(cacheTTL: number = 30000) { // 30 seconds cache
    this.cache = {
      data: null,
      timestamp: 0,
      ttl: cacheTTL
    };
  }

  /**
   * Get Claude configuration paths with priority order
   */
  private getClaudePaths(): string[] {
    const paths: string[] = [];
    const normalizedPaths = new Set<string>();

    // 1. Environment variable first
    const envPaths = (process.env.CLAUDE_CONFIG_DIR ?? "").trim();
    if (envPaths !== "") {
      const envPathList = envPaths.split(",").map(p => p.trim()).filter(p => p !== "");
      for (const envPath of envPathList) {
        const normalizedPath = join(envPath);
        if (existsSync(normalizedPath)) {
          const projectsPath = join(normalizedPath, "projects");
          if (existsSync(projectsPath) && !normalizedPaths.has(normalizedPath)) {
            normalizedPaths.add(normalizedPath);
            paths.push(normalizedPath);
          }
        }
      }
    }

    // 2. Default paths  
    const defaultPaths = [
      join(homedir(), '.config', 'claude'),  // XDG standard
      join(homedir(), '.claude')             // Traditional
    ];

    for (const defaultPath of defaultPaths) {
      if (existsSync(defaultPath)) {
        const projectsPath = join(defaultPath, "projects");
        if (existsSync(projectsPath) && !normalizedPaths.has(defaultPath)) {
          normalizedPaths.add(defaultPath);
          paths.push(defaultPath);
        }
      }
    }

    return paths;
  }

  /**
   * Find all JSONL files across all Claude paths
   */
  private findAllJsonlFiles(): string[] {
    const claudePaths = this.getClaudePaths();
    if (claudePaths.length === 0) {
      return [];
    }

    const allFiles: string[] = [];

    for (const claudePath of claudePaths) {
      try {
        const claudeDir = join(claudePath, "projects");
        const files = globSync("**/*.jsonl", {
          cwd: claudeDir,
          absolute: true
        });
        allFiles.push(...files);
      } catch (error) {
        // Continue with other paths
      }
    }

    return allFiles;
  }

  /**
   * Sort files by timestamp of first record
   */
  private sortFilesByTimestamp(files: string[]): string[] {
    const fileTimestamps = new Map<string, number>();

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const firstLine = content.split('\n').find(line => line.trim());
        
        if (firstLine) {
          const parsed = JSON.parse(firstLine);
          if (parsed.timestamp) {
            fileTimestamps.set(file, new Date(parsed.timestamp).getTime());
          }
        }
      } catch (error) {
        // Use file mtime as fallback
        fileTimestamps.set(file, statSync(file).mtime.getTime());
      }
    }

    return files.sort((a, b) => {
      const timestampA = fileTimestamps.get(a) || 0;
      const timestampB = fileTimestamps.get(b) || 0;
      return timestampA - timestampB;
    });
  }

  /**
   * Create unique hash to avoid duplicates
   */
  private createUniqueHash(message: ClaudeMessage): string | null {
    const messageId = message.message?.id;
    const requestId = message.requestId;
    
    if (!messageId || !requestId) {
      return null;
    }
    
    return `${messageId}:${requestId}`;
  }

  /**
   * Parse all JSONL files and extract entries
   */
  private parseAllEntries(): ClaudeMessage[] {
    const files = this.findAllJsonlFiles();
    if (files.length === 0) {
      return [];
    }

    const sortedFiles = this.sortFilesByTimestamp(files);
    const processedHashes = new Set<string>();
    const allEntries: ClaudeMessage[] = [];

    for (const file of sortedFiles) {
      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.length > 0);

        for (const line of lines) {
          try {
            const parsed: ClaudeMessage = JSON.parse(line);
            
            // Skip non-assistant messages or messages without usage
            if (parsed.type !== 'assistant' || !parsed.message?.usage) {
              continue;
            }

            // Avoid duplicates
            const uniqueHash = this.createUniqueHash(parsed);
            if (uniqueHash && processedHashes.has(uniqueHash)) {
              continue;
            }
            if (uniqueHash) {
              processedHashes.add(uniqueHash);
            }

            allEntries.push(parsed);
          } catch (error) {
            // Skip invalid JSON lines
            continue;
          }
        }
      } catch (error) {
        // Skip unreadable files
        continue;
      }
    }

    return allEntries.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
  }

  /**
   * Identify current active session block (5-hour window)
   */
  private identifyCurrentSessionBlock(entries: ClaudeMessage[]): SessionBlock | null {
    if (entries.length === 0) {
      return null;
    }

    const now = new Date();
    const sessionDurationMs = 5 * 60 * 60 * 1000; // 5 hours
    
    // Find the most recent activity to determine the current session
    const latestEntry = entries[entries.length - 1];
    const latestTime = new Date(latestEntry.timestamp);
    
    // If latest activity is more than 5h ago, no active session
    const timeSinceLatest = now.getTime() - latestTime.getTime();
    if (timeSinceLatest > sessionDurationMs) {
      return null;
    }
    
    // Special case: if we're very close to "now" (last 5 minutes), 
    // treat this as a new session starting from the most recent continuous activity
    const veryRecentThreshold = 5 * 60 * 1000; // 5 minutes
    if (timeSinceLatest < veryRecentThreshold) {
      // Find the start of recent continuous activity
      let recentSessionStart = latestTime;
      
      for (let i = entries.length - 2; i >= 0; i--) { // Start from second-to-last
        const currentTime = new Date(entries[i].timestamp);
        const nextTime = new Date(entries[i + 1].timestamp);
        const gap = nextTime.getTime() - currentTime.getTime();
        
        // If there's a gap of more than 30 minutes, previous activity is separate
        if (gap > 30 * 60 * 1000) { // 30 minutes gap
          break;
        }
        
        recentSessionStart = currentTime;
        
        // Don't go back more than 5 hours
        if (latestTime.getTime() - currentTime.getTime() > sessionDurationMs) {
          break;
        }
      }
      
      // Create a session starting from this recent activity
      const recentSessionEnd = new Date(recentSessionStart.getTime() + sessionDurationMs);
      const currentEntries: ClaudeMessage[] = [];
      
      for (const entry of entries) {
        const entryTime = new Date(entry.timestamp);
        if (entryTime >= recentSessionStart) {
          currentEntries.push(entry);
        }
      }
      
      if (currentEntries.length > 0) {
        // Calculate tokens for this session
        const tokenCounts: TokenCounts = {
          inputTokens: 0,
          outputTokens: 0,
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 0,
          totalTokens: 0
        };

        for (const entry of currentEntries) {
          if (entry.message?.usage) {
            const usage = entry.message.usage;
            tokenCounts.inputTokens += usage.input_tokens || 0;
            tokenCounts.outputTokens += usage.output_tokens || 0;
            tokenCounts.cacheCreationInputTokens += usage.cache_creation_input_tokens || 0;
            tokenCounts.cacheReadInputTokens += usage.cache_read_input_tokens || 0;
          }
        }

        tokenCounts.totalTokens = tokenCounts.inputTokens + tokenCounts.outputTokens;
        const lastActivity = new Date(currentEntries[currentEntries.length - 1].timestamp);


        return {
          id: recentSessionStart.toISOString(),
          startTime: recentSessionStart,
          endTime: recentSessionEnd,
          actualEndTime: lastActivity,
          isActive: true,
          entries: currentEntries,
          tokenCounts
        };
      }
    }
    
    // Work backwards to find the start of the current session
    // A session starts when there's been no activity for more than 5 hours before it
    let sessionStart = new Date(entries[0].timestamp);
    
    for (let i = entries.length - 1; i >= 0; i--) {
      const currentTime = new Date(entries[i].timestamp);
      
      if (i === 0) {
        // First entry is the session start
        sessionStart = currentTime;
        break;
      }
      
      const prevTime = new Date(entries[i - 1].timestamp);
      const gap = currentTime.getTime() - prevTime.getTime();
      
      // If there's a gap of more than 5 hours, this is the start of the current session
      if (gap > sessionDurationMs) {
        sessionStart = currentTime;
        break;
      }
      
      // If we've gone back more than 5 hours from latest activity, stop here
      const timeFromLatest = latestTime.getTime() - currentTime.getTime();
      if (timeFromLatest >= sessionDurationMs) {
        sessionStart = new Date(latestTime.getTime() - sessionDurationMs);
        break;
      }
    }
    
    // Only include entries that are part of this session (within 5h of session start)
    const sessionEndTime = new Date(sessionStart.getTime() + sessionDurationMs);
    const currentEntries: ClaudeMessage[] = [];
    
    for (const entry of entries) {
      const entryTime = new Date(entry.timestamp);
      if (entryTime >= sessionStart && entryTime <= sessionEndTime) {
        currentEntries.push(entry);
      }
    }

    if (currentEntries.length === 0) {
      return null;
    }

    // Calculate token counts
    const tokenCounts: TokenCounts = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      totalTokens: 0
    };

    for (const entry of currentEntries) {
      if (entry.message?.usage) {
        const usage = entry.message.usage;
        tokenCounts.inputTokens += usage.input_tokens || 0;
        tokenCounts.outputTokens += usage.output_tokens || 0;
        tokenCounts.cacheCreationInputTokens += usage.cache_creation_input_tokens || 0;
        tokenCounts.cacheReadInputTokens += usage.cache_read_input_tokens || 0;
      }
    }

    // Only count actual billable tokens (input + output) for session limits
    // Cache tokens have different pricing but don't count towards session limits
    tokenCounts.totalTokens = tokenCounts.inputTokens + tokenCounts.outputTokens;

    const lastActivity = new Date(currentEntries[currentEntries.length - 1].timestamp);
    const theoreticalEnd = new Date(sessionStart.getTime() + sessionDurationMs);


    return {
      id: sessionStart.toISOString(),
      startTime: sessionStart,
      endTime: theoreticalEnd,
      actualEndTime: lastActivity,
      isActive: true,
      entries: currentEntries,
      tokenCounts
    };
  }

  /**
   * Get current session usage with caching
   */
  getCurrentUsage(): SessionUsage | null {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cache.data && (now - this.cache.timestamp) < this.cache.ttl) {
      const cached = this.cache.data;
      // Convert to SessionUsage format
      return this.convertToSessionUsage(cached);
    }

    // Load fresh data
    try {
      const entries = this.parseAllEntries();
      const currentBlock = this.identifyCurrentSessionBlock(entries);
      
      // Update cache
      this.cache.data = currentBlock;
      this.cache.timestamp = now;

      return currentBlock ? this.convertToSessionUsage(currentBlock) : null;
    } catch (error) {
      console.error('Error loading session data:', error);
      return null;
    }
  }

  /**
   * Convert SessionBlock to SessionUsage format
   */
  private convertToSessionUsage(block: SessionBlock): SessionUsage {
    const now = new Date();
    
    let timeRemaining = null;
    if (now < block.endTime) {
      const remainingMs = block.endTime.getTime() - now.getTime();
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      timeRemaining = { hours, minutes };
    }

    return {
      inputTokens: block.tokenCounts.inputTokens,
      outputTokens: block.tokenCounts.outputTokens,
      totalTokens: block.tokenCounts.totalTokens,
      sessionStart: block.startTime,
      resetTime: block.endTime,
      timeRemaining
    };
  }

  /**
   * Force refresh cache
   */
  refreshCache(): void {
    this.cache.timestamp = 0; // Force next call to reload
  }

  /**
   * Check if Claude data is available
   */
  isAvailable(): boolean {
    const paths = this.getClaudePaths();
    return paths.length > 0 && this.findAllJsonlFiles().length > 0;
  }
}