-- Migration number: 0013    Create group members table

-- 群组成员关系表
-- 存储群组中包含哪些角色
CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    added_by INTEGER,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES claw_groups(id),
    FOREIGN KEY (added_by) REFERENCES users(id),
    UNIQUE(group_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_character ON group_members(character_id);
