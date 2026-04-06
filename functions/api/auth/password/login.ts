interface Env {
    bgkv: KVNamespace;
    JWT_SECRET: string;
    bgdb: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { request, env } = context;
        
        // 获取请求体
        const body = await request.json();
        const { username, password } = body;

        // 验证输入
        if (!username || !password) {
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    message: '用户名和密码不能为空' 
                }), 
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
        }

        // 查询用户
        const db = env.bgdb;
        const user = await db.prepare(
            "SELECT id, username, nickname, avatar_url, status, password FROM users WHERE username = ?"
        ).bind(username).first();

        if (!user) {
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    message: '用户名或密码错误' 
                }), 
                {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
        }

        // 验证密码
        const passwordHash = await hashPassword(password);
        if (user.password !== passwordHash) {
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    message: '用户名或密码错误' 
                }), 
                {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
        }

        // 更新登录时间
        await db.prepare(`
            UPDATE users 
            SET last_login_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(user.id).run();

        // 生成 token
        const token = await generateToken(user.id as number, env);
        
        // 返回用户信息和token
        return new Response(
            JSON.stringify({ 
                success: true, 
                message: '登录成功',
                data: {
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        nickname: user.nickname,
                        avatar_url: user.avatar_url,
                        status: user.status
                    }
                }
            }), 
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ 
                success: false, 
                message: '服务器错误' 
            }), 
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    }
};

// 密码哈希函数
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 生成 JWT Token
async function generateToken(userId: number, env: Env): Promise<string> {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };
    
    const payload = {
        userId,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7天过期
        iat: Math.floor(Date.now() / 1000)
    };
    
    // Base64Url 编码
    const encodeBase64Url = (data: object) => {
        return btoa(JSON.stringify(data))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    };
    
    // 生成签名
    const generateSignature = async (input: string, secret: string) => {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(input)
        );
        
        return btoa(String.fromCharCode(...new Uint8Array(signature)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    };
    
    const headerEncoded = encodeBase64Url(header);
    const payloadEncoded = encodeBase64Url(payload);
    
    const signature = await generateSignature(
        `${headerEncoded}.${payloadEncoded}`,
        env.JWT_SECRET
    );
    
    return `${headerEncoded}.${payloadEncoded}.${signature}`;
}
