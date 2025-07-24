/**
 * Claude Tracker
 * Real-time monitoring with terminal UI
 */

import { DataService } from './services/dataService.js';
import { DisplayService } from './services/displayService.js';
import { TrackerConfig, ProgressDisplay } from './types.js';

export class LiveTracker {
  private dataService: DataService;
  private displayService: DisplayService;
  private config: TrackerConfig;
  private isRunning: boolean = false;

  constructor(config: TrackerConfig = {
    sessionLimit: 70000,
    sessionHours: 5,
    updateInterval: 3000
  }) {
    this.config = config;
    this.dataService = new DataService();
    this.displayService = new DisplayService(config.sessionLimit);
  }

  /**
   * Create display data for current usage
   */
  private async createProgressDisplay(): Promise<ProgressDisplay | null> {
    const usage = await this.dataService.getCurrentUsage();
    
    if (!usage) {
      return null;
    }

    return this.displayService.createProgressDisplay(usage.totalTokens, usage.timeRemaining);
  }

  /**
   * Display the current usage in a single line
   */
  private async displayUsage(): Promise<void> {
    const display = await this.createProgressDisplay();
    
    if (!display) {
      this.displayService.displayWaiting();
      return;
    }

    this.displayService.displayUsage(display);
  }

  /**
   * Start the live tracking
   */
  async start(): Promise<void> {
    this.isRunning = true;

    // Check if Claude data is available
    if (!(await this.dataService.isAvailable())) {
      this.displayService.displayError('No Claude Code session found');
      this.displayService.displayInfo('Make sure Claude Code CLI is installed and you have used it recently.');
      process.exit(1);
    }

    this.displayService.displayInfo('Monitoring Claude Code tokens in real-time...');
    this.displayService.newLine();

    // Initial display
    await this.displayUsage();

    // Set up interval for updates
    const interval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }
      
      await this.displayUsage();
    }, this.config.updateInterval);

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      this.stop();
      clearInterval(interval);
      this.displayService.newLine();
      this.displayService.displayInfo('Stopped');
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
  async snapshot(): Promise<ProgressDisplay | null> {
    return await this.createProgressDisplay();
  }

  /**
   * Check if Claude data is available
   */
  async isDataAvailable(): Promise<boolean> {
    return await this.dataService.isAvailable();
  }

  /**
   * Force refresh data cache
   */
  refreshData(): void {
    this.dataService.refreshCache();
  }

  /**
   * Reset cache (pour debug des pourcentages erratiques)
   */
  resetCache(): void {
    this.dataService.resetCache();
    this.displayService.displayInfo('Cache reset - percentages should stabilize');
  }
}