-- Budget items table for monthly budget planning
CREATE TABLE IF NOT EXISTS budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    is_done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monthly balance settings (available balance per month)
CREATE TABLE IF NOT EXISTS monthly_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
    available_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_budget_items_user_month ON budget_items(user_id, month);
CREATE INDEX IF NOT EXISTS idx_monthly_balance_user_month ON monthly_balance(user_id, month);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
