/**
 * Data Service
 * Handles Claude Code session data reading and processing
 */

import { SessionUsage } from '../types.js';
import { readFile } from 'fs/promises';
import { glob } from 'glob';
import path from 'path';

// Interface for Claude JSONL entries
interface ClaudeJSONLEntry {
  timestamp: string;
  message: {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    model?: string;
    id?: string;
  };
  requestId?: string;
  type: string; // "user", "assistant", etc.
}

// Interface pour les tokens calculés
interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  totalTokens: number;
}

// Interface for active session
interface ActiveSession {
  startTime: Date;
  endTime: Date;
  tokenCounts: TokenCounts;
  entries: ClaudeJSONLEntry[];
}

export class DataService {
  private cache: {
    data: ActiveSession | null;
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
   * Find possible Claude configuration paths
   */
  private getClaudePaths(): string[] {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const xdgConfig = process.env.XDG_CONFIG_HOME;
    const claudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
    
    const paths = [];
    
    if (claudeConfigDir) {
      paths.push(claudeConfigDir);
    }
    
    if (xdgConfig) {
      paths.push(path.join(xdgConfig, 'claude'));
    } else {
      paths.push(path.join(homeDir, '.config', 'claude'));
    }
    
    paths.push(path.join(homeDir, '.claude'));
    
    return paths;
  }

  /**
   * Parse une ligne JSONL Claude avec validation stricte
   */
  private parseJSONLLine(line: string): ClaudeJSONLEntry | null {
    try {
      const data = JSON.parse(line.trim());
      
      // Validation : doit avoir timestamp et être type assistant avec usage
      if (!data.timestamp || data.type !== 'assistant' || !data.message?.usage) {
        return null;
      }
      
      return data as ClaudeJSONLEntry;
    } catch {
      return null;
    }
  }

  /**
   * Calculate tokens with proper structure handling
   */
  private calculateTokens(usage: ClaudeJSONLEntry['message']['usage']): TokenCounts {
    if (!usage) {
      return {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        totalTokens: 0
      };
    }
    
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const cacheCreationInputTokens = usage.cache_creation_input_tokens || 0;
    const cacheReadInputTokens = usage.cache_read_input_tokens || 0;
    
    const totalTokens = inputTokens + outputTokens + cacheCreationInputTokens + cacheReadInputTokens;
    
    return {
      inputTokens,
      outputTokens,
      cacheCreationInputTokens,
      cacheReadInputTokens,
      totalTokens
    };
  }

  /**
   * Crée une clé unique pour la déduplication (comme ccusage)
   */
  private createUniqueHash(entry: ClaudeJSONLEntry): string {
    const messageId = entry.message.id || '';
    const requestId = entry.requestId || '';
    return `${messageId}:${requestId}`;
  }

  /**
   * Parse JSONL files and find active session
   */
  private async parseClaudeSession(): Promise<ActiveSession | null> {
    const claudePaths = this.getClaudePaths();
    const allEntries: ClaudeJSONLEntry[] = [];
    const seenHashes = new Set<string>();
    
    for (const claudePath of claudePaths) {
      try {
        const projectsDir = path.join(claudePath, 'projects');
        const pattern = path.join(projectsDir, '**', '*.jsonl');
        const files = await glob(pattern);
        
        for (const file of files) {
          try {
            const content = await readFile(file, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              const entry = this.parseJSONLLine(line);
              if (!entry) continue;
              
              // Déduplication comme ccusage
              const hash = this.createUniqueHash(entry);
              if (seenHashes.has(hash)) continue;
              seenHashes.add(hash);
              
              allEntries.push(entry);
            }
          } catch (error) {
            // Ignore file errors like ccusage
            continue;
          }
        }
      } catch (error) {
        // Ignore path errors
        continue;
      }
    }
    
    if (allEntries.length === 0) {
      return null;
    }
    
    // Sort by timestamp
    allEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Find current session (session containing recent activity)
    const now = new Date();
    const recentThresholdMinutes = 30; // Recent activity within 30 min
    const recentThreshold = new Date(now.getTime() - recentThresholdMinutes * 60 * 1000);
    
    // Find most recent entry
    const latestEntry = allEntries[allEntries.length - 1];
    if (!latestEntry || new Date(latestEntry.timestamp) < recentThreshold) {
      return null; // No recent active session
    }
    
    // Find session start (30+ min gap indicates new session)
    const sessionGapMinutes = 30;
    const sessionGapMs = sessionGapMinutes * 60 * 1000;
    
    let sessionStartIndex = allEntries.length - 1;
    for (let i = allEntries.length - 2; i >= 0; i--) {
      const currentTime = new Date(allEntries[i + 1].timestamp).getTime();
      const prevTime = new Date(allEntries[i].timestamp).getTime();
      
      if (currentTime - prevTime > sessionGapMs) {
        break; // Gap found, session starts at i+1
      }
      sessionStartIndex = i;
    }
    
    const recentEntries = allEntries.slice(sessionStartIndex);
    
    if (recentEntries.length === 0) {
      return null;
    }
    
    // Calculate total tokens with cache token correction
    let totalTokenCounts: TokenCounts = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      totalTokens: 0
    };
    
    let maxCacheReadTokens = 0;
    let maxCacheCreationTokens = 0;
    
    for (const entry of recentEntries) {
      const tokens = this.calculateTokens(entry.message.usage);
      totalTokenCounts.inputTokens += tokens.inputTokens;
      totalTokenCounts.outputTokens += tokens.outputTokens;
      
      // Both cache token types are cumulative - take max of each
      maxCacheCreationTokens = Math.max(maxCacheCreationTokens, tokens.cacheCreationInputTokens);
      maxCacheReadTokens = Math.max(maxCacheReadTokens, tokens.cacheReadInputTokens);
    }
    
    // Only count cache tokens once per session
    totalTokenCounts.cacheCreationInputTokens = maxCacheCreationTokens;
    totalTokenCounts.cacheReadInputTokens = maxCacheReadTokens;
    
    // Calculate total without doubling cache tokens
    totalTokenCounts.totalTokens = totalTokenCounts.inputTokens + 
                                   totalTokenCounts.outputTokens + 
                                   totalTokenCounts.cacheCreationInputTokens + 
                                   totalTokenCounts.cacheReadInputTokens;
    
    // Calculate session times
    const startTime = new Date(recentEntries[0].timestamp);
    const endTime = new Date(startTime.getTime() + 5 * 60 * 60 * 1000); // +5h
    
    return {
      startTime,
      endTime,
      tokenCounts: totalTokenCounts,
      entries: recentEntries
    };
  }

