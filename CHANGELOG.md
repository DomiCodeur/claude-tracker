# Changelog

## [1.0.0] - 2025-07-21

### 🎉 Initial Release

Complete rewrite from bash scripts to modern Node.js/TypeScript application.

### ✨ New Features

- **Cross-platform support** - Works on Windows, macOS, and Linux
- **npm installation** - `npm install -g claude-tracker`
- **Modern TypeScript architecture** with full type safety
- **Multiple commands**:
  - `claude-track` (or `ctrack`) - Live monitoring (default)
  - `claude-track status` - One-time status check
  - `claude-track check` - Installation verification
- **Advanced CLI** with Commander.js and proper help system
- **Color-coded progress bars** with smooth gradients
- **Optimized file parsing** with better error handling
- **Real-time updates** with configurable intervals
- **Professional packaging** ready for npm registry

### 🔧 Improvements over bash version

- **Reliability**: Better error handling and edge case management
- **Performance**: Optimized file reading and parsing
- **User Experience**: Clean CLI interface with help and validation
- **Maintenance**: Modern codebase with TypeScript and proper project structure
- **Distribution**: Easy installation via npm instead of manual setup
- **Cross-platform**: No more bash/Linux dependencies

### 📦 Technical Stack

- **Language**: TypeScript 5.5+
- **Runtime**: Node.js 18+
- **CLI Framework**: Commander.js
- **Terminal Colors**: Chalk
- **File Operations**: Native Node.js + glob
- **Build System**: TypeScript compiler

### 🚀 Installation

```bash
# Global installation
npm install -g claude-tracker

# Quick try
npx claude-tracker
```

### 📱 Usage

```bash
# Live monitoring (default)
claude-track

# Status check
claude-track status

# Installation check  
claude-track check
```