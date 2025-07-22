#!/bin/bash

cd "$(dirname "$0")/.."

echo "🤖 Claude Tracker (Node.js Version)"
echo "===================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed. Running npm install..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check if dist exists
if [ ! -d "dist" ]; then
    echo "📦 Building TypeScript..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed"
        exit 1
    fi
fi

echo "✅ Starting Node.js tracker..."
echo ""

# Run the tracker
npm start