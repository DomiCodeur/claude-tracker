#!/bin/bash

echo "📦 Installing Claude Usage Tracker..."
echo "===================================="
echo ""

# Make scripts executable
chmod +x run_auto_tracker.sh
chmod +x claude_auto_tracker.py
chmod +x claude-tracker

# Add to PATH (optional)
TRACKER_DIR=$(pwd)
TRACKER_CMD="$TRACKER_DIR/claude-tracker"

echo "✅ Installation complete!"
echo ""
echo "🚀 You can now run the tracker using any of these commands:"
echo ""
echo "   📊 NPM-style commands:"
echo "      npm start"
echo "      npm run tracker"
echo "      npm run monitor"
echo "      npm run usage"
echo ""
echo "   🛠️  Make commands:"
echo "      make start"
echo "      make tracker"
echo "      make monitor" 
echo "      make usage"
echo ""
echo "   🎯 Direct command:"
echo "      ./claude-tracker"
echo ""
echo "   📁 Original method:"
echo "      ./run_auto_tracker.sh"
echo ""

# Optionally add to global PATH
read -p "Do you want to add 'claude-tracker' to your global PATH? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Add to ~/.bashrc
    if ! grep -q "claude-tracker" ~/.bashrc; then
        echo "export PATH=\"$TRACKER_DIR:\$PATH\"" >> ~/.bashrc
        echo "✅ Added to ~/.bashrc"
        echo "🔄 Run 'source ~/.bashrc' or restart your terminal"
        echo "   Then you can use 'claude-tracker' from anywhere!"
    else
        echo "ℹ️  Already in PATH"
    fi
fi

echo ""
echo "🎉 Ready to track your Claude usage!"