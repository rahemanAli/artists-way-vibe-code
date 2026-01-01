tell application "Terminal"
    if not (exists window 1) then reopen
    activate
    do script "cd '/Users/mac/Documents/Gravity/uae-finance-dashboard'; ./start.sh"
    
    -- Wait for server to boot
    delay 5
    
    -- Force open the browser
    do shell script "open http://localhost:8501"
end tell
