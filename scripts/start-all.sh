#!/bin/bash

# Start both frontend and backend with one command
echo "=== Starting Q-R Application ==="
echo ""

# Navigate to parent directory
cd "$(dirname "$0")/.."

# Start backend in background
echo "🚀 Starting Backend Server..."
cd backend
npm start &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Return to root directory
cd ..

# Start frontend
echo ""
echo "🚀 Starting Frontend..."
cd frontend
npm run dev

# This part only executes when frontend is stopped
echo ""
echo "Frontend stopped. Cleaning up backend process..."
kill $BACKEND_PID
echo "Application shutdown complete."
