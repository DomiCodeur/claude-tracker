/**
 * Display Service
 * Handles all display formatting and terminal output
 */

import { ProgressDisplay } from '../types.js';

export class DisplayService {
  private config: {
    progressBarWidth: number;
    sessionLimit: number;
  };

  constructor(sessionLimit: number = 70000, progressBarWidth: number = 30) {
    this.config = {
      sessionLimit,
      progressBarWidth
    };
  }

  /**
   * Create a visual progress bar
   */
  private createProgressBar(percentage: number): string {
    const width = this.config.progressBarWidth;
    
    // Cap percentage at 100% for display purposes
    const cappedPercentage = Math.min(percentage, 100);
    
    const filled = Math.round((cappedPercentage / 100) * width);
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
   * Format time remaining display
   */
  private formatTimeRemaining(timeRemaining: {hours: number; minutes: number} | null): string {
    if (!timeRemaining) {
      return 'Can reset now';
    }
    
    return `Reset in ${timeRemaining.hours}h ${timeRemaining.minutes}min`;
  }

  /**
   * Create complete progress display data
   */
  createProgressDisplay(totalTokens: number, timeRemaining: {hours: number; minutes: number} | null): ProgressDisplay {
    const percentage = Math.round((totalTokens / this.config.sessionLimit) * 100);
    const progressBar = this.createProgressBar(percentage);
    const resetInfo = this.formatTimeRemaining(timeRemaining);

    return {
      percentage,
      progressBar,
      tokensUsed: this.formatNumber(totalTokens),
      tokenLimit: this.formatNumber(this.config.sessionLimit),
      resetInfo
    };
  }

  /**
   * Display usage in terminal (single line update)
   */
  displayUsage(display: ProgressDisplay): void {
    const line = [
      `[${display.progressBar}]`,
      `${display.tokensUsed}/${display.tokenLimit}`,
      `(${display.percentage}%)`,
      `| ${display.resetInfo}`
    ].join(' ');

    process.stdout.write('\r\x1b[K' + line);
  }

  /**
   * Display waiting message
   */
  displayWaiting(): void {
    process.stdout.write('\r\x1b[33mWaiting for Claude session...\x1b[0m');
  }

  /**
   * Display error message
   */
  displayError(message: string): void {
    console.log(`\n\x1b[31mError: ${message}\x1b[0m`);
  }

  /**
   * Display info message
   */
  displayInfo(message: string): void {
    console.log(`\x1b[36m${message}\x1b[0m`);
  }

  /**
   * Display success message
   */
  displaySuccess(message: string): void {
    console.log(`\x1b[32m${message}\x1b[0m`);
  }

  /**
   * Clear current line
   */
  clearLine(): void {
    process.stdout.write('\r\x1b[K');
  }

  /**
   * Clear screen and move cursor to top
   */
  clearScreen(): void {
    process.stdout.write('\x1b[H\x1b[2J');
  }

  /**
   * Print new line
   */
  newLine(): void {
    console.log();
  }

  /**
   * Update session limit
   */
  setSessionLimit(limit: number): void {
    this.config.sessionLimit = limit;
  }

  /**
   * Get current session limit
   */
  getSessionLimit(): number {
    return this.config.sessionLimit;
  }

  /**
   * Set progress bar width
   */
  setProgressBarWidth(width: number): void {
    this.config.progressBarWidth = Math.max(10, Math.min(50, width)); // Constrain between 10-50
  }

  /**
   * Get current progress bar width
   */
  getProgressBarWidth(): number {
    return this.config.progressBarWidth;
  }
}