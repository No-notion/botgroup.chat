import React, { useState, useEffect } from 'react';
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
  GripVertical,
  Sparkles,
  Tag,
  MessageSquare,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { request } from '@/utils/request';
import { modelConfigs, type AICharacter } from '@/config/aiCharacters';

interface CharacterManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onCharactersChange?: () => void;
}

interface Stage {
  name: string;
  prompt: string;
}

interface CustomCharacter extends AICharacter {
  isCustom?: boolean;
  is_public?: boolean;
}

const emptyCharacter: Partial<CustomCharacter> = {
  name: '',
  personality: '',
  model: 'qwen-plus',
  avatar: '',
  custom_prompt: '',
  tags: [],
  stages: [],
  rag: false,
  knowledge: '',
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
  const [newStage, setNewStage] = useState<Stage>({ name: '', prompt: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // 加载自定义角色
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
      const isUpdate = selectedCharacter?.isCustom;
      const url = isUpdate 
        ? `/api/characters?id=${selectedCharacter.id}` 
        : '/api/characters';
      
      const response = await request(url, {
        method: isUpdate ? 'PUT' : 'POST',
        body: JSON.stringify(editForm)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(isUpdate ? '角色更新成功' : '角色创建成功');
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

  const handleAddStage = () => {
    if (!newStage.name.trim() || !newStage.prompt.trim()) return;
    const currentStages = editForm.stages || [];
    setEditForm({
      ...editForm,
      stages: [...currentStages, { ...newStage }]
    });
    setNewStage({ name: '', prompt: '' });
  };

  const handleRemoveStage = (index: number) => {
    setEditForm({
      ...editForm,
      stages: (editForm.stages || []).filter((_, i) => i !== index)
    });
  };

  const handleUpdateStage = (index: number, field: 'name' | 'prompt', value: string) => {
    const stages = [...(editForm.stages || [])];
    stages[index] = { ...stages[index], [field]: value };
    setEditForm({ ...editForm, stages });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            角色管理
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[70vh]">
          {/* 左侧角色列表 */}
          <div className="w-1/3 border-r">
            <div className="p-4 border-b flex justify-between items-center">
              <span className="font-medium">自定义角色</span>
              <Button size="sm" onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-1" />
                新建
              </Button>
            </div>
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="p-2 space-y-1">
                {characters.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    暂无自定义角色
                  </div>
                ) : (
                  characters.map((character) => (
                    <div
                      key={character.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCharacter?.id === character.id
                          ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedCharacter(character)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {character.avatar && (
                            <img src={character.avatar} className="w-8 h-8 rounded-full" alt="" />
                          )}
                          <div>
                            <div className="font-medium">{character.name}</div>
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
                    <p className="text-sm mb-4">{selectedCharacter.personality}</p>
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
                        <Label htmlFor="custom_prompt">自定义提示词</Label>
                        <Textarea
                          id="custom_prompt"
                          value={editForm.custom_prompt || ''}
                          onChange={(e) => setEditForm({ ...editForm, custom_prompt: e.target.value })}
                          placeholder="输入角色的自定义提示词，定义角色的行为和回复风格"
                          rows={6}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          可用变量: #groupName# (群名), #allTags# (所有标签)
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>对话阶段</Label>
                          <span className="text-xs text-muted-foreground">
                            用于游戏主持人等需要多阶段对话的角色
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex gap-2">
                            <Input
                              value={newStage.name}
                              onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                              placeholder="阶段名称"
                              className="w-32"
                            />
                            <Input
                              value={newStage.prompt}
                              onChange={(e) => setNewStage({ ...newStage, prompt: e.target.value })}
                              placeholder="阶段提示词"
                            />
                            <Button type="button" variant="outline" onClick={handleAddStage}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {(editForm.stages || []).map((stage, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded-lg mb-2">
                            <GripVertical className="w-4 h-4 mt-2 text-muted-foreground cursor-move" />
                            <div className="flex-1 space-y-2">
                              <Input
                                value={stage.name}
                                onChange={(e) => handleUpdateStage(index, 'name', e.target.value)}
                                placeholder="阶段名称"
                              />
                              <Input
                                value={stage.prompt}
                                onChange={(e) => handleUpdateStage(index, 'prompt', e.target.value)}
                                placeholder="阶段提示词"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleRemoveStage(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* 高级设置 */}
                    <TabsContent value="advanced" className="space-y-4 mt-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>RAG 知识库</Label>
                          <p className="text-xs text-muted-foreground">
                            启用后角色将使用知识库增强回答
                          </p>
                        </div>
                        <Switch
                          checked={editForm.rag || false}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, rag: checked })}
                        />
                      </div>

                      {editForm.rag && (
                        <div>
                          <Label htmlFor="knowledge">知识库名称</Label>
                          <Input
                            id="knowledge"
                            value={editForm.knowledge || ''}
                            onChange={(e) => setEditForm({ ...editForm, knowledge: e.target.value })}
                            placeholder="输入知识库名称"
                          />
                        </div>
                      )}

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
