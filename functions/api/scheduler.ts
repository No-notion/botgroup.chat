import { modelConfigs } from '../../src/config/aiCharacters';
import OpenAI from 'openai';

interface AICharacter {
  id: string;
  name: string;
  tags?: string[];
}

interface MessageHistory {
  role: string;
  content: string;
  name: string;
}

export async function onRequestPost({ env, request }) {
  console.log('scheduler');
  try {
    const { message, history, availableAIs } = await request.json();
    const selectedAIs = await scheduleAIResponses(message, history, availableAIs, env);

    return Response.json({
      selectedAIs: selectedAIs
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function analyzeMessageWithAI(message: string, allTags: string[], env: any, history: MessageHistory[] = []): Promise<string[]> {
    // 从数据库获取调度器角色
    const db = env.bgdb;
    let schedulerModel = modelConfigs[0].model;
    let schedulerPrompt = '';
    let apiKeyName = modelConfigs[0].apiKey;

    if (db) {
      try {
        const schedulerResult = await db.prepare(
          `SELECT model, description FROM ai_characters WHERE id = 'ai0' LIMIT 1`
        ).first();
        if (schedulerResult) {
          schedulerModel = schedulerResult.model as string || schedulerModel;
          schedulerPrompt = (schedulerResult.description as string || '').replace('{allTags}', allTags.join(','));
        }
      } catch (e) {
        console.error('Failed to load scheduler from DB:', e);
      }
    }

    const modelConfig = modelConfigs.find(config => config.model === schedulerModel) || modelConfigs[0];
    const apiKey = env[modelConfig.apiKey];
    if (!apiKey) {
      throw new Error(`${modelConfig.model} 的API密钥未配置`);
    }
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: modelConfig.baseURL,
    });

    if (!schedulerPrompt) {
      schedulerPrompt = `你是一个群聊总结分析专家，你在一个聊天群里，请分析群用户消息和上文群聊内容\n1、只能从给定的标签列表中选择最相关的标签，可选标签：${allTags.join(',')}。\n2、请只返回标签列表，用逗号分隔，不要有其他解释, 不要有任何前缀。\n3、回复格式示例：文字游戏, 新闻报道, 娱乐`;
    }

    try {
      const completion = await openai.chat.completions.create({
        model: schedulerModel,
        messages: [
          { role: "user", content: schedulerPrompt },
          ...history.slice(-10), // 添加历史消息
          { role: "user", content: message }
        ],
      });

      const matchedTags = completion.choices[0].message.content?.split(',').map(tag => tag.trim()) || [];
      return matchedTags;
    } catch (error) {
      console.error('AI分析失败:', error.message);
      return [];
    }
}

async function scheduleAIResponses(
  message: string, 
  history: MessageHistory[], 
  availableAIs: AICharacter[],
  env: any
): Promise<string[]> {
  // 1. 收集所有可用的标签
  const allTags = new Set<string>();
  availableAIs.forEach(ai => {
    ai.tags?.forEach(tag => allTags.add(tag));
  });

  // 2. 使用AI模型分析消息并匹配标签
  const matchedTags = await analyzeMessageWithAI(message, Array.from(allTags), env, history);
  console.log('matchedTags', matchedTags, allTags);
  
  //如果含有"文字游戏"标签，则需要全员参与
  if (matchedTags.includes("文字游戏")) {
    return availableAIs.map(ai => ai.id);
  }
  
  // 3. 分析最近发言的角色，避免连续重复选择同一角色
  const recentSpeakers = new Set<string>();
  const recentSpeakerCounts = new Map<string, number>();
  const recentHistory = history.slice(-10);
  recentHistory.forEach(hist => {
    if (hist.name && hist.name !== 'user') {
      recentSpeakers.add(hist.name);
      recentSpeakerCounts.set(hist.name, (recentSpeakerCounts.get(hist.name) || 0) + 1);
    }
  });

  // 4. 计算每个AI的匹配分数
  const aiScores = new Map<string, number>();
  const messageLC = message.toLowerCase();

  for (const ai of availableAIs) {
    if (!ai.tags) continue;

    let score = 0;
    // 标签匹配分数
    matchedTags.forEach(tag => {
      if (ai.tags?.includes(tag)) {
        score += 2; // 每个匹配的标签得2分
      }
    });

    // 直接提到AI名字额外加分
    if (messageLC.includes(ai.name.toLowerCase())) {
      score += 5;
    }

    // 历史对话相关性加分（轻度）
    recentHistory.forEach(hist => {
      if (hist.name === ai.name && hist.content.length > 0) {
        score += 0.5;
      }
    });

    // 如果最近已经发言过，大幅降低分数以增加多样性
    if (recentSpeakers.has(ai.name)) {
      const speakCount = recentSpeakerCounts.get(ai.name) || 1;
      score = Math.max(0, score - speakCount * 2); // 发言越多减分越多
    }

    if (score > 0) {
      aiScores.set(ai.id, score);
    }
  }

  // 5. 根据分数排序选择AI
  const sortedAIs = Array.from(aiScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // 6. 如果没有匹配到任何AI，随机选择1-2个（排除最近发言者）
  if (sortedAIs.length === 0) {
    console.log('没有匹配到任何AI，随机选择1-2个');
    const nonRecent = availableAIs.filter(ai => !recentSpeakers.has(ai.name));
    const pool = nonRecent.length > 0 ? nonRecent : availableAIs;
    const maxResponders = Math.min(2, pool.length);
    const numResponders = Math.floor(Math.random() * maxResponders) + 1;
    
    const shuffledAIs = [...pool]
      .sort(() => Math.random() - 0.5)
      .slice(0, numResponders);
    
    return shuffledAIs.map(ai => ai.id);
  }

  // 7. 增加多样性：选择分数最高的同时确保标签多样性
  const selectedAIs: string[] = [];
  const selectedTags = new Set<string>();
  const MAX_RESPONDERS = 3;

  for (const aiId of sortedAIs) {
    if (selectedAIs.length >= MAX_RESPONDERS) break;
    
    const ai = availableAIs.find(a => a.id === aiId);
    if (!ai) continue;

    // 计算与已选AI的标签重叠度
    let overlapCount = 0;
    let hasNewTag = false;
    if (ai.tags) {
      for (const tag of ai.tags) {
        if (selectedTags.has(tag)) {
          overlapCount++;
        } else {
          hasNewTag = true;
          selectedTags.add(tag);
        }
      }
    }

    // 如果标签重叠超过50%且不是第一个，跳过（确保差异性）
    const aiTagCount = (ai.tags || []).length;
    if (selectedAIs.length > 0 && aiTagCount > 0 && overlapCount / aiTagCount > 0.6) {
      continue;
    }

    // 如果有新标签或者还没有选择任何AI，则选择
    if (hasNewTag || selectedAIs.length === 0) {
      selectedAIs.push(aiId);
    }
  }

  // 如果选择的AI不足，补充高分AI
  while (selectedAIs.length < Math.min(2, sortedAIs.length) && selectedAIs.length < MAX_RESPONDERS) {
    const remaining = sortedAIs.filter(id => !selectedAIs.includes(id));
    if (remaining.length === 0) break;
    selectedAIs.push(remaining[0]);
  }

  return selectedAIs;
} 