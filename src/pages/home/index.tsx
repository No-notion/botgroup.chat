import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { request } from '@/utils/request';
import { useUserStore } from '@/store/userStore';
import { useInitStore } from '@/store/initStore';
import { getAvatarData } from '@/utils/avatar';
import { MessageCircle, Users, Compass, Settings, ChevronRight, Search, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AICharacter } from "@/config/aiCharacters";

// 懒加载 Tab 组件，减少初始加载
const ContactsTab = lazy(() => import('./ContactsTab'));
const DiscoverTab = lazy(() => import('./DiscoverTab'));
const SettingsTab = lazy(() => import('./SettingsTab'));

// Tab 加载占位
function TabLoader() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-6 h-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
    </div>
  );
}

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  isGroupDiscussionMode: boolean;
}

interface HomeData {
  groups: Group[];
  characters: AICharacter[];
  user: any;
}

const filterScheduler = (characters: AICharacter[]) => {
  return characters.filter(c => c.personality !== 'sheduler');
};

const getGroupEmoji = (id: string) => {
  if (id.includes('tech')) return '💻';
  if (id.includes('family')) return '👨‍👩‍👧‍👦';
  if (id.includes('work')) return '🏢';
  if (id.includes('wealth')) return '💰';
  if (id.includes('mature')) return '💋';
  if (id.includes('complain')) return '😫';
  if (id.includes('praise')) return '🌸';
  if (id.includes('mental')) return '💚';
  if (id.includes('book')) return '📚';
  if (id.includes('movie')) return '🎬';
  if (id.includes('life')) return '💡';
  if (id.includes('english')) return '🌍';
  if (id.includes('time')) return '⏰';
  if (id.includes('crypto')) return '₿';
  if (id.includes('indicator')) return '📊';
  if (id.includes('hypnosis')) return '🌙';
  return '💬';
};

