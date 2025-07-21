/**
 * Claude Tracker
 * Real-time monitoring with terminal UI
 */

import { ClaudeReader } from './claudeReader.js';
import { TrackerConfig, ProgressDisplay } from './types.js';

export class LiveTracker {
  private reader: ClaudeReader;
  private config: TrackerConfig;
  private isRunning: boolean = false;

  constructor(config: TrackerConfig = {
    sessionLimit: 70000,
    sessionHours: 5,
    updateInterval: 3000
  }) {
    this.reader = new ClaudeReader();
    this.config = config;
  }

  /**
   * Create a visual progress bar
   */
  private createProgressBar(percentage: number, width: number = 30): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    const filledBar = '█'.repeat(Math.max(0, filled));
    const emptyBar = '░'.repeat(Math.max(0, empty));
    
    return filledBar + emptyBar;
  }

  /**
   * Format numbers with commas for readability
   */
  private formatNumber(num: number): string {
    return num.toLocaleString();
  }

  /**
   * Create display data for current usage
   */
  private createProgressDisplay(): ProgressDisplay | null {
    const usage = this.reader.getCurrentUsage();
    
    if (!usage) {
      return null;
    }

    const percentage = Math.round((usage.totalTokens / this.config.sessionLimit) * 100);
    const progressBar = this.createProgressBar(percentage);
    
    let resetInfo = 'Reset available';
    if (usage.timeRemaining) {
      resetInfo = `Reset in ${usage.timeRemaining.hours}h ${usage.timeRemaining.minutes}min`;
    }

    return {
      percentage,
      progressBar,
      tokensUsed: this.formatNumber(usage.totalTokens),
      tokenLimit: this.formatNumber(this.config.sessionLimit),
      resetInfo
    };
  }


  /**
   * Clear the terminal and move cursor to top
   */
  private clearScreen(): void {
    process.stdout.write('\x1b[H\x1b[2J');
  }

  /**
   * Display the current usage in a single line
   */
  private displayUsage(): void {
    const display = this.createProgressDisplay();
    
    if (!display) {
      process.stdout.write('\rNo session found');
      return;
    }

    const line = [
      `[${display.progressBar}]`,
      `${display.tokensUsed}/${display.tokenLimit}`,
      `(${display.percentage}%)`,
      `| ${display.resetInfo}`
    ].join(' ');

    process.stdout.write('\r' + line);
  }

  /**
   * Start the live tracking
   */
  start(): void {
    this.isRunning = true;

    // Initial display
    this.displayUsage();

    // Set up interval for updates
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }
      
      this.displayUsage();
    }, this.config.updateInterval);

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      this.stop();
      clearInterval(interval);
      console.log('\nStopped');
      process.exit(0);
    });
  }

  /**
   * Stop the live tracking
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Get a single snapshot of current usage
   */
  snapshot(): ProgressDisplay | null {
    return this.createProgressDisplay();
  }
}