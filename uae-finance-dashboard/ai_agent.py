import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
# User needs to KEY in .env as GEMINI_API_KEY
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def categorize_transaction(transaction_string):
    """
    Uses Gemini to categorize a transaction string.
    Expected output format: JSON.
    """
    system_prompt = """
    You are a financial assistant. I will send you a transaction description.
    You must extract the following fields and return them as a valid JSON object:
    - amount: (number)
    - description: (string)
    - category: One of [Food & Drinks, Transport, Entertainment, Items, Service, Fixed Cost, Guilt-Free Spending, Gold Purchase]. Default to "Food & Drinks" or "Items" if they fit, otherwise "Guilt-Free Spending".
    - tag: (string, optional) e.g., #bonus, #gold. If the category is Gold Purchase, ensure tag is #gold.
    
    IMPORTANT: Return ONLY the JSON object. No markdown formatting (like ```json), no explanations.
    
    Example Input: "350 Dinner at Zuma"
    Example Output: {"amount": 350, "description": "Dinner at Zuma", "category": "Guilt-Free Spending", "tag": null}
    """
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(f"{system_prompt}\n\nInput: {transaction_string}")
        
        # Clean up response if it contains markdown code blocks
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        return text.strip()
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        return None
