#!/usr/bin/env node

/**
 * Claude Tracker CLI
 */

import { Command } from 'commander';
import { LiveTracker } from './tracker.js';
import { DataService } from './services/dataService.js';
import { DisplayService } from './services/displayService.js';

const program = new Command();

program
  .name('claude-track')
  .description('Real-time monitoring of Claude Code session usage')
  .version('1.0.1');

program
  .command('live', { isDefault: true })
  .description('Start live monitoring (default command)')
  .option('-i, --interval <seconds>', 'Update interval in seconds', '3')
  .option('-l, --limit <tokens>', 'Session token limit', '70000')
  .action(async (options) => {
    const interval = parseInt(options.interval) * 1000;
    const limit = parseInt(options.limit);
    
    if (interval < 1000) {
      console.log('Error: Interval must be at least 1 second');
      process.exit(1);
    }
    
    const tracker = new LiveTracker({
      sessionLimit: limit,
      sessionHours: 5,
      updateInterval: interval
    });
    
    await tracker.start();
  });

program
  .command('status')
  .description('Show current session status (one-time)')
  .action(async () => {
    const tracker = new LiveTracker();
    const displayService = new DisplayService();
    
    if (!(await tracker.isDataAvailable())) {
      displayService.displayError('No Claude Code session found');
      displayService.displayInfo('Make sure Claude Code CLI is installed and you have used it recently.');
      process.exit(1);
    }
    
    const display = await tracker.snapshot();
    if (!display) {
      displayService.displayError('Unable to read session data');
      process.exit(1);
    }
    
    displayService.newLine();
    console.log(`Progress: [${display.progressBar}] ${display.percentage}%`);
    console.log(`Tokens:   ${display.tokensUsed}/${display.tokenLimit}`);
    console.log(`Reset:    ${display.resetInfo}`);
    displayService.newLine();
  });

program
  .command('check')
  .description('Check if Claude Code session files are accessible')
  .action(async () => {
    const dataService = new DataService();
    const displayService = new DisplayService();
    
    displayService.displayInfo('Checking Claude Code installation...');
    displayService.newLine();
    
    if (!(await dataService.isAvailable())) {
      displayService.displayError('No Claude Code session files found');
      console.log('Expected locations:');
      console.log('  - ~/.claude/projects/');
      console.log('  - ~/.config/claude/projects/');
      console.log('  - $CLAUDE_CONFIG_DIR/projects/');
      displayService.newLine();
      console.log('Make sure:');
      console.log('  1. Claude Code CLI is installed');
      console.log('  2. You have used Claude Code at least once');
      process.exit(1);
    }
    
    displayService.displaySuccess('Claude Code session files found');
    
    const usage = await dataService.getCurrentUsage();
    if (usage) {
      displayService.displaySuccess('Session data readable');
      console.log(`Session started: ${usage.sessionStart.toLocaleString()}`);
      console.log(`Total tokens: ${usage.totalTokens.toLocaleString()}`);
      if (usage.timeRemaining) {
        console.log(`Reset time: ${usage.timeRemaining.hours}h ${usage.timeRemaining.minutes}min remaining`);
      }
    } else {
      displayService.displayError('Warning: Session files found but data not readable');
    }
    
    displayService.newLine();
    displayService.displaySuccess('Ready to track');
    console.log('Run "claude-track" or "ctrack" to start live monitoring');
  });

program
  .command('reset')
  .description('Reset session locks (fix erratic percentage display)')
  .action(() => {
    const tracker = new LiveTracker();
    const displayService = new DisplayService();
    
    displayService.displayInfo('Resetting cache...');
    tracker.resetCache();
    displayService.newLine();
    displayService.displaySuccess('Cache reset successfully');
    displayService.displayInfo('Percentage calculations should now be more stable');
    displayService.displayInfo('Run "claude-track status" to verify the fix');
  });

// Handle unknown commands
program.on('command:*', (operands) => {
  console.log(`Unknown command: ${operands[0]}`);
  console.log('Run "claude-track --help" for available commands');
  process.exit(1);
});


program.parse();