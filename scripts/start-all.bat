@echo off
echo === Starting Q-R Application ===
echo.

rem Navigate to parent directory
cd /d "%~dp0\.."

rem Start backend in a new window
echo 🚀 Starting Backend Server...
start cmd /k "cd backend && npm start"

rem Wait a moment for backend to initialize
timeout /t 3 /nobreak > nul

rem Start frontend
echo.
echo 🚀 Starting Frontend...
cd frontend
npm run dev

echo.
echo Frontend stopped. Backend is still running in its window.
echo Close the backend window when finished.
