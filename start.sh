#!/bin/bash
echo "Starting AI Trading Analysis Server..."
echo "Server will be available at http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo ""

# Kill any existing node processes
pkill -f "node server.js" 2>/dev/null

# Start the server
node server.js