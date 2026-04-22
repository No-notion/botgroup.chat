-- Migration number: 0020    Add user profile fields

-- 添加用户信息扩展字段
ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN occupation TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN interests TEXT DEFAULT '';
