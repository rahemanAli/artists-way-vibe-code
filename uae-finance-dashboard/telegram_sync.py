import requests
import os
import json
import database as db
import ai_agent
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
BASE_URL = f"https://api.telegram.org/bot{TOKEN}"
OFFSET_FILE = "telegram_offset.txt"

def get_last_offset():
    if os.path.exists(OFFSET_FILE):
        with open(OFFSET_FILE, "r") as f:
            try:
                return int(f.read().strip())
            except:
                return 0
    return 0

def set_last_offset(offset):
    with open(OFFSET_FILE, "w") as f:
        f.write(str(offset))

def fetch_and_process_updates():
    """
    Fetches unread messages from Telegram, processes them via AI,
    and saves them to the database.
    Returns a list of processing results strings.
    """
    if not TOKEN:
        return ["❌ Error: Telegram Token not found in .env"]

    offset = get_last_offset()
    
    # 1. Fetch Updates
    try:
        # timeout=0 means short polling just for check
        url = f"{BASE_URL}/getUpdates?offset={offset + 1}&timeout=0"
        response = requests.get(url)
        data = response.json()
    except Exception as e:
        return [f"❌ Connection Error: {e}"]

    if not data.get("ok"):
        return [f"❌ Telegram API Error: {data.get('description')}"]

    updates = data.get("result", [])
    if not updates:
        print("Telegram Sync: No new messages found.")
        return ["✅ No new messages."]

    results = []
    max_update_id = offset

    print(f"Telegram Sync: Found {len(updates)} updates.")

    for update in updates:
        update_id = update["update_id"]
        if update_id > max_update_id:
            max_update_id = update_id
        
        # Check for message text
        if "message" in update and "text" in update["message"]:
            text = update["message"]["text"]
            
            # Skip commands like /start
            if text.startswith("/"):
                continue

            # Process with AI
            ai_resp = ai_agent.categorize_transaction(text)
            
            if ai_resp:
                try:
                    p = json.loads(ai_resp)
                    date = datetime.now().strftime("%Y-%m-%d")
                    db.add_transaction(
                        date, 
                        p.get("amount"), 
                        p.get("description"), 
                        p.get("category", "Guilt-Free Spending"), 
                        "Expense", # Assumption
                        "Telegram", 
                        p.get("tag")
                    )
                    
                    # Gold Drip Logic (reused)
                    if p.get("tag") == "#gold" or p.get("category") == "Gold Purchase":
                         # Simple logic for now, same as API
                         db.update_gold_holdings(0, 285.50) # Update value, manual gram check needed
                         results.append(f"💰 Added Gold: {p.get('description')}")
                    else:
                        results.append(f"✅ Added: {p.get('description')} ({p.get('amount')} AED)")
                        
                except Exception as e:
                    results.append(f"⚠️ Failed to parse: '{text}' ({e})")
            else:
                results.append(f"⚠️ AI Failed on: '{text}'")
        
    set_last_offset(max_update_id)
    return results
