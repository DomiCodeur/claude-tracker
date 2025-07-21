#!/usr/bin/env node

/**
 * Claude Tracker CLI
 */

import { Command } from 'commander';
import { LiveTracker } from './tracker.js';
import { ClaudeReader } from './claudeReader.js';

const program = new Command();

program
  .name('claude-track')
  .description('Real-time monitoring of Claude Code session usage')
  .version('1.0.0');

program
  .command('live', { isDefault: true })
  .description('Start live monitoring (default command)')
  .option('-i, --interval <seconds>', 'Update interval in seconds', '3')
  .option('-l, --limit <tokens>', 'Session token limit', '70000')
  .action((options) => {
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
    
    tracker.start();
  });

program
  .command('status')
  .description('Show current session status (one-time)')
  .action(() => {
    const tracker = new LiveTracker();
    const display = tracker.snapshot();
    
    if (!display) {
      console.log('No Claude Code session found');
      console.log('Make sure Claude Code CLI is installed and you have used it recently.');
      process.exit(1);
    }
    
    console.log(`\nProgress: [${display.progressBar}] ${display.percentage}%`);
    console.log(`Tokens:   ${display.tokensUsed}/${display.tokenLimit}`);
    console.log(`Reset:    ${display.resetInfo}\n`);
  });

program
  .command('check')
  .description('Check if Claude Code session files are accessible')
  .action(() => {
    console.log('Checking Claude Code installation...\n');
    
    const reader = new ClaudeReader();
    const sessionFile = reader.findLatestSessionFile();
    
    if (!sessionFile) {
      console.log('No Claude Code session files found');
      console.log('Expected location: ~/.claude/projects/');
      console.log('Make sure:');
      console.log('  1. Claude Code CLI is installed');
      console.log('  2. You have used Claude Code at least once');
      process.exit(1);
    }
    
    console.log('Claude Code session files found');
    console.log(`Latest session: ${sessionFile}`);
    
    const usage = reader.getCurrentUsage();
    if (usage) {
      console.log('Session data readable');
      console.log(`Session started: ${usage.sessionStart.toLocaleString()}`);
      console.log(`Total tokens: ${usage.totalTokens.toLocaleString()}`);
    } else {
      console.log('Warning: Session file found but data not readable');
    }
    
    console.log('\nReady to track');
    console.log('Run "claude-track" or "ctrack" to start live monitoring');
  });

// Handle unknown commands
program.on('command:*', (operands) => {
  console.log(`Unknown command: ${operands[0]}`);
  console.log('Run "claude-track --help" for available commands');
  process.exit(1);
});


program.parse();