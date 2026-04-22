// 优先使用运行时配置，降级到构建时配置
// 在开发环境使用代理，生产环境使用完整URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export async function request(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    // 如果返回 401，清除 token 并跳转到登录页
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        // 返回一个 rejected promise，避免后续代码执行
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        // 尝试解析错误信息
        let errorMsg = `Request failed with status ${response.status}`;
        try {
            const text = await response.text();
            if (text) {
                const data = JSON.parse(text);
                errorMsg = data.message || data.error || errorMsg;
            }
        } catch {}
        throw new Error(errorMsg);
    }

    return response;
} 