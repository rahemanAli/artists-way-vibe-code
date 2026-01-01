import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("GEMINI_API_KEY")
print(f"Key loaded: {key[:10]}... (Length: {len(key) if key else 0})")

genai.configure(api_key=key)

try:
    print("Attempting to call Gemini...")
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content("Hello")
    print("✅ Success!")
    print(response.text)
except Exception as e:
    print(f"❌ Error: {e}")
