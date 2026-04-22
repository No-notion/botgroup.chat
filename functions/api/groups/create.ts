interface Env {
    bgdb: D1Database;
}

// 创建普通群组
export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { env } = context;
        const db = env.bgdb;

        const userId = context.data?.user?.userId;
        if (!userId) {
            return new Response(
                JSON.stringify({ success: false, message: '请先登录' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { name, description, members } = await context.request.json() as {
            name: string;
            description?: string;
            members?: string[];
        };

        if (!name || !name.trim()) {
            return new Response(
                JSON.stringify({ success: false, message: '群名不能为空' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (name.trim().length > 30) {
            return new Response(
                JSON.stringify({ success: false, message: '群名不能超过30个字符' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 生成群组ID
        const groupId = `group-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

        // 创建群组
        await db.prepare(
            `INSERT INTO claw_groups (id, name, description, type, created_by, created_at)
             VALUES (?, ?, ?, 'normal', ?, CURRENT_TIMESTAMP)`
        ).bind(groupId, name.trim(), description?.trim() || '', userId).run();

        // 添加用户为群组所有者
        await db.prepare(
            `INSERT INTO claw_group_users (group_id, user_id, role) VALUES (?, ?, 'owner')`
        ).bind(groupId, userId).run();

        // 如果提供了成员列表，添加成员
        if (members && members.length > 0) {
            const placeholders = members.map(() => '(?, ?, ?)').join(', ');
            const values: any[] = [];
            members.forEach(memberId => {
                values.push(groupId, memberId, userId);
            });

            await db.prepare(
                `INSERT INTO group_members (group_id, character_id, added_by) VALUES ${placeholders}`
            ).bind(...values).run();
        }

        const group = await db.prepare(
            'SELECT id, name, description, type, created_by, created_at FROM claw_groups WHERE id = ?'
        ).bind(groupId).first();

        return new Response(
            JSON.stringify({
                success: true,
                data: { group }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        console.error('Create normal group error:', error);
        return new Response(
            JSON.stringify({ success: false, message: error.message || '创建群聊失败' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