  /**
   * Converti ActiveSession vers SessionUsage
   */
  private convertToSessionUsage(session: ActiveSession): SessionUsage {
    const now = new Date();
    const timeRemaining = session.endTime > now ? {
      hours: Math.floor((session.endTime.getTime() - now.getTime()) / (1000 * 60 * 60)),
      minutes: Math.floor(((session.endTime.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60))
    } : null;

    return {
      inputTokens: session.tokenCounts.inputTokens,
      outputTokens: session.tokenCounts.outputTokens,
      totalTokens: session.tokenCounts.totalTokens,
      sessionStart: session.startTime,
      resetTime: session.endTime,
      timeRemaining
    };
  }

  /**
   * Floor timestamp to hour
   */
  private floorToHour(timestamp: Date): Date {
    const floored = new Date(timestamp);
    floored.setUTCMinutes(0, 0, 0);
    return floored;
  }

  /**
   * Get total tokens (Simple approach - only count actual input/output)
   */
  private getTotalTokens(tokenCounts: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
  }): number {
    // Simple approach: only count actual input and output tokens
    // Cache tokens are overhead/optimization and shouldn't count toward user limit
    return tokenCounts.inputTokens + tokenCounts.outputTokens;
  }

  /**
   * Create session block
   */
  private createBlock(startTime: Date, entries: ClaudeJSONLEntry[], now: Date, sessionDurationMs: number) {
    const endTime = new Date(startTime.getTime() + sessionDurationMs);
    const lastEntry = entries[entries.length - 1];
    const actualEndTime = lastEntry ? new Date(lastEntry.timestamp) : startTime;
    
    // A session is active if we're within the 5-hour window from start time
    const isActive = now < endTime;
    

    const tokenCounts = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0
    };

    // Sum all tokens across entries with cache token correction
    let maxCacheReadTokens = 0;
    let maxCacheCreationTokens = 0;
    for (const entry of entries) {
      const usage = entry.message.usage;
      if (usage) {
        tokenCounts.inputTokens += usage.input_tokens || 0;
        tokenCounts.outputTokens += usage.output_tokens || 0;
        // Cache creation tokens are cumulative - take max
        maxCacheCreationTokens = Math.max(maxCacheCreationTokens, usage.cache_creation_input_tokens || 0);
        // Cache read tokens are cumulative - take max
        maxCacheReadTokens = Math.max(maxCacheReadTokens, usage.cache_read_input_tokens || 0);
      }
    }
    tokenCounts.cacheCreationInputTokens = maxCacheCreationTokens;
    tokenCounts.cacheReadInputTokens = maxCacheReadTokens;

    const totalTokens = this.getTotalTokens(tokenCounts);

