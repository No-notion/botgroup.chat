import { modelConfigs } from '../../../src/config/aiCharacters';

interface Env {
    bgdb: D1Database;
}

// 获取所有角色（系统预设 + 用户自定义）
export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const { env, data } = context;
        const userId = data.user?.userId;
        const db = env.bgdb;

        // 获取用户自定义角色
        let customCharacters: any[] = [];
        if (userId && db) {
            const result = await db.prepare(
                `SELECT id, name, personality, model, avatar, custom_prompt, tags, stages, rag, knowledge, is_public, created_at
                 FROM custom_characters 
                 WHERE user_id = ? OR is_public = 1
                 ORDER BY created_at DESC`
            ).bind(userId).all();
            customCharacters = result.results || [];
        }

        // 解析 JSON 字段
        const parsedCustomCharacters = customCharacters.map(c => ({
            ...c,
            tags: c.tags ? JSON.parse(c.tags as string) : [],
            stages: c.stages ? JSON.parse(c.stages as string) : undefined,
            rag: c.rag === 1,
            isCustom: true
        }));

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    characters: parsedCustomCharacters,
                    models: modelConfigs.map(m => ({
                        model: m.model,
                        name: m.model
                    }))
                }
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error: any) {
        console.error('Get characters error:', error);
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

// 创建自定义角色
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

        const body = await request.json();
        const { name, personality, model, avatar, custom_prompt, tags, stages, rag, knowledge, is_public } = body as any;

        if (!name || !model) {
            return new Response(
                JSON.stringify({ success: false, message: '角色名称和模型为必填项' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const db = env.bgdb;

        await db.prepare(`
            INSERT INTO custom_characters (id, user_id, name, personality, model, avatar, custom_prompt, tags, stages, rag, knowledge, is_public)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            userId,
            name,
            personality || '',
            model,
            avatar || null,
            custom_prompt || '',
            tags ? JSON.stringify(tags) : null,
            stages ? JSON.stringify(stages) : null,
            rag ? 1 : 0,
            knowledge || null,
            is_public ? 1 : 0
        ).run();

        return new Response(
            JSON.stringify({
                success: true,
                message: '角色创建成功',
                data: { id }
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Create character error:', error);
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
