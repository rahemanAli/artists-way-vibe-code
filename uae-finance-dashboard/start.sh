#!/bin/bash
cd "$(dirname "$0")"

echo "📂 Working Directory: $(pwd)"

# Explicitly source venv if possible, or verify it exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "⚠️ venv not found! Attempting creation..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip -q
    ./venv/bin/pip install -r requirements.txt -q
fi

echo "🚀 Starting Backend (Uvicorn)..."
./venv/bin/uvicorn api:app --reload --port 8000 &
API_PID=$!

echo "📊 Starting Frontend (Streamlit)..."
./venv/bin/streamlit run dashboard.py --server.port 8501 --server.headless true &
STREAMLIT_PID=$!

cleanup() {
    echo "Shutting down..."
    kill $API_PID
    kill $STREAMLIT_PID
    exit
}
trap cleanup SIGINT SIGTERM

echo "✅ Services Started!"
echo "   - API: http://localhost:8000"
echo "   - Dashboard: http://localhost:8501"
echo "ℹ️  Do NOT close this window while using the app."

# Keep alive
wait
