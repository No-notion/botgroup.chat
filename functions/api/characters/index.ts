import { modelConfigs } from '../../../src/config/aiCharacters';

interface Env {
    bgdb: D1Database;
}

// 获取所有角色（数据库角色 + 用户自定义）
export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const { env, data } = context;
        const userId = data.user?.userId;
        const db = env.bgdb;

        // 从数据库获取 AI 角色
        let aiCharacters: any[] = [];
        if (db) {
            const charsResult = await db.prepare(
                `SELECT id, name, description, personality, scenario, first_mes, mes_example, model, avatar, tags, system_prompt, post_history_instructions, alternate_greetings, creator_notes, character_book, creator, character_version, sort_order
                 FROM ai_characters
                 ORDER BY sort_order ASC`
            ).all();
            aiCharacters = (charsResult.results || []).map((c) => ({
                ...c,
                tags: c.tags ? JSON.parse(c.tags as string) : [],
                alternate_greetings: c.alternate_greetings ? JSON.parse(c.alternate_greetings as string) : [],
                isSystem: true,
                isCustom: false
            }));
        }

        // 获取用户自定义角色（包括对预设角色的覆盖）
        let customCharacters: any[] = [];
        if (userId && db) {
            const result = await db.prepare(
                `SELECT id, name, description, personality, scenario, first_mes, mes_example, model, avatar, tags, system_prompt, post_history_instructions, alternate_greetings, creator_notes, character_book, creator, character_version, is_public, created_at
                 FROM custom_characters 
                 WHERE user_id = ? OR is_public = 1
                 ORDER BY created_at DESC`
            ).bind(userId).all();
            customCharacters = (result.results || []).map(c => ({
                ...c,
                tags: c.tags ? JSON.parse(c.tags as string) : [],
                alternate_greetings: c.alternate_greetings ? JSON.parse(c.alternate_greetings as string) : [],
                isCustom: true
            }));
        }

        // 创建一个Map来存储自定义角色（用于覆盖预设角色）
        const customMap = new Map(customCharacters.map(c => [c.id, c]));

        // 合并角色列表：AI角色 + 自定义角色（如果ID相同则用自定义覆盖）
        const allCharacters = aiCharacters.map(sysChar => {
            const customOverride = customMap.get(sysChar.id);
            if (customOverride) {
                return { ...sysChar, ...customOverride, isSystem: true, isCustom: true };
            }
            return sysChar;
        });

        // 添加纯粹的自定义角色（不在AI角色列表中的）
        customCharacters.forEach(customChar => {
            if (!aiCharacters.find(sysChar => sysChar.id === customChar.id)) {
                allCharacters.push({ ...customChar, isSystem: false, isCustom: true });
            }
        });

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    characters: allCharacters,
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

// 创建或更新自定义角色
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
        const { id, name, description, personality, scenario, first_mes, mes_example, model, avatar, tags, system_prompt, post_history_instructions, alternate_greetings, creator_notes, character_book, creator, character_version, is_public } = body as any;

        if (!name || !model) {
            return new Response(
                JSON.stringify({ success: false, message: '角色名称和模型为必填项' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const db = env.bgdb;
        const characterId = id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const existing = await db.prepare(
            'SELECT id FROM custom_characters WHERE id = ?'
        ).bind(characterId).first();

        if (existing) {
            await db.prepare(`
                UPDATE custom_characters 
                SET name = ?, description = ?, personality = ?, scenario = ?, first_mes = ?, mes_example = ?, model = ?, avatar = ?, 
                    tags = ?, system_prompt = ?, post_history_instructions = ?, alternate_greetings = ?, creator_notes = ?, character_book = ?, creator = ?, character_version = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(
                name,
                description || '',
                personality || '',
                scenario || '',
                first_mes || '',
                mes_example || '',
                model,
                avatar || null,
                tags ? JSON.stringify(tags) : null,
                system_prompt || '',
                post_history_instructions || '',
                alternate_greetings ? JSON.stringify(alternate_greetings) : null,
                creator_notes || '',
                character_book || '',
                creator || '',
                character_version || '',
                is_public ? 1 : 0,
                characterId
            ).run();
        } else {
            await db.prepare(`
                INSERT INTO custom_characters (id, user_id, name, description, personality, scenario, first_mes, mes_example, model, avatar, tags, system_prompt, post_history_instructions, alternate_greetings, creator_notes, character_book, creator, character_version, is_public)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                characterId,
                userId,
                name,
                description || '',
                personality || '',
                scenario || '',
                first_mes || '',
                mes_example || '',
                model,
                avatar || null,
                tags ? JSON.stringify(tags) : null,
                system_prompt || '',
                post_history_instructions || '',
                alternate_greetings ? JSON.stringify(alternate_greetings) : null,
                creator_notes || '',
                character_book || '',
                creator || '',
                character_version || '',
                is_public ? 1 : 0
            ).run();
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: existing ? '角色更新成功' : '角色创建成功',
                data: { id: characterId }
            }),
            { status: existing ? 200 : 201, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Create/Update character error:', error);
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
