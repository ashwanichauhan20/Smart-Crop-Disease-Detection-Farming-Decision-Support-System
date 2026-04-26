@echo off
echo ==========================================
echo   Smart Crop - Farming Support System
echo ==========================================

:: 1. Start AI Microservice (Port 5002)
echo Starting AI Service (Port 5002)...
start "AI Service" cmd /k "cd backend && python ai_app.py"

:: 2. Start Main Backend (Port 5001)
echo Starting Main Backend (Port 5001)...
start "Main Backend" cmd /k "cd backend && npm run dev"

:: 3. Start Frontend (Port 5173)
echo Starting Frontend (Port 5173)...
start "Frontend" cmd /k "npm run dev"

echo All services are starting! 
echo Please wait 10 seconds, then refresh your browser.
pause
