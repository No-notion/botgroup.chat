import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Sparkles,
  Tag,
  MessageSquare,
  Settings,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { request } from '@/utils/request';
import { modelConfigs, type AICharacter } from '@/config/aiCharacters';

interface CharacterManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onCharactersChange?: () => void;
}

interface CustomCharacter extends AICharacter {
  isCustom?: boolean;
  isSystem?: boolean;
  is_public?: boolean;
}

const emptyCharacter: Partial<CustomCharacter> = {
  name: '',
  description: '',
  personality: '',
  scenario: '',
  first_mes: '',
  mes_example: '',
  model: 'deepseek-v3.2',
  avatar: '',
  tags: [],
  system_prompt: '',
  post_history_instructions: '',
  alternate_greetings: [],
  creator_notes: '',
  creator: '',
  character_version: '',
  is_public: false
};

export const CharacterManager: React.FC<CharacterManagerProps> = ({
  isOpen,
  onClose,
  onCharactersChange
}) => {
  const [characters, setCharacters] = useState<CustomCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<CustomCharacter | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CustomCharacter>>(emptyCharacter);
  const [newTag, setNewTag] = useState('');
  const [newGreeting, setNewGreeting] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadCharacters();
    }
  }, [isOpen]);

  const loadCharacters = async () => {
    try {
      const response = await request('/api/characters');
      const data = await response.json();
      if (data.success) {
        setCharacters(data.data.characters || []);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  };

  const handleCreateNew = () => {
    setSelectedCharacter(null);
    setEditForm({ ...emptyCharacter });
    setIsEditing(true);
    setActiveTab('basic');
  };

  const handleEdit = (character: CustomCharacter) => {
    setSelectedCharacter(character);
    setEditForm({ ...character });
    setIsEditing(true);
    setActiveTab('basic');
  };

  const handleDelete = async (character: CustomCharacter) => {
    if (!confirm(`确定要删除角色 "${character.name}" 吗？`)) return;

    try {
      const response = await request(`/api/characters?id=${character.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('角色删除成功');
        loadCharacters();
        onCharactersChange?.();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleSave = async () => {
    if (!editForm.name || !editForm.model) {
      toast.error('请填写角色名称和选择模型');
      return;
    }

    setIsLoading(true);
    try {
      const response = await request('/api/characters', {
        method: 'POST',
        body: JSON.stringify(editForm)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('角色保存成功');
        setIsEditing(false);
        loadCharacters();
        onCharactersChange?.();
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('请选择 JSON 格式的角色卡片文件');
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      let cardJson;
      try {
        cardJson = JSON.parse(text);
      } catch {
        toast.error('文件格式错误，无法解析 JSON');
        setIsImporting(false);
        return;
      }

      const response = await request('/api/characters/import', {
        method: 'POST',
        body: JSON.stringify(cardJson)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || '导入成功');
        loadCharacters();
        onCharactersChange?.();
      } else {
        toast.error(data.message || '导入失败');
      }
    } catch (error) {
      toast.error('导入失败');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const currentTags = editForm.tags || [];
    if (!currentTags.includes(newTag.trim())) {
      setEditForm({ ...editForm, tags: [...currentTags, newTag.trim()] });
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setEditForm({
      ...editForm,
      tags: (editForm.tags || []).filter(t => t !== tag)
    });
  };

  const handleAddGreeting = () => {
    if (!newGreeting.trim()) return;
    const current = editForm.alternate_greetings || [];
    setEditForm({ ...editForm, alternate_greetings: [...current, newGreeting.trim()] });
    setNewGreeting('');
  };

  const handleRemoveGreeting = (index: number) => {
    setEditForm({
      ...editForm,
      alternate_greetings: (editForm.alternate_greetings || []).filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-500" />
            角色管理
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[70vh]">
          {/* 左侧角色列表 */}
          <div className="w-1/3 border-r">
            <div className="p-4 border-b flex justify-between items-center">
              <span className="font-medium">所有角色</span>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                  {isImporting ? (
                    <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Upload className="w-4 h-4 mr-1" />
                  )}
                  导入
                </Button>
                <Button size="sm" onClick={handleCreateNew}>
                  <Plus className="w-4 h-4 mr-1" />
                  新建
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="p-2 space-y-1">
                {characters.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    加载中...
                  </div>
                ) : (
                  characters.map((character) => (
                    <div
                      key={character.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCharacter?.id === character.id
                          ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => {
                        setSelectedCharacter(character);
                        if (isEditing) {
                          setEditForm({ ...character });
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {character.avatar ? (
                            <img src={character.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <Sparkles className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {character.name}
                              {character.isSystem && !character.isCustom && (
                                <Badge variant="outline" className="text-xs">预设</Badge>
                              )}
                              {character.isCustom && character.isSystem && (
                                <Badge variant="secondary" className="text-xs">已修改</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {character.model}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(character);
                            }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          {character.isCustom && !character.isSystem && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(character);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {character.tags && character.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {character.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {character.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{character.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧编辑区域 */}
          <div className="flex-1 flex flex-col">
            {!isEditing ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                {selectedCharacter ? (
                  <div className="text-center p-6">
                    <div className="text-4xl mb-4">
                      {selectedCharacter.avatar ? (
                        <img 
                          src={selectedCharacter.avatar} 
                          className="w-20 h-20 rounded-full mx-auto object-cover" 
                          alt="" 
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                          <Sparkles className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{selectedCharacter.name}</h3>
                    <p className="text-sm mb-1 text-muted-foreground">{selectedCharacter.personality}</p>
                    {selectedCharacter.description && (
                      <p className="text-sm mb-4 line-clamp-3">{selectedCharacter.description}</p>
                    )}
                    <Button onClick={() => handleEdit(selectedCharacter)}>
                      <Edit className="w-4 h-4 mr-2" />
                      编辑角色
                    </Button>
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>选择一个角色查看详情，或创建新角色</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <TabsList className="mx-6 mt-4">
                    <TabsTrigger value="basic">
                      <Settings className="w-4 h-4 mr-1" />
                      基本信息
                    </TabsTrigger>
                    <TabsTrigger value="prompt">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      提示词
                    </TabsTrigger>
                    <TabsTrigger value="advanced">
                      <Sparkles className="w-4 h-4 mr-1" />
                      高级设置
                    </TabsTrigger>
                  </TabsList>

                  <ScrollArea className="flex-1 px-6 py-4">
                    {/* 基本信息 */}
                    <TabsContent value="basic" className="space-y-4 mt-0">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">角色名称 *</Label>
                          <Input
                            id="name"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="输入角色名称"
                          />
                        </div>
                        <div>
                          <Label htmlFor="model">选择模型 *</Label>
                          <Select
                            value={editForm.model}
                            onValueChange={(value) => setEditForm({ ...editForm, model: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择模型" />
                            </SelectTrigger>
                            <SelectContent>
                              {modelConfigs.map((config) => (
                                <SelectItem key={config.model} value={config.model}>
                                  {config.model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="avatar">头像URL</Label>
                        <Input
                          id="avatar"
                          value={editForm.avatar || ''}
                          onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                          placeholder="输入头像图片URL"
                        />
                        {editForm.avatar && (
                          <img 
                            src={editForm.avatar} 
                            className="w-12 h-12 rounded-full mt-2 object-cover" 
                            alt="预览" 
                          />
                        )}
                      </div>

                      <div>
                        <Label htmlFor="personality">性格描述</Label>
                        <Input
                          id="personality"
                          value={editForm.personality || ''}
                          onChange={(e) => setEditForm({ ...editForm, personality: e.target.value })}
                          placeholder="简短描述角色性格"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">角色描述 *</Label>
                        <Textarea
                          id="description"
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="角色的详细描述，定义角色的身份、行为和回复风格"
                          rows={5}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          可用变量: #groupName# (群名)
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="scenario">场景设定</Label>
                        <Textarea
                          id="scenario"
                          value={editForm.scenario || ''}
                          onChange={(e) => setEditForm({ ...editForm, scenario: e.target.value })}
                          placeholder="角色所处的场景和背景设定"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          标签
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="添加标签"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                          />
                          <Button type="button" variant="outline" onClick={handleAddTag}>
                            添加
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(editForm.tags || []).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="gap-1">
                              {tag}
                              <X 
                                className="w-3 h-3 cursor-pointer" 
                                onClick={() => handleRemoveTag(tag)}
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    {/* 提示词设置 */}
                    <TabsContent value="prompt" className="space-y-4 mt-0">
                      <div>
                        <Label htmlFor="first_mes">开场白 (first_mes)</Label>
                        <Textarea
                          id="first_mes"
                          value={editForm.first_mes || ''}
                          onChange={(e) => setEditForm({ ...editForm, first_mes: e.target.value })}
                          placeholder="角色发送的第一条消息"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="alternate_greetings">备选开场白</Label>
                        <div className="space-y-2 mb-2">
                          {(editForm.alternate_greetings || []).map((greeting, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Textarea
                                value={greeting}
                                onChange={(e) => {
                                  const greetings = [...(editForm.alternate_greetings || [])];
                                  greetings[index] = e.target.value;
                                  setEditForm({ ...editForm, alternate_greetings: greetings });
                                }}
                                rows={2}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive shrink-0"
                                onClick={() => handleRemoveGreeting(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={newGreeting}
                            onChange={(e) => setNewGreeting(e.target.value)}
                            placeholder="添加备选开场白"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddGreeting()}
                          />
                          <Button type="button" variant="outline" onClick={handleAddGreeting}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="mes_example">对话示例 (mes_example)</Label>
                        <Textarea
                          id="mes_example"
                          value={editForm.mes_example || ''}
                          onChange={(e) => setEditForm({ ...editForm, mes_example: e.target.value })}
                          placeholder="角色的对话风格示例，格式如：&lt;START&gt;\n{{user}}: 你好\n{{char}}: 你好啊！"
                          rows={5}
                        />
                      </div>

                      <div>
                        <Label htmlFor="system_prompt">系统提示词 (system_prompt)</Label>
                        <Textarea
                          id="system_prompt"
                          value={editForm.system_prompt || ''}
                          onChange={(e) => setEditForm({ ...editForm, system_prompt: e.target.value })}
                          placeholder="注入到系统消息中的额外指令"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="post_history_instructions">历史后指令 (post_history_instructions)</Label>
                        <Textarea
                          id="post_history_instructions"
                          value={editForm.post_history_instructions || ''}
                          onChange={(e) => setEditForm({ ...editForm, post_history_instructions: e.target.value })}
                          placeholder="在对话历史之后注入的指令，用于调整角色在长对话中的行为"
                          rows={3}
                        />
                      </div>
                    </TabsContent>

                    {/* 高级设置 */}
                    <TabsContent value="advanced" className="space-y-4 mt-0">
                      <div>
                        <Label htmlFor="creator">创作者</Label>
                        <Input
                          id="creator"
                          value={editForm.creator || ''}
                          onChange={(e) => setEditForm({ ...editForm, creator: e.target.value })}
                          placeholder="角色创作者名称"
                        />
                      </div>

                      <div>
                        <Label htmlFor="character_version">角色版本</Label>
                        <Input
                          id="character_version"
                          value={editForm.character_version || ''}
                          onChange={(e) => setEditForm({ ...editForm, character_version: e.target.value })}
                          placeholder="如 1.0.0"
                        />
                      </div>

                      <div>
                        <Label htmlFor="creator_notes">创作者备注</Label>
                        <Textarea
                          id="creator_notes"
                          value={editForm.creator_notes || ''}
                          onChange={(e) => setEditForm({ ...editForm, creator_notes: e.target.value })}
                          placeholder="对角色的使用建议和备注"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="character_book">角色书 (character_book)</Label>
                        <Textarea
                          id="character_book"
                          value={editForm.character_book || ''}
                          onChange={(e) => setEditForm({ ...editForm, character_book: e.target.value })}
                          placeholder="角色知识库 JSON，包含触发关键词和对应内容"
                          rows={5}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Character Card V2 格式的角色书 JSON
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>公开角色</Label>
                          <p className="text-xs text-muted-foreground">
                            其他用户也可以使用此角色
                          </p>
                        </div>
                        <Switch
                          checked={editForm.is_public || false}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, is_public: checked })}
                        />
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </Tabs>

                <DialogFooter className="px-6 py-4 border-t">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    取消
                  </Button>
                  <Button onClick={handleSave} disabled={isLoading}>
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CharacterManager;
