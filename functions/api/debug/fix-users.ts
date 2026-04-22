interface Env {
    bgdb: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { env } = context;
        const db = env.bgdb;
        
        // 检查用户表是否有 username 和 password 字段
        const tableInfo = await db.prepare("PRAGMA table_info(users)").all();
        const hasUsernameField = tableInfo.results.some((col: any) => col.name === 'username');
        const hasPasswordField = tableInfo.results.some((col: any) => col.name === 'password');
        
        const results: string[] = [];
        
        // 如果没有字段，添加它们
        if (!hasUsernameField) {
            await db.prepare("ALTER TABLE users ADD COLUMN username TEXT UNIQUE").run();
            results.push("Added username field");
        }
        
        if (!hasPasswordField) {
            await db.prepare("ALTER TABLE users ADD COLUMN password TEXT").run();
            results.push("Added password field");
        }
        
        // 创建索引
        try {
            await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)").run();
            results.push("Created username index");
        } catch (e) {
            // 索引可能已存在
        }
        
        // 检查是否已有 devin 用户
        const existingUser = await db.prepare(
            "SELECT id FROM users WHERE username = 'devin'"
        ).first();
        
        if (!existingUser) {
            // 插入测试账号 devin/cw123
            // 密码 cw123 的 SHA-256 哈希
            const passwordHash = 'c8d8b50b7a6b5080be442671c7028f7f8f159630d352bc348ab3b7ca17b0357a';
            
            await db.prepare(`
                INSERT INTO users (username, password, nickname, status, created_at, updated_at, last_login_at)
                VALUES (?, ?, 'Devin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).bind('devin', passwordHash).run();
            
            results.push("Created devin user with password 'cw123'");
        } else {
            results.push("devin user already exists");
        }
        
        // 验证用户已创建
        const verifyUser = await db.prepare(
            "SELECT id, username, nickname, status FROM users WHERE username = 'devin'"
        ).first();
        
        return new Response(JSON.stringify({
            success: true,
            message: "修复完成",
            actions: results,
            user: verifyUser,
            loginInfo: {
                username: "devin",
                password: "cw123"
            }
        }, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Fix users error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
