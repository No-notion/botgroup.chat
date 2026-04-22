import { modelConfigs } from '../../src/config/aiCharacters';
import OpenAI from 'openai';

interface AICharacter {
  id: string;
  name: string;
  tags?: string[];
}

// 检查是否需要角色互动
export async function onRequestPost({ env, request }) {
  try {
    const { 
      lastResponse,      // 最后一个角色的回复
      lastResponder,     // 最后回复的角色名字
      availableAIs,      // 可用的AI角色列表
      history           // 历史消息
    } = await request.json();

    const interactionAIs = await checkInteraction(
      lastResponse, 
      lastResponder, 
      availableAIs, 
      history, 
      env
    );

    return Response.json({
      shouldInteract: interactionAIs.length > 0,
      interactionAIs: interactionAIs
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { shouldInteract: false, interactionAIs: [] },
      { status: 200 }
    );
  }
}

async function checkInteraction(
  lastResponse: string,
  lastResponder: string,
  availableAIs: AICharacter[],
  history: any[],
  env: any
): Promise<string[]> {
  // 使用调度AI来判断是否需要互动
  const db = env.bgdb;
  let schedulerModel = modelConfigs[0].model;
  if (db) {
    try {
      const schedulerResult = await db.prepare(
        `SELECT model FROM ai_characters WHERE id = 'ai0' LIMIT 1`
      ).first();
      if (schedulerResult) {
        schedulerModel = schedulerResult.model as string || schedulerModel;
      }
    } catch (e) {
      console.error('Failed to load scheduler from DB:', e);
    }
  }
  const modelConfig = modelConfigs.find(config => config.model === schedulerModel) || modelConfigs[0];
  const apiKey = env[modelConfig.apiKey];
  
  if (!apiKey) {
    return [];
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: modelConfig.baseURL,
  });

  // 构建提示词
  const allAINames = availableAIs.map(ai => ai.name).join('、');
  const prompt = `你是一个群聊互动分析专家。刚刚${lastResponder}在群里发了消息：
"${lastResponse}"

群里有这些成员：${allAINames}

请判断：
1. 这条消息是否值得其他成员回复或补充？（比如有争议观点、需要专业补充、有趣的互动话题等）
2. 如果值得，哪些成员应该回复？（考虑他们的专业领域和性格）

规则：
- 不要选择${lastResponder}自己
- 最多选择1-2个成员
- 只有在确实有价值互动时才选择（不要过度互动）
- 考虑消息的专业性、争议性、趣味性

请直接返回成员名字列表，用逗号分隔。如果不需要互动，返回"无"。
示例：投资顾问,理财规划师
示例：无`;

  try {
    const completion = await openai.chat.completions.create({
      model: schedulerModel,
      messages: [
        { role: "system", content: "你是一个简洁的分析助手，只返回成员名字，不要解释。" },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 50
    });

    const response = completion.choices[0].message.content?.trim() || '无';
    
    if (response === '无' || response === '') {
      return [];
    }

    // 解析返回的名字，找到对应的AI ID
    const names = response.split(/[,，、]/).map((n: string) => n.trim()).filter((n: string) => n);
    const interactionAIs: string[] = [];

    for (const name of names) {
      const ai = availableAIs.find(a => a.name === name && a.name !== lastResponder);
      if (ai) {
        interactionAIs.push(ai.id);
      }
    }

    // 限制最多2个互动角色
    return interactionAIs.slice(0, 2);
  } catch (error) {
    console.error('Interaction check failed:', error);
    return [];
  }
}
