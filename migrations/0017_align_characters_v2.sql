-- Migration number: 0017    Align ai_characters with Character Card V2 spec

-- 删除旧表重建（数据在下面重新插入）
DROP TABLE IF EXISTS ai_characters;

-- AI角色表 - 字段对齐 Character Card V2 (chara_card_v2) 规范
CREATE TABLE ai_characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    personality TEXT DEFAULT '',
    scenario TEXT DEFAULT '',
    first_mes TEXT DEFAULT '',
    mes_example TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    system_prompt TEXT DEFAULT '',
    post_history_instructions TEXT DEFAULT '',
    alternate_greetings TEXT DEFAULT '[]',
    creator_notes TEXT DEFAULT '',
    character_book TEXT DEFAULT '{}',
    creator TEXT DEFAULT '',
    character_version TEXT DEFAULT '',
    -- 业务扩展字段
    model TEXT NOT NULL DEFAULT 'deepseek-v3.2',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_characters_sort ON ai_characters(sort_order);
