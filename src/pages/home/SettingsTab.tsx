import React, { useState, lazy, Suspense } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserStore } from '@/store/userStore';
import { getAvatarData } from '@/utils/avatar';
import { ChevronRight, Bell, Shield, Palette, HelpCircle, Info, LogOut, Sparkles, User, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { request } from '@/utils/request';
import { toast } from 'sonner';

// 懒加载 CharacterManager（仅在使用时加载）
const CharacterManager = lazy(() => import('@/pages/chat/components/CharacterManager'));

export default function SettingsTab() {
  const userStore = useUserStore();
  const navigate = useNavigate();
  const userInfo = userStore.userInfo;
  const [showCharacterManager, setShowCharacterManager] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editNickname, setEditNickname] = useState(userInfo?.nickname || '');
  const [editAvatar, setEditAvatar] = useState(userInfo?.avatar_url || '');
  const [editBio, setEditBio] = useState(userInfo?.bio || '');
  const [editOccupation, setEditOccupation] = useState(userInfo?.occupation || '');
  const [editInterests, setEditInterests] = useState(userInfo?.interests || '');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!editNickname.trim()) {
      toast.error('昵称不能为空');
      return;
    }
    setSaving(true);
    try {
      const response = await request('/api/user/update', {
        method: 'POST',
        body: JSON.stringify({
          nickname: editNickname.trim(),
          avatar_url: editAvatar.trim() || null,
          bio: editBio.trim() || null,
          occupation: editOccupation.trim() || null,
          interests: editInterests.trim() || null,
        })
      });
      const result = await response.json();
      if (result.success) {
        userStore.setUserInfo({
          ...userInfo,
          nickname: editNickname.trim(),
          avatar_url: editAvatar.trim() || null,
          bio: editBio.trim(),
          occupation: editOccupation.trim(),
          interests: editInterests.trim(),
        });
        toast.success('保存成功');
        setShowProfileEdit(false);
      } else {
        toast.error(result.message || '保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    }
    setSaving(false);
  };

  const menuItems = [
    { icon: Sparkles, label: '角色管理', color: 'bg-purple-500', onClick: () => setShowCharacterManager(true) },
    { icon: Bell, label: '消息通知', color: 'bg-red-500' },
    { icon: Shield, label: '隐私', color: 'bg-blue-500' },
    { icon: Palette, label: '通用', color: 'bg-green-500' },
    { icon: HelpCircle, label: '帮助与反馈', color: 'bg-orange-500' },
    { icon: Info, label: '关于', color: 'bg-gray-500' },
  ];

  return (
    <div className="h-full overflow-auto">
      {/* Profile card */}
      <div className="bg-white dark:bg-card">
        <div
          onClick={() => {
            setEditNickname(userInfo?.nickname || '');
            setEditAvatar(userInfo?.avatar_url || '');
            setShowProfileEdit(true);
          }}
          className="flex items-center px-4 py-5 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 border-b border-gray-100 dark:border-gray-800"
        >
          <Avatar className="w-16 h-16 flex-none">
            {userInfo?.avatar_url ? (
              <AvatarImage src={userInfo.avatar_url} />
            ) : null}
            <AvatarFallback className="bg-green-500 text-white text-2xl">
              {userInfo?.nickname?.[0] || '我'}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 flex-1">
            <h2 className="text-lg font-medium text-foreground">{userInfo?.nickname || '用户'}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">微信号：AI群聊用户</p>
            <p className="text-xs text-muted-foreground mt-0.5">点击编辑个人信息</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-none" />
        </div>
      </div>

      {/* Menu items */}
      <div className="bg-white dark:bg-card mt-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              onClick={item.onClick}
              className="flex items-center px-4 py-3 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 border-b border-gray-100 dark:border-gray-800"
            >
              <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center flex-none`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="ml-3 flex-1 text-sm">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-none" />
            </div>
          );
        })}
      </div>

      {/* Logout */}
      <div className="bg-white dark:bg-card mt-2">
        <div
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="flex items-center justify-center py-3 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800"
        >
          <LogOut className="w-4 h-4 text-red-500 mr-2" />
          <span className="text-sm text-red-500">退出登录</span>
        </div>
      </div>

      <div className="h-8" />

      {/* Profile Edit Dialog */}
      <Dialog open={showProfileEdit} onOpenChange={setShowProfileEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑个人信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex justify-center">
              <Avatar className="w-20 h-20">
                {editAvatar ? (
                  <AvatarImage src={editAvatar} />
                ) : null}
                <AvatarFallback className="bg-green-500 text-white text-2xl">
                  {editNickname?.[0] || '我'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">昵称</label>
              <Input
                placeholder="输入昵称"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                maxLength={20}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">头像URL（选填）</label>
              <Input
                placeholder="输入头像图片URL"
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">职业（选填）</label>
              <Input
                placeholder="如：程序员、教师、学生等"
                value={editOccupation}
                onChange={(e) => setEditOccupation(e.target.value)}
                maxLength={30}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">兴趣爱好（选填）</label>
              <Input
                placeholder="如：阅读、游戏、旅行等"
                value={editInterests}
                onChange={(e) => setEditInterests(e.target.value)}
                maxLength={50}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">个人简介（选填）</label>
              <Input
                placeholder="一句话介绍自己"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={100}
              />
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={saving || !editNickname.trim()}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
            >
              {saving ? (
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showCharacterManager && (
        <Suspense fallback={null}>
          <CharacterManager
            isOpen={showCharacterManager}
            onClose={() => setShowCharacterManager(false)}
            onCharactersChange={() => {}}
          />
        </Suspense>
      )}
    </div>
  );
}
