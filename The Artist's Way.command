#!/bin/bash
# Navigate to project directory (Dynamic path based on where script is located, 
# but hardcoding is safer if moved to Desktop. Let's assume user moves it.)
# Actually, if they move it to Desktop, we need the valid absolute path.
cd /Users/mac/Documents/Gravity

# Try to start the server in the background
# If port 8000 is already in use, this will fail harmlessly
ruby -run -ehttpd . -p8000 &

# Wait a moment for server to start (if it wasn't running)
sleep 1

# Open the app in the default browser
open http://localhost:8000