    return {
      startTime,
      endTime,
      actualEndTime,
      isActive,
      tokenCounts,
      totalTokens,
      entries
    };
  }

  /**
   * Identify session blocks
   */
  private identifySessionBlocks(entries: ClaudeJSONLEntry[], sessionDurationHours: number = 5) {
    if (entries.length === 0) return [];

    const sessionDurationMs = sessionDurationHours * 60 * 60 * 1000;
    const blocks: any[] = [];
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    let currentBlockStart: Date | null = null;
    let currentBlockEntries: ClaudeJSONLEntry[] = [];
    const now = new Date();

    for (const entry of sortedEntries) {
      const entryTime = new Date(entry.timestamp);

      if (currentBlockStart === null) {
        currentBlockStart = entryTime; // Use actual entry time, not floored
        currentBlockEntries = [entry];
      } else {
        const lastEntry = currentBlockEntries.at(-1);
        
        if (!lastEntry) continue;
        
        const lastEntryTime = new Date(lastEntry.timestamp);
        const timeSinceLastEntry = entryTime.getTime() - lastEntryTime.getTime();
        // Check if we're still within the 5-hour session window from block start
        const timeSinceBlockStart = entryTime.getTime() - currentBlockStart.getTime();
        const sessionGapMs = 30 * 60 * 1000; // 30 minutes gap for micro-sessions
        
        // Only start new block if: gap > 30min AND we're past 5h from block start
        if (timeSinceLastEntry > sessionGapMs && timeSinceBlockStart > sessionDurationMs) {
          
          // Finalize current block (gap detected)
          const block = this.createBlock(currentBlockStart, currentBlockEntries, now, sessionDurationMs);
          blocks.push(block);

          // Start new block
          currentBlockStart = entryTime; // Use actual entry time
          currentBlockEntries = [entry];
        } else {
          currentBlockEntries.push(entry);
        }
      }
    }

    // Handle final block
    if (currentBlockStart !== null && currentBlockEntries.length > 0) {
      const block = this.createBlock(currentBlockStart, currentBlockEntries, now, sessionDurationMs);
      blocks.push(block);
    }

    return blocks;
  }

  /**
   * Load session block data
   */
  private async loadSessionBlockData(): Promise<any[]> {
    const claudePaths = this.getClaudePaths();
    const allEntries: ClaudeJSONLEntry[] = [];
    const processedHashes = new Set<string>();

    for (const claudePath of claudePaths) {
      try {
        const projectsDir = path.join(claudePath, 'projects');
        const pattern = path.join(projectsDir, '**', '*.jsonl');
        const files = await glob(pattern);
        
        for (const file of files) {
          try {
            const content = await readFile(file, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line.trim());
                
                // Only process assistant entries with usage data
                if (data.type !== 'assistant' || !data.message?.usage) {
                  continue;
                }
                
                // Deduplication
                const uniqueHash = this.createUniqueHash(data);
                if (processedHashes.has(uniqueHash)) {
                  continue;
                }
                processedHashes.add(uniqueHash);
                
                allEntries.push(data);
              } catch {
                // Skip invalid JSON lines
                continue;
              }
            }
          } catch {
            // Skip unreadable files
            continue;
          }
        }
      } catch {
        // Skip inaccessible directories
        continue;
      }
    }

    // Create session blocks
    const blocks = this.identifySessionBlocks(allEntries);
    return blocks;
  }

  /**
   * Get current session usage
   */
  async getCurrentUsage(): Promise<SessionUsage | null> {
    try {
      const blocks = await this.loadSessionBlockData();
      
      
      if (blocks.length === 0) {
        return null;
      }

      // Find the MOST RECENT active block (not just the first one)
      const activeBlocks = blocks.filter(block => block.isActive);
      const activeBlock = activeBlocks.length > 0 ? activeBlocks[activeBlocks.length - 1] : null;
      
      if (!activeBlock) {
        return null;
      }
      
      const now = new Date();
      const timeRemaining = activeBlock.endTime > now ? {
        hours: Math.floor((activeBlock.endTime.getTime() - now.getTime()) / (1000 * 60 * 60)),
        minutes: Math.floor(((activeBlock.endTime.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60))
      } : null;


      return {
        inputTokens: activeBlock.tokenCounts.inputTokens,
        outputTokens: activeBlock.tokenCounts.outputTokens,
        totalTokens: activeBlock.totalTokens,
        sessionStart: activeBlock.startTime,
        resetTime: activeBlock.endTime,
        timeRemaining
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Force refresh cache
   */
  refreshCache(): void {
    this.cache.timestamp = 0; // Force next call to reload
  }

  /**
   * Reset cache (pour debug)
   */
  resetCache(): void {
    this.cache.data = null;
    this.cache.timestamp = 0;
  }

  /**
   * Check if Claude data is available - IMPLÉMENTATION NATIVE
   */
  async isAvailable(): Promise<boolean> {
    try {
      const claudePaths = this.getClaudePaths();
      
      for (const claudePath of claudePaths) {
        try {
          const projectsDir = path.join(claudePath, 'projects');
          const pattern = path.join(projectsDir, '**', '*.jsonl');
          const files = await glob(pattern);
          
          if (files.length > 0) {
            return true;
          }
        } catch {
          continue;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
}