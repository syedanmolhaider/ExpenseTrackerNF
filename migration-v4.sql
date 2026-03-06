-- Settings table for user preferences
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    month_start_day INTEGER NOT NULL DEFAULT 1,
    currency VARCHAR(10) NOT NULL DEFAULT 'Rs',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
