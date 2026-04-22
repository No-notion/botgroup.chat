interface Env {
    bgdb: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { env, data, request } = context;
        
        // 解析请求体
        const body = await request.json();
        const { nickname, avatar_url, bio, occupation, interests } = body;

        // 构建 SQL 更新语句和参数
        let sql = 'UPDATE users SET updated_at = DATETIME(\'now\')';
        const params = [];

        // 如果有昵称更新
        if (nickname !== undefined) {
            if (typeof nickname !== 'string' || nickname.length > 32) {
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        message: '昵称格式不正确' 
                    }), 
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }
            sql += ', nickname = ?';
            params.push(nickname);
        }

        // 如果有头像更新
        if (avatar_url !== undefined) {
            if (typeof avatar_url !== 'string') {
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        message: '头像URL格式不正确' 
                    }), 
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }
            sql += ', avatar_url = ?';
            params.push(avatar_url || null);
        }

        // 如果有个人简介更新
        if (bio !== undefined) {
            if (typeof bio !== 'string' || bio.length > 200) {
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        message: '个人简介过长' 
                    }), 
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }
            sql += ', bio = ?';
            params.push(bio || null);
        }

        // 如果有职业更新
        if (occupation !== undefined) {
            if (typeof occupation !== 'string' || occupation.length > 50) {
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        message: '职业信息过长' 
                    }), 
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }
            sql += ', occupation = ?';
            params.push(occupation || null);
        }

        // 如果有兴趣爱好更新
        if (interests !== undefined) {
            if (typeof interests !== 'string' || interests.length > 100) {
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        message: '兴趣爱好过长' 
                    }), 
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }
            sql += ', interests = ?';
            params.push(interests || null);
        }

        // 添加 WHERE 条件
        sql += ' WHERE id = ?';
        params.push(data.user.userId);

        // 执行更新
        const result = await env.bgdb.prepare(sql).bind(...params).run();

        if (!result.success) {
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    message: '更新失败' 
                }), 
                {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
        }

        // 获取更新后的用户信息
        const userInfo = await env.bgdb.prepare(`
            SELECT id, phone, nickname, avatar_url, status, bio, occupation, interests
            FROM users 
            WHERE id = ?
        `).bind(data.user.userId).first();
        //处理avatar_url
        if (userInfo.avatar_url) {
            userInfo.avatar_url = `${env.NEXT_PUBLIC_CF_IMAGES_DELIVERY_URL}/${userInfo.avatar_url}/public`;
        }
        return new Response(
            JSON.stringify({ 
                success: true, 
                data: userInfo 
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