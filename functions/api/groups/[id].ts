interface Env {
    bgdb: D1Database;
}

// 获取群组成员
export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const { env, request } = context;
        const url = new URL(request.url);
        const groupId = url.searchParams.get('groupId') || context.params.id;
        
        if (!groupId) {
            return new Response(
                JSON.stringify({ success: false, message: '群组ID缺失' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const db = env.bgdb;
        const result = await db.prepare(
            'SELECT character_id FROM group_members WHERE group_id = ?'
        ).bind(groupId).all();

        const members = (result.results || []).map((row) => row.character_id as string);

        return new Response(
            JSON.stringify({
                success: true,
                data: { members }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Get group members error:', error);
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

// 更新群组成员（添加或删除）
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
        const groupId = url.searchParams.get('groupId') || context.params.id;

        if (!groupId) {
            return new Response(
                JSON.stringify({ success: false, message: '群组ID缺失' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const body = await request.json();
        const { members } = body as { members: string[] };

        if (!Array.isArray(members)) {
            return new Response(
                JSON.stringify({ success: false, message: '成员列表格式错误' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const db = env.bgdb;

        // 删除旧的成员记录
        await db.prepare(
            'DELETE FROM group_members WHERE group_id = ?'
        ).bind(groupId).run();

        // 插入新的成员记录
        if (members.length > 0) {
            const placeholders = members.map(() => '(?, ?, ?)').join(', ');
            const values: any[] = [];
            members.forEach(memberId => {
                values.push(groupId, memberId, userId);
            });

            await db.prepare(
                `INSERT INTO group_members (group_id, character_id, added_by) VALUES ${placeholders}`
            ).bind(...values).run();
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: '群组成员更新成功',
                data: { members }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Update group members error:', error);
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

// 添加单个成员
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

        const url = new URL(request.url);
        const groupId = url.searchParams.get('groupId') || context.params.id;

        if (!groupId) {
            return new Response(
                JSON.stringify({ success: false, message: '群组ID缺失' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const body = await request.json();
        const { characterId } = body as { characterId: string };

        if (!characterId) {
            return new Response(
                JSON.stringify({ success: false, message: '角色ID缺失' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const db = env.bgdb;

        // 检查是否已存在
        const existing = await db.prepare(
            'SELECT id FROM group_members WHERE group_id = ? AND character_id = ?'
        ).bind(groupId, characterId).first();

        if (existing) {
            return new Response(
                JSON.stringify({ success: false, message: '该角色已在群组中' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 添加成员
        await db.prepare(
            'INSERT INTO group_members (group_id, character_id, added_by) VALUES (?, ?, ?)'
        ).bind(groupId, characterId, userId).run();

        return new Response(
            JSON.stringify({
                success: true,
                message: '成员添加成功'
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Add group member error:', error);
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

// 删除单个成员
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
        const groupId = url.searchParams.get('groupId') || context.params.id;
        const characterId = url.searchParams.get('characterId');

        if (!groupId || !characterId) {
            return new Response(
                JSON.stringify({ success: false, message: '群组ID或角色ID缺失' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const db = env.bgdb;

        // 删除成员
        await db.prepare(
            'DELETE FROM group_members WHERE group_id = ? AND character_id = ?'
        ).bind(groupId, characterId).run();

        return new Response(
            JSON.stringify({
                success: true,
                message: '成员删除成功'
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Delete group member error:', error);
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

// 更新群组信息（群名等）
export const onRequestPatch: PagesFunction<Env> = async (context) => {
    try {
        const { env, data, request } = context;
        const userId = data.user?.userId;

        if (!userId) {
            return new Response(
                JSON.stringify({ success: false, message: '请先登录' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const groupId = context.params.id as string;
        if (!groupId) {
            return new Response(
                JSON.stringify({ success: false, message: '群组ID缺失' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const body = await request.json() as { name?: string; description?: string };
        const db = env.bgdb;

        const updates: string[] = [];
        const values: any[] = [];

        if (body.name !== undefined) {
            updates.push('name = ?');
            values.push(body.name);
        }
        if (body.description !== undefined) {
            updates.push('description = ?');
            values.push(body.description);
        }

        if (updates.length === 0) {
            return new Response(
                JSON.stringify({ success: false, message: '没有要更新的字段' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        values.push(groupId);
        await db.prepare(
            `UPDATE ai_groups SET ${updates.join(', ')} WHERE id = ?`
        ).bind(...values).run();

        return new Response(
            JSON.stringify({ success: true, message: '群组信息更新成功' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Update group error:', error);
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
