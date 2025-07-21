/**
 * Claude Tracker
 * Real-time monitoring with terminal UI
 */

import { ClaudeReader } from './claudeReader.js';
import { TrackerConfig, ProgressDisplay } from './types.js';
import { spawn } from 'child_process';

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
      process.stdout.write('\r\x1b[33mWaiting for Claude session...\x1b[0m');
      return;
    }

    const line = [
      `[${display.progressBar}]`,
      `${display.tokensUsed}/${display.tokenLimit}`,
      `(${display.percentage}%)`,
      `| ${display.resetInfo}`
    ].join(' ');

    process.stdout.write('\r\x1b[K' + line);
  }

  /**
   * Start the live tracking
   */
  start(): void {
    this.isRunning = true;

    // Launch Claude Code in a new terminal
    this.launchClaudeInNewTerminal();

    console.log('Claude Code launched in new terminal');
    console.log('Monitoring tokens in real-time...\n');

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
   * Launch Claude Code in a new terminal window
   */
  private launchClaudeInNewTerminal(): void {
    try {
      // Try different terminal commands based on desktop environment
      const terminals = [
        'gnome-terminal --tab -- claude',  // GNOME with tab
        'gnome-terminal --maximize -- claude',  // GNOME maximized
        'konsole --new-tab -e claude',     // KDE with tab
        'konsole -e claude',               // KDE
        'xfce4-terminal --tab -e claude',  // XFCE with tab
        'xfce4-terminal -e claude',        // XFCE
        'tilix -e claude',                 // Tilix
        'terminator -e claude',            // Terminator
        'xterm -e claude',                // fallback
        'x-terminal-emulator -e claude'   // generic
      ];
      
      for (const cmd of terminals) {
        try {
          const [terminal, ...args] = cmd.split(' ');
          spawn(terminal, args, { detached: true, stdio: 'ignore' });
          break;
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      console.log('Could not launch new terminal. Run "claude" in another terminal manually.');
    }
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