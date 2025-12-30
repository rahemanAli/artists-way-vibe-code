#!/bin/bash
echo "Starting local server for Artist's Way PWA..."
echo "Open your browser to: http://localhost:8000"
echo "Press Ctrl+C to stop."
ruby -run -ehttpd . -p8000
