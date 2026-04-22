interface Env {
  bgdb: D1Database;
}

// POST /api/characters/import - Import Character Card V2 JSON
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
    const cardData = body.spec === 'chara_card_v2' ? body.data : body;

    if (!cardData || !cardData.name) {
      return new Response(
        JSON.stringify({ success: false, message: '无效的角色卡片格式，缺少 name 字段' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = env.bgdb;

    // 直接使用 V2 字段，不做映射
    const characterId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Extensions 中可能包含 depth_prompt 等
    const extensions = cardData.extensions || {};

    await db.prepare(`
      INSERT INTO custom_characters (
        id, user_id, name, description, personality, scenario, first_mes, mes_example, 
        model, avatar, tags, system_prompt, post_history_instructions, alternate_greetings, 
        creator_notes, character_book, creator, character_version, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      characterId,
      userId,
      cardData.name,
      cardData.description || '',
      cardData.personality || '',
      cardData.scenario || '',
      cardData.first_mes || '',
      cardData.mes_example || '',
      'deepseek-v3.2', // default model
      cardData.avatar || '',
      cardData.tags ? JSON.stringify(cardData.tags) : null,
      cardData.system_prompt || '',
      cardData.post_history_instructions || '',
      cardData.alternate_greetings ? JSON.stringify(cardData.alternate_greetings) : null,
      cardData.creator_notes || '',
      cardData.character_book ? JSON.stringify(cardData.character_book) : '{}',
      cardData.creator || '',
      cardData.character_version || '',
      0
    ).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: `角色 "${cardData.name}" 导入成功`,
        data: {
          id: characterId,
          name: cardData.name,
          avatar: cardData.avatar || '',
          description: cardData.description || '',
          tags: cardData.tags || [],
          model: 'deepseek-v3.2'
        }
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Import character error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || '导入失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
