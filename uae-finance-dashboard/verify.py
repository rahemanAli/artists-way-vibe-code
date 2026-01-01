import database as db
import pandas as pd
from datetime import datetime
import os

# 1. Initialize DB
print("--- Initializing DB ---")
db.init_db()
print("DB Initialized.")

# 2. Test Transaction Add
print("\n--- Testing Transaction Add ---")
db.add_transaction(
    date=datetime.now().strftime("%Y-%m-%d"),
    amount=500,
    description="Test Dinner",
    category="Guilt-Free Spending",
    type="Expense",
    source="Test",
    tag="#test"
)
df = db.get_transactions()
print(f"Transactions Count: {len(df)}")
print(df.head(1).to_string())

# 3. Test Gold Update
print("\n--- Testing Gold Drip ---")
# Add 10 grams at 300 AED/g
db.update_gold_holdings(10, 300)
conn = db.get_connection()
gold_grams = pd.read_sql_query("SELECT balance FROM accounts WHERE name='Gold Grams'", conn).iloc[0]['balance']
gold_val = pd.read_sql_query("SELECT balance FROM accounts WHERE name='Gold Holdings'", conn).iloc[0]['balance']
conn.close()
print(f"Gold Grams: {gold_grams} (Expected ~10)")
print(f"Gold Value: {gold_val} (Expected ~3000)")

# 4. Test Bonus Splitter Logic (Pure Python, logic check)
print("\n--- Testing Bonus Logic ---")
bonus = 10000
save = bonus * 0.90
fun = bonus * 0.10
print(f"Bonus: {bonus} -> Save: {save}, Fun: {fun}")

print("\n--- Verification Complete ---")
