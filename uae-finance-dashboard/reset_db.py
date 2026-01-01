import database
import sqlite3

def reset_database():
    conn = database.get_connection()
    c = conn.cursor()
    
    tables = ['transactions', 'todos', 'accounts', 'sinking_funds', 'net_worth_history']
    
    print("Clearing tables...")
    for table in tables:
        try:
            c.execute(f"DELETE FROM {table}")
            print(f" - {table}: Cleared")
        except sqlite3.OperationalError as e:
            print(f" - {table}: Skipped (might not exist or verify error: {e})")
            
    conn.commit()
    conn.close()
    print("Database reset complete. All data wiped.")

if __name__ == "__main__":
    reset_database()
