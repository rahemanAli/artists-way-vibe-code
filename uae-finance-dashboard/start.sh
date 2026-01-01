#!/bin/bash
cd "$(dirname "$0")"

# Activate venv
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip -q
fi

echo "Installing/Checking dependencies..."
./venv/bin/pip install -r requirements.txt -q

echo "Starting Mobile API (background)..."
./venv/bin/uvicorn api:app --reload --port 8000 &
API_PID=$!

# Cleanup function to kill API when script exits
cleanup() {
    echo "Stopping API..."
    kill $API_PID
    exit
}
trap cleanup SIGINT SIGTERM

echo "Starting Dashboard..."
./venv/bin/streamlit run dashboard.py
