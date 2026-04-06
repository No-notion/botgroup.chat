import {generateAICharacters, generateTechGroupCharacters, generateFamilyGroupCharacters, generateWorkGroupCharacters } from '../../src/config/aiCharacters';
import { groups } from '../../src/config/groups';

const staticGroupIds = new Set(groups.map(g => g.clawGroupId || g.id));

export async function onRequestGet(context) {
    try {
      const db = context.env.bgdb;
      const userId = context.data?.user?.userId;
      let dynamicGroups = [];
      let customCharacters = [];

      if (db && userId) {
        // 获取用户的动态群组
        const result = await db.prepare(
          `SELECT g.id, g.name, g.description, g.created_by, g.created_at
           FROM claw_groups g
           INNER JOIN claw_group_users gu ON g.id = gu.group_id
           WHERE gu.user_id = ?
           ORDER BY gu.joined_at ASC`
        ).bind(userId).all();

        dynamicGroups = (result.results || [])
          .filter((g) => !staticGroupIds.has(g.id as string))
          .map((g) => ({
            id: g.id,
            name: `🦞${g.name}`,
            description: g.description || '',
            members: [],
            isGroupDiscussionMode: true,
            type: 'openclaw',
            clawGroupId: g.id
          }));

        // 获取用户的自定义角色
        const charResult = await db.prepare(
          `SELECT id, name, personality, model, avatar, custom_prompt, tags, stages, rag, knowledge
           FROM custom_characters 
           WHERE user_id = ? OR is_public = 1
           ORDER BY created_at DESC`
        ).bind(userId).all();

        customCharacters = (charResult.results || []).map((c) => ({
          id: c.id,
          name: c.name,
          personality: c.personality || '',
          model: c.model,
          avatar: c.avatar || undefined,
          custom_prompt: c.custom_prompt || '',
          tags: c.tags ? JSON.parse(c.tags as string) : undefined,
          stages: c.stages ? JSON.parse(c.stages as string) : undefined,
          rag: c.rag === 1,
          knowledge: c.knowledge || undefined,
          isCustom: true
        }));
      }

      const allGroups = [...groups, ...dynamicGroups];

      // 合并所有角色（系统预设 + 用户自定义）
      const allCharacters = [
        ...generateAICharacters('#groupName#', '#allTags#'),
        ...generateTechGroupCharacters(),
        ...generateFamilyGroupCharacters(),
        ...generateWorkGroupCharacters(),
        ...customCharacters
      ];

      return Response.json({
        code: 200,
        data: {
          groups: allGroups,
          characters: allCharacters,
          user: context.data.user || null
        }
      });
    } catch (error) {
      console.error(error);
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
