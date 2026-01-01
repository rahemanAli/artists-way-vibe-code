from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("OPENAI_API_KEY")
print(f"Key loaded: {key[:10]}...{key[-5:] if key else 'None'}")

if not key:
    print("❌ Error: No API Key found.")
    exit(1)

client = OpenAI(api_key=key)

try:
    print("Attempting to call OpenAI...")
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Hello"}],
    )
    print("✅ Success!")
    print(response.choices[0].message.content)
except Exception as e:
    print(f"❌ Error: {e}")
