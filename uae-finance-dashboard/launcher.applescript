tell application "Terminal"
    activate
    do script "/Users/mac/Documents/Gravity/uae-finance-dashboard/start.sh"
    
    -- Wait and open browser (script handles server start)
    delay 5
    do shell script "open http://localhost:8501"
end tell
