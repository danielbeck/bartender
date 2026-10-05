def ensure_bar_table(db):
    db.execute('''
        CREATE TABLE IF NOT EXISTS user_bar (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            ingredient_ids TEXT NOT NULL DEFAULT '[]',
            stock_only INTEGER NOT NULL DEFAULT 0
        )
    ''')
    db.commit()
