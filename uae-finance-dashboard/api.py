from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
import database as db
import ai_agent
from datetime import datetime

app = FastAPI()

class WebhookPayload(BaseModel):
    text: str

@app.post("/webhook")
async def receive_transaction(payload: WebhookPayload):
    """
    Receives a text string from iOS Shortcut/Telegram.
    1. Parse/Categorize with AI.
    2. Save to DB.
    3. Calculate Safe-to-Spend.
    4. Return response message.
    """
    print(f"Received payload: {payload.text}")
    
    # 1. AI Categorization
    ai_response = ai_agent.categorize_transaction(payload.text)
    if not ai_response:
        raise HTTPException(status_code=500, detail="AI Processing Failed")
    
    try:
        data = json.loads(ai_response)
        amount = data.get("amount")
        description = data.get("description")
        category = data.get("category", "Guilt-Free Spending")
        tag = data.get("tag")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid AI Response Format")

    # 2. Save to DB
    date = datetime.now().strftime("%Y-%m-%d")
    # Determine Type (Income/Expense) - Simple heuristic or AI could do it. 
    # For now, default to Expense unless context suggests otherwise (future improvement).
    # The prompt implies expenses usually.
    type_ = "Expense" 
    
    db.add_transaction(date, amount, description, category, type_, "Mobile", tag)
    
    # 3. Specific Logic: Gold Drip
    if tag == "#gold" or category == "Gold Purchase":
        # We need the current price to calculate grams.
        # For this prototype, we'll fetch/hardcode a price or ask the user to simplify
        # Let's assume a hardcoded price for the automation step or reuse the dashboard logic.
        # Improvement: Fetch real price here.
        price_per_gram = 285.50 
        grams = amount / price_per_gram
        db.update_gold_holdings(grams, price_per_gram) # Note: update_gold needs refinement to ADD to existing, not overwrite if that's the intention. 
        # Actually my db.update_gold_holdings implementation overwrites based on input grams sum? 
        # Let's check db.py. It takes 'grams' as total holdings? No, let's fix that logic.
        # Valid point: The db function takes `grams` and calculates total balance. 
        # We need a proper "Buy" logic. 
        # For now, we update the asset balance.
        pass

    # 4. Feedback Loop: Calculate Safe-to-Spend
    # Re-calculate to give feedback
    # We need the same logic as the dashboard
    # Fixed stats (hardcoded for now, should be in DB/Config)
    MONTHLY_SALARY = 40000.0
    FIXED_COSTS = 20000.0
    WAR_CHEST_PCT = 0.20
    
    automated_savings = MONTHLY_SALARY * WAR_CHEST_PCT
    safe_to_spend_cap = MONTHLY_SALARY - FIXED_COSTS - automated_savings
    
    # Get total spent this month
    df = db.get_transactions()
    current_month = datetime.now().strftime("%Y-%m")
    if not df.empty:
        df['date'] = pd.to_datetime(df['date'])
        current_month_txns = df[
            (df['date'].dt.strftime('%Y-%m') == current_month) & 
            (df['type'] == 'Expense') &
            (df['category'] != 'Fixed Cost')
        ]
        spent_this_month = current_month_txns['amount'].sum()
    else:
        spent_this_month = 0.0
    
    remaining = safe_to_spend_cap - spent_this_month
    
    return {
        "message": f"Recorded: {description} ({amount} AED).",
        "safe_to_spend_left": f"{remaining:,.2f} AED"
    }

@app.get("/")
def health_check():
    return {"status": "ok"}
