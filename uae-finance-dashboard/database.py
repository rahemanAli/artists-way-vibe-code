import sqlite3
import pandas as pd
from datetime import datetime

DB_NAME = "finance.db"

def get_connection():
    return sqlite3.connect(DB_NAME)

def init_db():
    conn = get_connection()
    c = conn.cursor()
    
    # Transactions Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT NOT NULL,
            category TEXT,
            type TEXT NOT NULL, -- Income or Expense
            source TEXT, -- Bank or Cash
            tag TEXT -- e.g., #bonus, #gold
        )
    ''')
    
    # Accounts Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL, -- Liquid, Real Estate Asset, Gold Holdings, Liability/Mortgage
            balance REAL NOT NULL DEFAULT 0.0
        )
    ''')
    
    # Sinking Funds Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS sinking_funds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL NOT NULL DEFAULT 0.0,
            target_date TEXT,
            monthly_contribution REAL
        )
    ''')
    
    # Net Worth History Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS net_worth_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            total_assets REAL NOT NULL,
            total_liabilities REAL NOT NULL,
            net_worth REAL NOT NULL
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task TEXT NOT NULL,
            status TEXT DEFAULT 'Pending'
        )
    ''')
    conn.commit()
    conn.close()

def add_todo(task):
    conn = get_connection()
    c = conn.cursor()
    c.execute("INSERT INTO todos (task) VALUES (?)", (task,))
    conn.commit()
    conn.close()

def get_todos():
    conn = get_connection()
    df = pd.read_sql_query("SELECT * FROM todos", conn)
    conn.close()
    return df

def delete_todo(t_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM todos WHERE id=?", (t_id,))
    conn.commit()
    conn.close()

def update_todo_status(t_id, status):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE todos SET status=? WHERE id=?", (status, t_id))
    conn.commit()
    conn.close()

def add_transaction(date, amount, description, category, type, source, tag=None):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO transactions (date, amount, description, category, type, source, tag)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (date, amount, description, category, type, source, tag))
    conn.commit()
    conn.close()

def update_transaction(t_id, date, amount, description, category, type, source, tag=None):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        UPDATE transactions 
        SET date=?, amount=?, description=?, category=?, type=?, source=?, tag=?
        WHERE id=?
    ''', (date, amount, description, category, type, source, tag, t_id))
    conn.commit()
    conn.close()

def delete_transaction(t_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('DELETE FROM transactions WHERE id=?', (t_id,))
    conn.commit()
    conn.close()

def get_transactions():
    conn = get_connection()
    df = pd.read_sql_query("SELECT * FROM transactions ORDER BY date DESC", conn)
    conn.close()
    return df

def update_gold_holdings(grams_to_add, price_per_gram):
    """
    Updates the gold holdings. 
    If grams_to_add is provided, it increments the current holding.
    It always updates the balance value based on total grams * current price.
    """
    conn = get_connection()
    c = conn.cursor()
    
    # Check if Gold Holdings account exists
    c.execute("SELECT id, balance FROM accounts WHERE name = 'Gold Holdings'")
    result = c.fetchone()
    
    if result:
        # We need to store grams somewhere. 
        # For this simple schema, let's assume valid 'balance' implies Value.
        # But we need to track Quantity (Grams) separately to be accurate when price changes.
        # Limitations of current schema: 'balance' is the only float field.
        # Hack solution for this prototype: Store Grams in the 'balance' field of a separate "shadow" account or
        # Better: Add a 'metadata' column? No, user didn't ask for schema change.
        # Let's use a specific convention: Account "Gold Holdings (Grams)" stores quantity.
        # Account "Gold Holdings (Value)" stores fiat value.
        
        # ACTUALLY, let's just stick to tracking Value for Net Worth, but to specificy 'Gold Drip',
        # we need to know how many grams we have.
        # Let's create a dedicated table for Assets if not simple.
        # OR: Just use the 'description' or a specialized table?
        # Let's proceed with finding the Grams account.
        
        c.execute("SELECT balance FROM accounts WHERE name = 'Gold Grams'")
        grams_res = c.fetchone()
        current_grams = grams_res[0] if grams_res else 0.0
        
        new_grams = current_grams + grams_to_add
        new_value = new_grams * price_per_gram
        
        # Update Grams
        if grams_res:
             c.execute("UPDATE accounts SET balance = ? WHERE name = 'Gold Grams'", (new_grams,))
        else:
             c.execute("INSERT INTO accounts (name, type, balance) VALUES ('Gold Grams', 'Asset Quantity', ?)", (new_grams,))
             
        # Update Value (Net Worth Tracker)
        c.execute("UPDATE accounts SET balance = ? WHERE name = 'Gold Holdings'", (new_value,))
        
    else:
        # First time init
        new_grams = grams_to_add
        new_value = new_grams * price_per_gram
        c.execute("INSERT INTO accounts (name, type, balance) VALUES ('Gold Grams', 'Asset Quantity', ?)", (new_grams,))
        c.execute("INSERT INTO accounts (name, type, balance) VALUES ('Gold Holdings', 'Gold Holdings', ?)", (new_value,))
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
