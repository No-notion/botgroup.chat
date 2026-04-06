interface Env {
    bgdb: D1Database;
}

// 更新自定义角色
export const onRequestPut: PagesFunction<Env> = async (context) => {
    try {
        const { env, data, request } = context;
        const userId = data.user?.userId;

        if (!userId) {
            return new Response(
                JSON.stringify({ success: false, message: '请先登录' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return new Response(
                JSON.stringify({ success: false, message: '角色ID缺失' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const db = env.bgdb;

        // 验证角色归属
        const existing = await db.prepare(
            'SELECT user_id FROM custom_characters WHERE id = ?'
        ).bind(id).first();

        if (!existing) {
            return new Response(
                JSON.stringify({ success: false, message: '角色不存在' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (existing.user_id !== userId) {
            return new Response(
                JSON.stringify({ success: false, message: '无权编辑此角色' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const body = await request.json();
        const { name, personality, model, avatar, custom_prompt, tags, stages, rag, knowledge, is_public } = body as any;

        if (!name || !model) {
            return new Response(
                JSON.stringify({ success: false, message: '角色名称和模型为必填项' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        await db.prepare(`
            UPDATE custom_characters 
            SET name = ?, personality = ?, model = ?, avatar = ?, custom_prompt = ?, 
                tags = ?, stages = ?, rag = ?, knowledge = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(
            name,
            personality || '',
            model,
            avatar || null,
            custom_prompt || '',
            tags ? JSON.stringify(tags) : null,
            stages ? JSON.stringify(stages) : null,
            rag ? 1 : 0,
            knowledge || null,
            is_public ? 1 : 0,
            id
        ).run();

        return new Response(
            JSON.stringify({ success: true, message: '角色更新成功' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Update character error:', error);
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

// 删除自定义角色
export const onRequestDelete: PagesFunction<Env> = async (context) => {
    try {
        const { env, data, request } = context;
        const userId = data.user?.userId;

        if (!userId) {
            return new Response(
                JSON.stringify({ success: false, message: '请先登录' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return new Response(
                JSON.stringify({ success: false, message: '角色ID缺失' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const db = env.bgdb;

        // 验证角色归属
        const existing = await db.prepare(
            'SELECT user_id FROM custom_characters WHERE id = ?'
        ).bind(id).first();

        if (!existing) {
            return new Response(
                JSON.stringify({ success: false, message: '角色不存在' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (existing.user_id !== userId) {
            return new Response(
                JSON.stringify({ success: false, message: '无权删除此角色' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        await db.prepare('DELETE FROM custom_characters WHERE id = ?').bind(id).run();

        return new Response(
            JSON.stringify({ success: true, message: '角色删除成功' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Delete character error:', error);
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
