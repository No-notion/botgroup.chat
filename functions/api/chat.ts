import OpenAI from 'openai';
import { modelConfigs } from '../../src/config/aiCharacters';
import { getCharacterMemories, addCharacterMemory, searchCharacterMemories } from '../lib/memory';

export async function onRequestPost({ env, request }) {
  try {
    const { message, custom_prompt, history, aiName, index, model = "qwen-plus", previousResponses = [], isFollowUp = false, triggerBy = '', userName = '', userId = '', userBio = '', userOccupation = '', userInterests = '' } = await request.json();
    
    const modelConfig = modelConfigs.find(config => config.model === model);

    if (!modelConfig) {
      throw new Error('不支持的模型类型');
    }

    // 从环境变量中获取 API key
    const apiKey = env[modelConfig.apiKey];
    if (!apiKey) {
      throw new Error(`${model} 的API密钥未配置`);
    }

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: modelConfig.baseURL
    });

    // 根据性格设置不同的系统提示语
    let systemPrompt = "";

    // 构建避免重复的提示 - 更自然的方式
    let avoidRepeatPrompt = "";
    if (previousResponses && previousResponses.length > 0) {
      const recentResponses = previousResponses.slice(-3);
      const responseSummary = recentResponses.map(r => `【${r.name}】：${r.content.substring(0, 100)}${r.content.length > 100 ? '...' : ''}`).join('\n');
      avoidRepeatPrompt = `\n\n刚才群里其他人说：\n${responseSummary}\n\n你要说点不一样的，别重复他们的话。如果别人已经把话说透了，你就简短接个话就行，或者换个角度说。`;
    } else if (history && history.length > 0) {
      const recentAiMsgs = history.slice(-8).filter((h: any) => h.role === 'assistant' && h.name && h.name !== 'user').slice(-2);
      if (recentAiMsgs.length > 0) {
        const histSummary = recentAiMsgs.map((h: any) => `【${h.name}】：${h.content.substring(0, 80)}`).join('\n');
        avoidRepeatPrompt = `\n\n刚才群友说：\n${histSummary}\n\n别重复他们的观点。`;
      }
    }

    // 构建互动上下文提示 - 更自然的群聊感
    let interactionPrompt = "";
    if (isFollowUp && triggerBy) {
      const messageContent = message || '';
      const isUserCentricFollowUp = previousResponses && previousResponses.length > 0 &&
        previousResponses.every(r => r.content.length > 0) &&
        !messageContent.startsWith(triggerBy + '说：');

      if (isUserCentricFollowUp) {
        // 随机选择不同的接话风格
        const followStyles = [
          `顺着${triggerBy}的话题继续聊，说点你自己的看法。`,
          `${triggerBy}说得有道理，你再补充一个角度。`,
          `和${triggerBy}呼应一下，像朋友聊天那样自然接话。`,
        ];
        interactionPrompt = `\n\n${followStyles[Math.floor(Math.random() * followStyles.length)]}`;
      } else {
        // 真正的群友互动 - 随机化风格
        const interactionStyles = [
          `你在接${triggerBy}的话，像朋友聊天一样自然回应。可以赞同、吐槽、追问、开玩笑都行。`,
          `${triggerBy}刚才说了，你来接个话。别太正式，就像群里闲聊。`,
          `回复${triggerBy}，想怎么回就怎么回，可以有情绪、有态度、有个性。`,
        ];
        interactionPrompt = `\n\n${interactionStyles[Math.floor(Math.random() * interactionStyles.length)]}`;
      }
    }

    // 构建用户信息提示 - 简化版本
    let userInfoPrompt = "";
    if (userName) {
      userInfoPrompt = `\n\n和你聊天的是${userName}（男）`;
      if (userOccupation) userInfoPrompt += `，做${userOccupation}的`;
      if (userInterests) userInfoPrompt += `，喜欢${userInterests}`;
      userInfoPrompt += `。你是女性，用温柔的语气和他聊天，叫他亲爱的。`;
    }

    // 查询角色专属记忆并注入
    if (userId && env.QDRANT_URL) {
      try {
        const memoryContext = await getCharacterMemories(
          env.QDRANT_URL,
          env.CODING_PLAN_API_KEY,
          String(userId),
          aiName
        );
        if (memoryContext) {
          userInfoPrompt += `\n\n【你与${userName}的历史互动记忆】\n${memoryContext}`;
        }
      } catch (error) {
        console.error('Failed to query memories:', error);
      }
    }

    // 简化最终提示 - 减少规则感
    systemPrompt = custom_prompt + avoidRepeatPrompt + interactionPrompt + userInfoPrompt + `\n\n你是${aiName}，你是女性，用温柔亲切的语气聊天。直接说话就行，不用加名字前缀。像真人在群里聊天，自然点、随意点，想说啥说啥。`;

    // 构建完整的消息历史
    const baseMessages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-30), // 添加历史消息
    ];
    
    // 用户当前消息始终添加到最后
    baseMessages.push({ role: "user", content: message });
    const messages = baseMessages;
    console.log("发送给模型的消息:", JSON.stringify(messages, null, 2));

    // 使用流式响应 - 添加温度参数增加随机性
    const stream = await openai.chat.completions.create({
      model: model,
      messages: messages,
      stream: true,
      temperature: 0.85, // 提高温度让回复更有创意和变化
    });

    // 创建 ReadableStream
    const readable = new ReadableStream({
      async start(controller) {
        let inThinkTag = false;
        let buffer = '';
        let fullResponse = ''; // 收集完整响应用于保存记忆

        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              buffer += content;
              fullResponse += content; // 收集响应内容
              
              // 处理缓冲区中的内容
              let outputContent = '';
              let i = 0;
              
              while (i < buffer.length) {
                if (!inThinkTag) {
                  // 检查是否进入 think 标签
                  if (buffer.substring(i, i + 7) === '<think>') {
                    inThinkTag = true;
                    i += 7;
                    continue;
                  }
                  // 输出非 think 标签内的内容
                  outputContent += buffer[i];
                  i++;
                } else {
                  // 在 think 标签内，检查是否结束
                  if (buffer.substring(i, i + 8) === '</think>') {
                    inThinkTag = false;
                    i += 8;
                    continue;
                  }
                  // 跳过 think 标签内的内容
                  i++;
                }
              }
              
              // 保留未处理完的缓冲区内容
              if (!inThinkTag) {
                buffer = '';
              } else {
                // 如果还在 think 标签内，保留从 <think> 开始的内容
                const thinkStart = buffer.lastIndexOf('<think>');
                buffer = thinkStart >= 0 ? buffer.substring(thinkStart) : '';
              }
              
              // 发送过滤后的内容
              if (outputContent) {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: outputContent })}\n\n`));
              }
            }
          }
          
          // 处理缓冲区中剩余的内容（如果不在 think 标签内）
          if (buffer && !inThinkTag) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: buffer })}\n\n`));
          }
          
          controller.close();

          // 响应完成后异步保存记忆（fire and forget，不阻塞响应）
          if (userId && env.QDRANT_URL && fullResponse && message) {
            console.log('准备保存记忆:', { userId, aiName, message, userName });
            try {
              // 保存用户消息相关的记忆
              const memoryContent = `${userName}说：${message}`;
              console.log('记忆内容:', memoryContent);
              await addCharacterMemory(
                env.QDRANT_URL,
                env.CODING_PLAN_API_KEY,
                String(userId),
                aiName,
                memoryContent,
                env.EMBEDDING_BASE_URL || 'https://api.openai.com/v1'
              );
              console.log('记忆保存完成');
            } catch (error) {
              console.error('Failed to save memory:', error);
            }
          } else {
            console.log('未保存记忆:', { userId: userId ? '有' : '无', QDRANT_URL: env.QDRANT_URL ? '有' : '无', fullResponse: fullResponse ? '有' : '无', message: message ? '有' : '无' });
          }
        } catch (error) {
          controller.error(error);
          console.error(error.message);
        }
      },
    });

    // 返回 SSE 流
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error(error.message);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 