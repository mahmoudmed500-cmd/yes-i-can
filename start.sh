#!/usr/bin/env bash
set -e

echo ""
echo "  ==================================="
echo "    Yes I Can - Center Management"
echo "  ==================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 not found. Install from https://python.org"
    exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found. Install from https://nodejs.org"
    exit 1
fi

echo "[1/4] Setting up Python virtual environment..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

echo "[2/4] Installing Python dependencies..."
pip install -r requirements.txt -q

echo "[3/4] Seeding demo data..."
python seed.py

echo "[4/4] Starting servers..."
echo ""
echo "  ============================================="
echo "    Backend:  http://localhost:8000"
echo "    Frontend: http://localhost:5173"
echo "    API Docs: http://localhost:8000/docs"
echo "  ============================================="
echo ""
echo "  Demo login: admin / admin123"
echo "  Press Ctrl+C to stop both servers."
echo ""

# Start backend in background
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi
npm run dev

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null
