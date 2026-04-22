-- Migration number: 0018    Align custom_characters with Character Card V2 spec

-- 删除旧表重建（自定义角色为用户数据，实际部署时需要迁移）
DROP TABLE IF EXISTS custom_characters;

-- 自定义角色表 - 字段对齐 Character Card V2 (chara_card_v2) 规范
CREATE TABLE custom_characters (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    personality TEXT DEFAULT '',
    scenario TEXT DEFAULT '',
    first_mes TEXT DEFAULT '',
    mes_example TEXT DEFAULT '',
    model TEXT NOT NULL DEFAULT 'deepseek-v3.2',
    avatar TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    system_prompt TEXT DEFAULT '',
    post_history_instructions TEXT DEFAULT '',
    alternate_greetings TEXT DEFAULT '[]',
    creator_notes TEXT DEFAULT '',
    character_book TEXT DEFAULT '{}',
    creator TEXT DEFAULT '',
    character_version TEXT DEFAULT '',
    is_public INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_custom_characters_user ON custom_characters(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_characters_public ON custom_characters(is_public);
