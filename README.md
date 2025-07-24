# Claude Tracker

**Minimalist real-time monitoring of your Claude Code session usage**

Unlike other tools that provide static reports, this tracker gives you **continuous real-time monitoring** of your token usage as you work with Claude Code.

## Features

- **Live monitoring** - Updates every 3 seconds by default
- **Accurate tracking** - Reads actual session data from Claude Code files
- **Session reset timer** - Shows exactly when your 5-hour window resets
- **Cross-platform** - Works on Windows, macOS, and Linux
- **Easy installation** - Install via npm
- **Minimal interface** - Clean, single-line display, no colors, no emojis

## Installation

### Global Installation (Recommended)
```bash
npm install -g claude-tracker
```

### Quick Try (No Installation)
```bash
npx claude-tracker
```

## Requirements

- Node.js 18+ 
- Claude Code CLI installed and configured
- Claude Code Pro account (70,000 tokens per 5-hour session)

## Usage

### Live Monitoring (Default)
```bash
claude-track
# or
ctrack
```

**Example Output:**
```
[███████████████░░░░░░░░░░] 44,184/70,000 (63%) | Reset in 2h 37min
```

### Commands

#### Start Live Monitoring
```bash
claude-track live           # Default 3-second updates
claude-track live -i 5      # Update every 5 seconds
claude-track live -l 50000  # Custom token limit
```

#### One-Time Status Check
```bash
claude-track status
```

#### Installation Check
```bash
claude-track check
```

#### Fix Erratic Percentage Display
```bash
claude-track reset
```
**Use this if percentages jump unexpectedly (e.g., from 70% to 25%)**

### Options

- `-i, --interval <seconds>` - Update interval (default: 3 seconds)
- `-l, --limit <tokens>` - Session token limit (default: 70,000)
- `--help` - Show help information
- `--version` - Show version

## Display Elements

The live tracker shows:
- **Progress bar** (30 characters)
- **Current usage** / **Total limit** (formatted with commas)
- **Percentage** of session used
- **Reset timer** showing hours and minutes remaining

Simple, clean display with no colors or emojis.

## How It Works

1. **Finds your Claude Code session files** in `~/.claude/projects/`
2. **Parses session JSONL files** to extract token usage data
3. **Calculates session metrics** including start time and reset timer
4. **Updates the display** in real-time as you use Claude Code

## Cross-Platform Support

This tool works on:
- **Windows** (with Node.js)
- **macOS** (Intel & Apple Silicon)
- **Linux** (all distributions)

## Development

```bash
# Clone the repository
git clone https://github.com/DomiCodeur/claude-tracker.git
cd claude-tracker

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run locally
npm start
```

### Scripts
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode for development
- `npm start` - Run the built CLI

## Troubleshooting

### "No Claude Code session found"
- Ensure Claude Code CLI is installed: `claude --version`
- Use Claude Code at least once to create session files
- Check if `~/.claude/projects/` directory exists

### Permission errors
- Make sure you have read access to `~/.claude/` directory
- On Windows, ensure the terminal has appropriate permissions

### High CPU usage
- Increase update interval: `claude-track -i 10` (10 seconds)
- Default 3-second interval is usually fine for most systems

### Erratic percentage display (jumping from 70% to 25%)
- **Root cause**: Complex session detection logic creating inconsistent calculations
- **Quick fix**: Run `claude-track reset` to clear internal session locks
- **Prevention**: The stabilized algorithm now locks session boundaries to prevent recalculation jumps
- **Technical details**: Issue was caused by dual detection logic (recent activity vs 5-hour window) combined with cache refresh cycles

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the Claude Code community