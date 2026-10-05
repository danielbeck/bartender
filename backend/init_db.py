import sqlite3
import os
try:
    from backend.bar_storage import ensure_bar_table
except ImportError:
    from bar_storage import ensure_bar_table

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, 'database')
DB_PATH = os.path.join(DB_DIR, 'app.db')

def init_database():
    """Initialize the user database without modifying existing records."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    ensure_bar_table(conn)
    conn.close()
    print(f"\nDatabase initialized at {DB_PATH}")

if __name__ == '__main__':
    init_database()