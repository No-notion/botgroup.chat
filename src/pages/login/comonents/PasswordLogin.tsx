import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { request } from '@/utils/request';
import { useIsMobile } from '@/hooks/use-mobile';

interface PasswordLoginProps {
  handleLoginSuccess: (token: string) => void;
}

const PasswordLogin: React.FC<PasswordLoginProps> = ({ handleLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();

  // 获取备案号配置
  const icpNumber = (window as any).APP_CONFIG?.ICP_NUMBER;

  // 提交登录
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('请输入用户名和密码');
      return;
    }

    setIsLoading(true);
    try {
      const response = await request(`/api/auth/password/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.message || '登录失败');
        return;
      }

      // 执行登录成功回调
      handleLoginSuccess(data.data.token);
      
    } catch (error) {
      console.error('登录失败:', error);
      toast.error(error instanceof Error ? error.message : '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className={`w-full ${isMobile ? 'max-w-sm px-6' : 'max-w-md px-8'} ${isMobile ? 'py-6' : 'py-8'}`}>
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <span 
            style={{fontFamily: 'Audiowide, system-ui', color: '#ff6600'}} 
            className={`${isMobile ? 'text-2xl' : 'text-3xl'} ml-2`}
          >
            botgroup.chat
          </span>
        </div>
        <div className={`text-gray-500 ${isMobile ? 'mb-6' : 'mb-4'} text-center ${isMobile ? 'text-sm' : 'text-base'}`}>
          账户密码登录
        </div>
        <form onSubmit={handleSubmit} className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
          <div>
            <Input
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`border rounded-lg ${isMobile ? 'p-2.5' : 'p-3'} ${isMobile ? 'h-[42px]' : 'h-[46px]'} focus:border-[#ff6600] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none ${isMobile ? 'text-base' : 'text-base'}`}
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`border rounded-lg ${isMobile ? 'p-2.5' : 'p-3'} ${isMobile ? 'h-[42px]' : 'h-[46px]'} focus:border-[#ff6600] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none ${isMobile ? 'text-base' : 'text-base'}`}
            />
          </div>
          <Button
            type="submit"
            className={`w-full bg-[#ff6600] hover:bg-[#e65c00] text-white rounded-lg ${isMobile ? 'py-2.5 text-sm' : 'py-3 text-base'}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : '登录'}
          </Button>
        </form>
        {/* 备案号显示 */}
        {icpNumber && (
          <div className={`text-center ${isMobile ? 'mt-6' : 'mt-8'} text-xs text-gray-400`}>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">{icpNumber}</a>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordLogin;
