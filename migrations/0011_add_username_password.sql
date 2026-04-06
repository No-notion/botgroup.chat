-- Migration number: 0011 	 Add username and password fields to users table
ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN password TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 插入测试账号 devin/cw123
-- 密码 cw123 使用 SHA-256 加密
INSERT OR IGNORE INTO users (username, password, nickname, status, created_at, updated_at, last_login_at)
VALUES ('devin', 'c8d8b50b7a6b5080be442671c7028f7f8f159630d352bc348ab3b7ca17b0357a', 'Devin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
