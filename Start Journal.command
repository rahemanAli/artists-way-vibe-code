#!/bin/bash
# Enable debug mode
set -e

# Get the directory where this script is located
# This ensures it works no matter where the folder is, as long as the script is inside the project
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "----------------------------------------"
echo "   Launching The Artist's Way (Local)"
echo "----------------------------------------"
echo "Project Folder: $DIR"

# Check if Ruby is available
if ! command -v ruby &> /dev/null; then
    echo "Error: Ruby is not installed."
    exit 1
fi

# Check if Port 8000 is already busy
if lsof -i :8000 > /dev/null; then
    echo "✅ Server is already running on Port 8000."
else
    echo "🚀 Starting Local Server..."
    ruby -run -ehttpd . -p8000 &
    SERVER_PID=$!
    sleep 2
    if ps -p $SERVER_PID > /dev/null; then
        echo "✅ Server started (PID: $SERVER_PID)."
    else
        echo "❌ Server failed to start."
        exit 1
    fi
fi

# Open Browser
echo "🌐 Opening App..."
open "http://localhost:8000"

# Keep terminal open for a few seconds to see any errors
echo "Done! You can close this window."
# sleep 5
