@echo off
title Yes I Can - Center Management
echo.
echo  ===================================
echo    Yes I Can - Center Management
echo  ===================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.10+ from https://python.org
    echo         Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo [1/4] Setting up Python virtual environment...
cd backend
if not exist "venv" (
    python -m venv venv
)
call venv\Scripts\activate.bat

echo [2/4] Installing Python dependencies...
pip install -r requirements.txt -q

echo [3/4] Seeding demo data...
python seed.py

echo [4/4] Starting servers...
echo.
echo  =============================================
echo    Backend:  http://localhost:8000
echo    Frontend: http://localhost:5173
echo    API Docs: http://localhost:8000/docs
echo  =============================================
echo.
echo  Demo login: admin / admin123
echo  Press Ctrl+C to stop both servers.
echo.

:: Start backend in a new window
start "YIC Backend" cmd /c "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"

:: Start frontend
cd /d %~dp0frontend
if not exist "node_modules" (
    echo Installing npm dependencies...
    npm install
)
npm run dev
