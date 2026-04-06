-- Migration number: 0012    Create custom characters table

-- 自定义角色表
CREATE TABLE IF NOT EXISTS custom_characters (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    personality TEXT,
    model TEXT NOT NULL,
    avatar TEXT,
    custom_prompt TEXT,
    tags TEXT, -- JSON array stored as text
    stages TEXT, -- JSON array stored as text
    rag INTEGER DEFAULT 0,
    knowledge TEXT,
    is_public INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_custom_characters_user ON custom_characters(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_characters_public ON custom_characters(is_public);
