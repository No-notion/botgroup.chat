interface Env {
    bgdb: D1Database;
}

// 删除整个群组
export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { env, data, request } = context;
        const userId = data.user?.userId;

        if (!userId) {
            return new Response(
                JSON.stringify({ success: false, message: '请先登录' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const body = await request.json() as { groupId: string };
        const groupId = body.groupId;

        if (!groupId) {
            return new Response(
                JSON.stringify({ success: false, message: '群组ID缺失' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const db = env.bgdb;

        // 检查用户是否是群组所有者
        const ownerCheck = await db.prepare(
            'SELECT role FROM claw_group_users WHERE group_id = ? AND user_id = ?'
        ).bind(groupId, userId).first();

        if (!ownerCheck || ownerCheck.role !== 'owner') {
            return new Response(
                JSON.stringify({ success: false, message: '只有群主才能删除群组' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 删除群组成员
        await db.prepare(
            'DELETE FROM group_members WHERE group_id = ?'
        ).bind(groupId).run();

        // 删除群组用户关系
        await db.prepare(
            'DELETE FROM claw_group_users WHERE group_id = ?'
        ).bind(groupId).run();

        // 删除群组
        await db.prepare(
            'DELETE FROM claw_groups WHERE id = ?'
        ).bind(groupId).run();

        return new Response(
            JSON.stringify({
                success: true,
                message: '群组已删除'
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Delete group error:', error);
        return new Response(
            JSON.stringify({ success: false, message: error.message || '删除群组失败' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};