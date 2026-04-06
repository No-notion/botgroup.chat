-- Migration number: 0002 	 2025-03-28T06:06:16.353Z

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone VARCHAR(11) UNIQUE,
  nickname VARCHAR(50),
  avatar_url TEXT,
  status INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default test user
INSERT OR IGNORE INTO users (phone, nickname, status) 
VALUES ('13800138000', '测试用户', 1);
