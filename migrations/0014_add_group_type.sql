-- Migration number: 0014    Add type field to claw_groups

-- 添加群组类型字段
ALTER TABLE claw_groups ADD COLUMN type TEXT DEFAULT 'openclaw' CHECK(type IN ('openclaw', 'normal'));

-- 更新现有群组为 openclaw 类型
UPDATE claw_groups SET type = 'openclaw' WHERE type IS NULL;
