import { modelConfigs } from '../../src/config/aiCharacters';

export async function onRequestGet(context) {
  try {
    const db = context.env.bgdb;
    const url = new URL(context.request.url);
    const groupId = url.searchParams.get('id');

    if (!db) {
      throw new Error('数据库未配置');
    }

    // 获取群组信息
    const group = await db.prepare(
      `SELECT id, name, description, members FROM ai_groups WHERE id = ? LIMIT 1`
    ).bind(groupId || 'group1').first();

    if (!group) {
      throw new Error('群组不存在');
    }

    const memberIds = group.members ? JSON.parse(group.members as string) : [];

    // 获取群组成员角色
    const charsResult = await db.prepare(
      `SELECT id, name, description FROM ai_characters WHERE id IN (${memberIds.map(() => '?').join(',')})`
    ).bind(...memberIds).all();

    const characters = (charsResult.results || [])
      .filter((c: any) => c.personality !== 'sheduler')
      .map((character: any) => ({
        id: character.id,
        reprompt: (character.description || '').replace('{groupName}', group.name as string) + "\n" + (group.description || '')
      }));

    return Response.json({
      code: 200,
      data: characters
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
