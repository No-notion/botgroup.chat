import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserPlus, Mic, MicOff, X, Check, Pencil, Save } from 'lucide-react';
import { type AICharacter } from "@/config/aiCharacters";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { request } from '@/utils/request';
import { useState } from 'react';

interface User {
  id: number | string;
  name: string;
  avatar?: string;
}

interface MembersManagementProps {
  showMembers: boolean;
  setShowMembers: (show: boolean) => void;
  users: (User | AICharacter)[];
  mutedUsers: string[];
  handleToggleMute: (userId: string) => void;
  getAvatarData: (name: string) => { backgroundColor: string; text: string };
  isGroupDiscussionMode: boolean;
  onToggleGroupDiscussion: () => void;
  groupId?: string;
  groupName?: string;
  allCharacters?: AICharacter[];
  onMembersChange?: () => void;
  onGroupNameChange?: (name: string) => void;
  maxInteractionDepth?: number;
  onInteractionDepthChange?: (depth: number) => void;
  randomSpeakMode?: boolean;
  onRandomSpeakModeChange?: (enabled: boolean) => void;
  autoSpeakMode?: boolean;
  onAutoSpeakModeChange?: (enabled: boolean) => void;
  isPrivateChat?: boolean;
}

export const MembersManagement = ({
  showMembers,
  setShowMembers,
  users,
  mutedUsers,
  handleToggleMute,
  getAvatarData,
  isGroupDiscussionMode,
  onToggleGroupDiscussion,
  groupId,
  groupName = '',
  allCharacters = [],
  onMembersChange,
  onGroupNameChange,
  maxInteractionDepth = 2,
  onInteractionDepthChange,
  randomSpeakMode = false,
  onRandomSpeakModeChange,
  autoSpeakMode = false,
  onAutoSpeakModeChange,
  isPrivateChat = false
}: MembersManagementProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(groupName);

  const availableCharacters = allCharacters.filter(
    char => !users.find(u => u.id === char.id)
  );

  const filteredCharacters = availableCharacters.filter(char =>
    char.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (char.tags && char.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleSaveGroupName = async () => {
    if (!groupId || !newGroupName.trim()) return;
    try {
      const response = await request(`/api/groups/${groupId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newGroupName.trim() })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('群名修改成功');
        onGroupNameChange?.(newGroupName.trim());
        setEditingName(false);
      } else {
        toast.error(data.message || '修改失败');
      }
    } catch {
      toast.error('修改群名失败');
    }
  };

  const handleAddMember = async (characterId: string) => {
    if (!groupId) {
      toast.error('群组ID缺失');
      return;
    }

    setIsLoading(true);
    try {
      const response = await request(`/api/groups/${groupId}`, {
        method: 'POST',
        body: JSON.stringify({ characterId })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('成员添加成功');
        setShowAddDialog(false);
        onMembersChange?.();
      } else {
        toast.error(data.message || '添加失败');
      }
    } catch (error) {
      toast.error('添加失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (characterId: string) => {
    if (!groupId) {
      toast.error('群组ID缺失');
      return;
    }

    if (!confirm('确定要移除该成员吗？')) return;

    setIsLoading(true);
    try {
      const response = await request(`/api/groups/${groupId}?characterId=${characterId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('成员移除成功');
        onMembersChange?.();
      } else {
        toast.error(data.message || '移除失败');
      }
    } catch (error) {
      toast.error('移除失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Sheet open={showMembers} onOpenChange={setShowMembers}>
        <SheetContent side="right" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>群聊配置</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {/* 群名修改 */}
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground mb-2">群名称</div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="h-8 text-sm"
                    maxLength={30}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveGroupName()}
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={handleSaveGroupName} className="h-8 px-2">
                    <Save className="w-4 h-4 text-green-500" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setNewGroupName(groupName); }} className="h-8 px-2">
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => { setEditingName(true); setNewGroupName(groupName); }}>
                  <span className="text-sm font-medium">{groupName}</span>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>

            <div className="mb-6 p-4 bg-muted rounded-lg space-y-4">
              {/* 全员讨论模式 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">全员讨论模式</div>
                  <div className="text-xs text-muted-foreground">开启后全员回复讨论</div>
                </div>
                <Switch
                  checked={isGroupDiscussionMode}
                  onCheckedChange={onToggleGroupDiscussion}
                />
              </div>
              
              {/* 互动深度设置 */}
              {!isGroupDiscussionMode && (
                <div className="pt-2 border-t space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm">角色互动深度</div>
                        <div className="text-xs text-muted-foreground">角色之间互相回复的轮次</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {[0, 1, 2, 3, 4, 5].map(depth => (
                        <Button
                          key={depth}
                          variant={maxInteractionDepth === depth ? "default" : "outline"}
                          size="sm"
                          onClick={() => onInteractionDepthChange?.(depth)}
                          className={maxInteractionDepth === depth ? "bg-[#07C160] hover:bg-[#06AD56]" : ""}
                        >
                          {depth === 0 ? '无' : depth}
                        </Button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      当前：{maxInteractionDepth === 0 ? '无互动' : `${maxInteractionDepth}轮互动`}
                    </div>
                  </div>
                  
                  {/* 随机发言模式 */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <div className="text-sm">随机发言模式</div>
                      <div className="text-xs text-muted-foreground">未选中的角色也有概率发言</div>
                    </div>
                    <Switch
                      checked={randomSpeakMode}
                      onCheckedChange={onRandomSpeakModeChange}
                    />
                  </div>

                  {/* 主动发言/引导 */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <div className="text-sm">{isPrivateChat ? '主动引导' : '陌生随机发言'}</div>
                      <div className="text-xs text-muted-foreground">
                        {isPrivateChat ? '角色主动引导对话，增强互动体验' : 'AI角色随机主动发言，无需用户触发'}
                      </div>
                    </div>
                    <Switch
                      checked={autoSpeakMode}
                      onCheckedChange={onAutoSpeakModeChange}
                    />
                  </div>
                </div>
              )}
            </div>
            {/* 私聊模式下单独显示主动引导开关 */}
            {isPrivateChat && isGroupDiscussionMode && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm">主动引导</div>
                    <div className="text-xs text-muted-foreground">角色主动发起对话，引导互动</div>
                  </div>
                  <Switch
                    checked={autoSpeakMode}
                    onCheckedChange={onAutoSpeakModeChange}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-muted-foreground">当前成员（{users.length}）</span>
              <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                添加成员
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-150px)]">
              <div className="space-y-2 pr-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {'avatar' in user && user.avatar ? (
                          <AvatarImage src={user.avatar} className="w-10 h-10" />
                        ) : (
                          <AvatarFallback style={{ backgroundColor: getAvatarData(user.name).backgroundColor, color: 'white' }}>
                            {user.name[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        {mutedUsers.includes(user.id as string) && (
                          <span className="text-xs text-red-500">已禁言</span>
                        )}
                      </div>
                    </div>
                    {user.name !== "我" && (
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleMute(user.id as string)}
                              >
                                {mutedUsers.includes(user.id as string) ? (
                                  <MicOff className="w-4 h-4 text-red-500" />
                                ) : (
                                  <Mic className="w-4 h-4 text-green-500" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {mutedUsers.includes(user.id as string) ? '取消禁言' : '禁言'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleRemoveMember(user.id as string)}
                                disabled={isLoading}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>移除成员</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* 添加成员对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加成员</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="搜索角色名称或标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredCharacters.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {searchTerm ? '未找到匹配的角色' : '所有角色已在群组中'}
                  </div>
                ) : (
                  filteredCharacters.map((char) => (
                    <div
                      key={char.id}
                      className="flex items-center justify-between p-3 hover:bg-accent rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {char.avatar ? (
                          <img src={char.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                        ) : (
                          <Avatar>
                            <AvatarFallback style={{ backgroundColor: getAvatarData(char.name).backgroundColor, color: 'white' }}>
                              {char.name[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div>
                          <div className="font-medium">{char.name}</div>
                          <div className="text-xs text-muted-foreground">{char.model}</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddMember(char.id)}
                        disabled={isLoading}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 
