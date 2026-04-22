/**
 * 简化的记忆服务 - 直接调用 Qdrant API
 * 专为 Cloudflare Workers 环境设计，避免 Node.js 依赖
 */

// Qdrant API 客户端
interface QdrantPoint {
  id: string;
  vector: number[];
  payload: {
    memory: string;
    userId: string;
    character: string;
    timestamp: number;
  };
}

interface QdrantSearchResult {
  id: string;
  score: number;
  payload: {
    memory: string;
    userId: string;
    character: string;
    timestamp: number;
  };
}

// 调用 OpenAI API 生成向量嵌入（使用传入的 base URL）
async function getEmbedding(text: string, apiKey: string, baseUrl: string = 'https://api.openai.com/v1'): Promise<number[]> {
  const embeddingUrl = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
  const response = await fetch(`${embeddingUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// 确保 Qdrant collection 存在并创建必要的索引
async function ensureCollection(qdrantUrl: string, collectionName: string = 'memories'): Promise<void> {
  try {
    // 检查 collection 是否存在
    const checkResponse = await fetch(`${qdrantUrl}/collections/${collectionName}`);
    if (checkResponse.ok) {
      // Collection 存在，确保索引已创建
      await ensurePayloadIndex(qdrantUrl, collectionName, 'userId', 'keyword');
      await ensurePayloadIndex(qdrantUrl, collectionName, 'character', 'keyword');
      await ensurePayloadIndex(qdrantUrl, collectionName, 'timestamp', 'integer');
      return;
    }

    // 创建 collection
    const createResponse = await fetch(`${qdrantUrl}/collections/${collectionName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: {
          size: 1536, // text-embedding-3-small 的维度
          distance: 'Cosine'
        }
      })
    });

    if (!createResponse.ok) {
      console.error('Failed to create collection:', await createResponse.text());
      return;
    }

    // 创建 payload 索引
    await ensurePayloadIndex(qdrantUrl, collectionName, 'userId', 'keyword');
    await ensurePayloadIndex(qdrantUrl, collectionName, 'character', 'keyword');
    await ensurePayloadIndex(qdrantUrl, collectionName, 'timestamp', 'integer');
  } catch (error) {
    console.error('Error ensuring collection:', error);
  }
}

// 确保 payload 索引存在
async function ensurePayloadIndex(
  qdrantUrl: string,
  collectionName: string,
  fieldName: string,
  fieldSchema: string
): Promise<void> {
  try {
    const response = await fetch(`${qdrantUrl}/collections/${collectionName}/index`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field_name: fieldName,
        field_schema: fieldSchema
      })
    });
    if (!response.ok) {
      console.error(`Failed to create index for ${fieldName}:`, response.status);
    }
  } catch (error) {
    console.error(`Error creating index for ${fieldName}:`, error);
  }
}

// 查询角色专属记忆（使用 scroll API，不需要向量）
export async function getCharacterMemories(
  qdrantUrl: string,
  apiKey: string,
  userId: string,
  characterName: string,
  limit: number = 10
): Promise<string> {
  try {
    // 使用 scroll API 获取记忆，按 payload 过滤（不依赖向量）
    const response = await fetch(`${qdrantUrl}/collections/memories/points/scroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: {
          must: [
            { key: 'userId', match: { value: userId } },
            { key: 'character', match: { value: characterName } }
          ]
        },
        limit: limit,
        with_payload: true
      })
    });

    if (!response.ok) {
      console.error('Scroll error:', response.status);
      return '';
    }

    const data = await response.json();
    const points = data.result?.points || [];

    // 返回记忆内容
    const memories = points.map((p: any) => p.payload.memory);
    return memories.join('\n');
  } catch (error) {
    console.error('Failed to get character memories:', error);
    return '';
  }
}

// 添加角色互动记忆
export async function addCharacterMemory(
  qdrantUrl: string,
  apiKey: string,
  userId: string,
  characterName: string,
  content: string,
  embeddingBaseUrl: string = 'https://api.openai.com/v1'
): Promise<void> {
  try {
    // 确保 collection 存在
    await ensureCollection(qdrantUrl);

    // 尝试生成向量嵌入，失败时使用零向量
    let embedding: number[];
    try {
      embedding = await getEmbedding(content, apiKey, embeddingBaseUrl);
    } catch (embedError) {
      console.error('Embedding failed, using zero vector:', embedError);
      embedding = new Array(1536).fill(0.001);
    }

    // 生成唯一 UUID
    const pointId = crypto.randomUUID();

    // 插入到 Qdrant
    const response = await fetch(`${qdrantUrl}/collections/memories/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [
          {
            id: pointId,
            vector: embedding,
            payload: {
              memory: content,
              userId: userId,
              character: characterName,
              timestamp: Date.now()
            }
          }
        ]
      })
    });

    if (!response.ok) {
      console.error('Failed to add memory:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Failed to add character memory:', error);
  }
}

// 使用向量相似度搜索记忆（语义搜索）
export async function searchCharacterMemories(
  qdrantUrl: string,
  apiKey: string,
  userId: string,
  characterName: string,
  query: string,
  limit: number = 10,
  embeddingBaseUrl: string = 'https://api.openai.com/v1'
): Promise<string> {
  try {
    // 生成查询向量
    const queryEmbedding = await getEmbedding(query, apiKey, embeddingBaseUrl);

    const response = await fetch(`${qdrantUrl}/collections/memories/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: queryEmbedding,
        filter: {
          must: [
            { key: 'userId', match: { value: userId } },
            { key: 'character', match: { value: characterName } }
          ]
        },
        limit: limit,
        with_payload: true
      })
    });

    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    const memories = (data.result || []).map((m: any) => m.payload.memory);
    return memories.join('\n');
  } catch (error) {
    console.error('Failed to search memories:', error);
    return '';
  }
}