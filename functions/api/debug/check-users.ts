interface Env {
    bgdb: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const { env } = context;
        const db = env.bgdb;
        
        // 检查用户表结构
        const tableInfo = await db.prepare("PRAGMA table_info(users)").all();
        
        // 检查是否有 devin 用户
        const devinUser = await db.prepare(
            "SELECT id, username, nickname, status FROM users WHERE username = 'devin'"
        ).first();
        
        // 检查所有用户
        const allUsers = await db.prepare(
            "SELECT id, username, nickname, phone, status FROM users"
        ).all();
        
        return new Response(JSON.stringify({
            success: true,
            tableInfo: tableInfo.results,
            hasUsernameField: tableInfo.results.some((col: any) => col.name === 'username'),
            hasPasswordField: tableInfo.results.some((col: any) => col.name === 'password'),
            devinUser: devinUser,
            allUsers: allUsers.results,
            timestamp: new Date().toISOString()
        }, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
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
