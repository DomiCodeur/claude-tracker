#!/bin/bash

cd "$(dirname "$0")/.."

echo "🤖 Claude Auto Usage Tracker"
echo "============================="
echo ""
echo "Starting automatic Claude usage monitoring..."
echo "This will track your Claude CLI usage in real-time."
echo ""

# Check if virtual environment exists
if [ ! -d "python-version/claude_env" ]; then
    echo "❌ Virtual environment not found. Please run the manual setup first."
    exit 1
fi

# Activate virtual environment
source python-version/claude_env/bin/activate

# Check if required packages are installed
python -c "import anthropic, litellm, colorama, watchdog" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Required packages not found. Please run the manual setup first."
    exit 1
fi

echo "✅ Environment ready"
echo ""
echo "📡 Starting auto tracker..."
echo "   - This tracker will automatically detect Claude CLI usage"
echo "   - Open another terminal and use Claude CLI normally"
echo "   - Watch this screen for real-time token usage"
echo "   - Press Ctrl+C to stop"
echo ""

# Run the tracker
python python-version/claude-with-progress.py