export default function HomePage() {
  const navigate = useNavigate();
  const userStore = useUserStore();
  const initStore = useInitStore();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<HomeData | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 优先使用缓存
      if (initStore.initData) {
        setData(initStore.initData as HomeData);
        setIsLoading(false);
        return;
      }
      const response = await request('/api/init');
      if (!response.ok) throw new Error('加载数据失败');
      const result = await response.json();
      setData(result.data);
      initStore.setInitData(result.data);
      if (result.data.user) {
        userStore.setUserInfo(result.data.user);
      }
    } catch (error: any) {
      console.error('加载数据失败:', error);
      // 如果是认证错误，跳转到登录页
      if (error?.message === 'Unauthorized') {
        window.location.href = '/login';
        return;
      }
      // 其他错误，设置空数据避免无限 loading
      setData({ groups: [], characters: [], user: null });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('请输入群名');
      return;
    }
    setCreating(true);
    try {
      const response = await request('/api/groups/create', {
        method: 'POST',
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc.trim()
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('创建成功');
        setShowCreateDialog(false);
        setGroupName('');
        setGroupDesc('');
        // 清除缓存并重新加载
        initStore.setInitData(null);
        fetchData();
      } else {
        toast.error(result.message || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败，请重试');
    }
    setCreating(false);
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroupId) return;
    setDeleting(true);
    try {
      const response = await request('/api/groups/delete', {
        method: 'POST',
        body: JSON.stringify({ groupId: deletingGroupId })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('群聊已删除');
        setShowDeleteDialog(false);
        setDeletingGroupId(null);
        // 清除缓存并重新加载
        initStore.setInitData(null);
        fetchData();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败，请重试');
    }
    setDeleting(false);
  };

  const openDeleteDialog = (groupId: string) => {
    // 只有用户创建的群组才能删除（以 'group-' 开头）
    if (!groupId.startsWith('group-')) {
      toast.error('系统群聊无法删除');
      return;
    }
    setDeletingGroupId(groupId);
    setShowDeleteDialog(true);
  };

  const handleGroupClick = (groupId: string) => {
    const groupIndex = data?.groups.findIndex(g => g.id === groupId) ?? 0;
    navigate(`/group/${groupIndex}`);
  };

  const handleCharacterClick = (characterId: string) => {
    navigate(`/chat/${characterId}`);
  };

  if (isLoading || !data) {
    return (
      <div className="fixed inset-0 bg-[#ededed] dark:bg-background flex items-center justify-center">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  const groups = data.groups;
  const characters = filterScheduler(data.characters);

  const tabs = [
    { icon: MessageCircle, label: '微信' },
    { icon: Users, label: '通讯录' },
    { icon: Compass, label: '发现' },
    { icon: Settings, label: '我' },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-[#ededed] dark:bg-background max-w-lg mx-auto">
      {/* Header */}
      <div className="flex-none bg-[#ededed] dark:bg-background">
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <h1 className="text-lg font-semibold text-foreground">
            {tabs[activeTab].label}
          </h1>
          <div className="flex items-center gap-3">
            <Plus
              className="w-5 h-5 text-muted-foreground cursor-pointer"
              onClick={() => setShowCreateDialog(true)}
            />
            <Search className="w-5 h-5 text-muted-foreground cursor-pointer" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 0 && (
          <ChatList
            groups={groups}
            characters={characters}
            onGroupClick={handleGroupClick}
            onCharacterClick={handleCharacterClick}
            onDeleteGroup={openDeleteDialog}
          />
        )}
        {activeTab === 1 && (
          <Suspense fallback={<TabLoader />}>
            <ContactsTab
              characters={characters}
              onCharacterClick={handleCharacterClick}
            />
          </Suspense>
        )}
        {activeTab === 2 && (
          <Suspense fallback={<TabLoader />}>
            <DiscoverTab characters={characters} onCharacterClick={handleCharacterClick} />
          </Suspense>
        )}
        {activeTab === 3 && (
          <Suspense fallback={<TabLoader />}>
            <SettingsTab />
          </Suspense>
        )}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建群聊</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">群名称</label>
              <Input
                placeholder="给你的群聊起个名字"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={30}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">群描述（选填）</label>
              <Input
                placeholder="简单描述一下这个群"
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                maxLength={100}
              />
            </div>
            <Button
              onClick={handleCreateGroup}
              disabled={creating || !groupName.trim()}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
            >
              {creating ? (
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : null}
              创建群聊
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除群聊</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              确定要删除这个群聊吗？删除后无法恢复。
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleDeleteGroup}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                {deleting ? (
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : null}
                确认删除
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Tab Bar */}
      <div className="flex-none bg-[#f7f7f7] dark:bg-card border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`flex-1 flex flex-col items-center py-1.5 transition-colors ${
                  activeTab === index
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Tab 1: Chat list - WeChat style
function ChatList({ groups, characters, onGroupClick, onCharacterClick, onDeleteGroup }: {
  groups: Group[];
  characters: AICharacter[];
  onGroupClick: (id: string) => void;
  onCharacterClick: (id: string) => void;
  onDeleteGroup: (id: string) => void;
}) {
  const charMap = new Map(characters.map(c => [c.id, c]));

  // Build chat items: groups first, then individual characters
  const chatItems = [
    ...groups.map(group => {
      const memberNames = group.members
        .slice(0, 3)
        .map(id => charMap.get(id)?.name || '')
        .filter(Boolean)
        .join('、');
      return {
        id: group.id,
        type: 'group' as const,
        name: group.name,
        desc: group.description || `${group.members.length}位成员`,
        lastMsg: memberNames ? `${memberNames}等在聊天` : '暂无消息',
        time: '',
        avatarContent: getGroupEmoji(group.id),
        memberCount: group.members.length,
        canDelete: group.id.startsWith('group-'), // 只有用户创建的群可以删除
      };
    }),
    ...characters.slice(0, 5).map(char => ({
      id: char.id,
      type: 'private' as const,
      name: char.name,
      desc: char.tags?.join('·') || '',
      lastMsg: char.tags?.[0] || '在线',
      time: '',
      avatarContent: null,
      avatar: char.avatar,
      canDelete: false,
    })),
  ];

  return (
    <ScrollArea className="h-full">
      <div className="bg-white dark:bg-card">
        {chatItems.map((item) => (
          <div
            key={item.id}
            onClick={() => item.type === 'group' ? onGroupClick(item.id) : onCharacterClick(item.id)}
            className="flex items-center px-4 py-3 active:bg-gray-100 dark:active:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800"
          >
            {/* Avatar */}
            {item.type === 'group' ? (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-2xl flex-none">
                {item.avatarContent}
              </div>
            ) : item.avatar ? (
              <Avatar className="w-12 h-12 flex-none">
                <AvatarImage src={item.avatar} />
                <AvatarFallback style={{ backgroundColor: getAvatarData(item.name).backgroundColor, color: 'white' }}>
                  {item.name[0]}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="w-12 h-12 flex-none">
                <AvatarFallback style={{ backgroundColor: getAvatarData(item.name).backgroundColor, color: 'white' }}>
                  {item.name[0]}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Content */}
            <div className="flex-1 ml-3 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-foreground truncate">{item.name}</span>
                <span className="text-[10px] text-muted-foreground flex-none ml-2">{item.time}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{item.lastMsg}</p>
            </div>

            {item.type === 'group' && item.memberCount > 0 && (
              <span className="text-[10px] text-muted-foreground bg-gray-100 dark:bg-gray-800 rounded-full px-1.5 py-0.5 ml-2 flex-none">
                {item.memberCount}
              </span>
            )}

            {/* Delete button for user-created groups */}
            {item.canDelete && (
              <Trash2
                className="w-4 h-4 text-gray-400 hover:text-red-500 ml-2 flex-none cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGroup(item.id);
                }}
              />
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
