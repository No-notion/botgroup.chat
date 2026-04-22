import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Share2, Settings2, ChevronLeft, ArrowLeft, Search, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { request } from '@/utils/request';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

import type { AICharacter } from "@/config/aiCharacters";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { SharePoster } from '@/pages/chat/components/SharePoster';
import { MembersManagement } from '@/pages/chat/components/MembersManagement';
import Sidebar from './Sidebar';
import { AdBanner, AdBannerMobile } from './AdSection';
import { useUserStore } from '@/store/userStore';
import { useInitStore } from '@/store/initStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { getAvatarData } from '@/utils/avatar';


// 修改 KaTeXStyle 组件
const KaTeXStyle = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    /* 只在聊天消息内应用 KaTeX 样式 */
    .chat-message .katex-html {
      display: none;
    }
    
    .chat-message .katex {
      font: normal 1.1em KaTeX_Main, Times New Roman, serif;
      line-height: 1.2;
      text-indent: 0;
      white-space: nowrap;
      text-rendering: auto;
    }
    
    .chat-message .katex-display {
      display: block;
      margin: 1em 0;
      text-align: center;
    }
    
    /* 其他必要的 KaTeX 样式 */
    @import "katex/dist/katex.min.css";
  `}} />
);


const ChatUI = () => {
  const userStore = useUserStore();
  const initStore = useInitStore();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { id: groupId, characterId } = useParams<{ id?: string; characterId?: string }>();

  // 判断是群聊还是私聊模式
  const isPrivateChat = !!characterId;
  
  // 1. 所有的 useState 声明
  const [groups, setGroups] = useState([]);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(groupId ? parseInt(groupId) : 0);
  const [group, setGroup] = useState(null);
  const [groupAiCharacters, setGroupAiCharacters] = useState([]);
  const [privateChatCharacter, setPrivateChatCharacter] = useState<AICharacter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGroupDiscussionMode, setIsGroupDiscussionMode] = useState(false);
  const [maxInteractionDepth, setMaxInteractionDepth] = useState(2);
  const [randomSpeakMode, setRandomSpeakMode] = useState(false);
  const [autoSpeakMode, setAutoSpeakMode] = useState(false);
  const autoSpeakTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 用于中断正在进行的AI回复循环
  const pendingAbortRef = useRef(false);
  const [users, setUsers] = useState([]);
  const [allNames, setAllNames] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showAd, setShowAd] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [pendingContent, setPendingContent] = useState("");
  const [initError, setInitError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [showPoster, setShowPoster] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const oldestMsgIdRef = useRef<number | null>(null);
  const isLoadingHistoryRef = useRef(false);
  const chatGroupIdRef = useRef<string>('');
  const historyLoadedForRef = useRef<string>('');

  // 根据设备类型设置侧边栏默认状态
  useEffect(() => {
    if (isMobile !== undefined) {
      setSidebarOpen(!isMobile);
    }
  }, [isMobile]);

  // 2. 所有的 useRef 声明
  const currentMessageRef = useRef<number | null>(null);
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedContentRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const abortController = useRef(new AbortController());
  // 用于判断用户是否在底部附近，决定是否自动滚动
  const isNearBottomRef = useRef(true);
  // 用于判断是否是用户自己发送的消息
  const isUserMessageRef = useRef(false);

  // 添加一个 ref 来跟踪是否用户信息已请求
  const userInfoFetchedRef = useRef(false);

  // 用 ref 追踪当前群组标识，避免 userStore 变化导致重新初始化
  const prevGroupKeyRef = useRef<string>('');

  // 3. 所有的 useEffect
  useEffect(() => {
    // 只在群组/角色实际变化时才重新初始化，userStore 变化不应触发
    const groupKey = `${groupId}-${characterId}-${isPrivateChat}`;
    const isGroupChange = prevGroupKeyRef.current !== groupKey;
    if (!isGroupChange) return;
    prevGroupKeyRef.current = groupKey;

    const initData = async () => {
      try {
        // 从全局缓存获取 init 数据
        let data = initStore.initData;
        if (!data) {
          setIsInitializing(true);
          const response = await request(`/api/init`);
          if (!response.ok) {
            throw new Error('初始化数据失败');
          }
          const result = await response.json();
          data = result.data;
          initStore.setInitData(data);
        }

        // 设置用户信息（只请求一次）
        let avatar_url = userStore.userInfo?.avatar_url || null;
        let nickname = userStore.userInfo?.nickname || '我';
        if (data.user && data.user != null && !userInfoFetchedRef.current) {
          userInfoFetchedRef.current = true;
          const response1 = await request('/api/user/info');
          const userInfo = await response1.json();
          userStore.setUserInfo(userInfo.data);
          avatar_url = userInfo.data.avatar_url;
          nickname = userInfo.data.nickname;
        }

        // 私聊模式
        if (isPrivateChat && characterId) {
          const character = data.characters.find((c: AICharacter) => c.id === characterId);
          if (!character) {
            setInitError('角色不存在');
            setIsInitializing(false);
            return;
          }
          setPrivateChatCharacter(character);
          setGroupAiCharacters([character]);
          setAllNames([character.name, 'user']);
          setUsers([
            { id: 1, name: nickname, avatar: avatar_url },
            { id: character.id, name: character.name, avatar: character.avatar }
          ]);
          setGroups(data.groups);
        } else {
          // 群聊模式
          const groupIndex = groupId ? parseInt(groupId) : 0;
          const group = data.groups[groupIndex];
          if (!group) {
            setInitError('群聊不存在或无权访问');
            setIsInitializing(false);
            return;
          }
          
          const characters = data.characters;
          setGroups(data.groups);
          setGroup(group);
          setIsGroupDiscussionMode(group.isGroupDiscussionMode);
          
          const groupAiCharacters = characters
            .filter((character: AICharacter) => group.members.includes(character.id))
            .filter((character: AICharacter) => character.personality !== "sheduler")
            .sort((a: AICharacter, b: AICharacter) => {
              return group.members.indexOf(a.id) - group.members.indexOf(b.id);
            });
          setGroupAiCharacters(groupAiCharacters);
          const allNames = groupAiCharacters.map((character: AICharacter) => character.name);
          allNames.push('user');
          setAllNames(allNames);
          setUsers([
            { id: 1, name: nickname, avatar: avatar_url },
            ...groupAiCharacters
          ]);
        }
        
        setIsInitializing(false);
      } catch (error) {
        console.error("初始化数据失败:", error);
        setInitError('加载失败，请刷新重试');
        setIsInitializing(false);
      }
    };

    // 切换群时清空旧消息并显示加载
    setMessages([]);
    setMutedUsers([]);
    setInitError(null);
    // 重置历史加载标记，允许新群组加载历史
    historyLoadedForRef.current = '';
    // 有缓存数据时不需要 loading 转圈，无缓存时由 initData 内部设置
    if (initStore.initData) {
      setIsInitializing(false);
    }
    initData();
  }, [groupId, characterId, isPrivateChat]);

  // 计算 chatGroupId 并加载历史消息
  useEffect(() => {
    const chatGroupId = isPrivateChat && characterId
      ? `private-${characterId}`
      : group?.id || `group-${groupId || 0}`;
    chatGroupIdRef.current = chatGroupId;

    if (!userStore.userInfo?.id || userStore.userInfo.id === 0) return;
    if (!chatGroupId) return;
    // 避免重复加载同一个 group 的历史
    if (historyLoadedForRef.current === chatGroupId) return;
    historyLoadedForRef.current = chatGroupId;

    const loadHistory = async () => {
      try {
        const response = await request(`/api/chat/messages?group_id=${encodeURIComponent(chatGroupId)}&limit=30`);
        const result = await response.json();
        if (result.success && result.data.messages.length > 0) {
          const historyMessages = result.data.messages.map((msg: any) => ({
            id: msg.id,
            sender: {
              id: msg.sender_id,
              name: msg.sender_name,
              avatar: msg.sender_type === 'ai' ? undefined : undefined
            },
            content: msg.content,
            isAI: msg.sender_type === 'ai'
          }));
          setMessages(historyMessages);
          oldestMsgIdRef.current = result.data.messages[0].id;
          setHasMoreHistory(result.data.hasMore);
        }
      } catch (error) {
        console.error('加载聊天记录失败:', error);
      }
    };

    loadHistory();
  }, [userStore.userInfo?.id, groupId, characterId, isPrivateChat, group?.id]);

  useEffect(() => {
    // 只有在用户处于底部附近或者用户自己发送消息时才自动滚动
    if (isNearBottomRef.current || isUserMessageRef.current) {
      scrollToBottom();
      isUserMessageRef.current = false;
    }
  }, [messages]);

  // 陌生随机发言定时器
  const autoSpeakTriggerRef = useRef<((msg: string) => void) | null>(null);
  autoSpeakTriggerRef.current = async (msg: string) => {
    if (isLoading) return;
    // 私聊模式下使用单个角色
    if (isPrivateChat && privateChatCharacter) {
      if (mutedUsers.includes(privateChatCharacter.id)) return;
      const currentHistory = messages.slice(-30).map((m: any) => ({
        role: m.isAI ? 'assistant' : 'user',
        content: m.isAI ? `${m.sender.name}：${m.content}` : m.content,
        name: m.sender.name
      }));
      try {
        const custom_prompt = privateChatCharacter.description + "\n你正在和用户进行一对一的私密对话，请更加亲密和个性化地回复。主动引导用户，让他们感受到你的热情。";
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({
            message: msg,
            custom_prompt,
            history: currentHistory,
            aiName: privateChatCharacter.name,
            index: 0,
            model: privateChatCharacter.model,
            userName: userStore.userInfo?.nickname || '',
            userId: userStore.userInfo?.id || ''
          })
        });
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) fullResponse += data.content;
              } catch {}
            }
          }
        }
        if (fullResponse) {
          const aiMsg = {
            id: messages.length + Date.now() + Math.random(),
            sender: { id: privateChatCharacter.id, name: privateChatCharacter.name, avatar: privateChatCharacter.avatar },
            content: fullResponse,
            isAI: true
          };
          setMessages(prev => [...prev, aiMsg]);
        }
      } catch (e) {
        console.error('Private auto speak error:', e);
      }
      return;
    }
    // 群聊模式
    if (!group || groupAiCharacters.length === 0) return;
    const unmuted = groupAiCharacters.filter(c => !mutedUsers.includes(c.id));
    if (unmuted.length === 0) return;
    // 随机选1-2个角色
    const count = Math.random() < 0.6 ? 1 : 2;
    const shuffled = [...unmuted].sort(() => Math.random() - 0.5).slice(0, count);
    const currentHistory = messages.slice(-30).map((m: any) => ({
      role: m.isAI ? 'assistant' : 'user',
      content: m.isAI ? `${m.sender.name}：${m.content}` : m.content,
      name: m.sender.name
    }));
    const newMessages: any[] = [];
    for (const char of shuffled) {
      try {
        const character = groupAiCharacters.find((c: any) => c.id === char.id) || char;
        const custom_prompt = group
          ? character.description.replace('#groupName#', group.name) + "\n" + group.description
          : character.description;
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({
            message: msg,
            custom_prompt,
            history: currentHistory,
            aiName: character.name,
            index: 0,
            model: character.model,
            userName: userStore.userInfo?.nickname || '',
            userId: userStore.userInfo?.id || ''
          })
        });
        if (!response.ok || !response.body) continue;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) fullResponse += data.content;
              } catch {}
            }
          }
        }
        if (fullResponse) {
          const aiMsg = {
            id: messages.length + Date.now() + Math.random(),
            sender: { id: character.id, name: character.name, avatar: character.avatar },
            content: fullResponse,
            isAI: true
          };
          newMessages.push(aiMsg);
          currentHistory.push({ role: 'assistant', content: `${character.name}：${fullResponse}`, name: character.name });
        }
      } catch (e) {
        console.error('Auto speak error:', e);
      }
    }
    if (newMessages.length > 0) {
      setMessages(prev => [...prev, ...newMessages]);
    }
  };

  useEffect(() => {
    if (autoSpeakTimerRef.current) {
      clearInterval(autoSpeakTimerRef.current);
      autoSpeakTimerRef.current = null;
    }

    // 私聊模式的主动引导
    if (autoSpeakMode && isPrivateChat && privateChatCharacter) {
      if (mutedUsers.includes(privateChatCharacter.id)) return;
      const scheduleNext = () => {
        const delay = 15000 + Math.random() * 30000; // 私聊模式间隔更短：15~45秒
        autoSpeakTimerRef.current = setTimeout(async () => {
          // 根据角色类型设计专门的引导话题
          const privateTopics = [
            '亲爱的，想让我继续吗？',
            '你在想什么呢？告诉我...',
            '感觉怎么样？舒服吗？',
            '要不要换个姿势试试？',
            '我会让你更舒服的...',
            '准备好了吗？',
            '放松一点，让我好好伺候你',
            '我的脚在想你了...',
            '想不想让我用脚好好宠幸你？',
            '告诉我你喜欢什么...',
          ];
          const topic = privateTopics[Math.floor(Math.random() * privateTopics.length)];
          await autoSpeakTriggerRef.current?.(topic);
          scheduleNext();
        }, delay) as unknown as NodeJS.Timeout;
      };
      scheduleNext();
    }

    // 群聊模式
    if (autoSpeakMode && group && groupAiCharacters.length > 0 && !isPrivateChat) {
      const scheduleNext = () => {
        const delay = 30000 + Math.random() * 60000; // 30~90秒随机间隔
        autoSpeakTimerRef.current = setTimeout(async () => {
          const topics = [
            '大家最近怎么样？',
            '有没有什么新鲜事？',
            '今天天气真不错啊',
            '有人想聊天吗？',
            '好无聊啊，来人说说话',
            '有人在吗？出来冒个泡',
            '最近有什么好玩的吗？',
            '我来说个话题吧',
            '嗯...在想什么呢',
            '突然想到一件事',
          ];
          const topic = topics[Math.floor(Math.random() * topics.length)];
          await autoSpeakTriggerRef.current?.(topic);
          scheduleNext();
        }, delay) as unknown as NodeJS.Timeout;
      };
      scheduleNext();
    }
    return () => {
      if (autoSpeakTimerRef.current) {
        clearTimeout(autoSpeakTimerRef.current);
        autoSpeakTimerRef.current = null;
      }
    };
  }, [autoSpeakMode, group, groupAiCharacters, mutedUsers, isPrivateChat, privateChatCharacter]);

  useEffect(() => {
    if (messages.length > 0) {
      setShowAd(false);
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    };
  }, []);

  // 添加一个新的 useEffect 来监听 userStore.userInfo 的变化
  useEffect(() => {
    if (userStore.userInfo && users.length > 0) {
      setUsers(prev => [
        { id: 1, name: userStore.userInfo.nickname, avatar: userStore.userInfo.avatar_url? userStore.userInfo.avatar_url : null },
        ...prev.slice(1) // 保留其他 AI 角色
      ]);
    }
  }, [userStore.userInfo]); // 当 userInfo 变化时更新 users

  // 4. 工具函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const saveMessages = useCallback(async (msgs: any[]) => {
    if (!userStore.userInfo?.id || userStore.userInfo.id === 0) return;
    if (!chatGroupIdRef.current) return;

    const messagesToSave = msgs.map(msg => ({
      group_id: chatGroupIdRef.current,
      sender_id: msg.isAI ? String(msg.sender.id || '') : String(userStore.userInfo.id),
      sender_name: msg.sender.name,
      sender_type: msg.isAI ? 'ai' : 'user',
      content: msg.content
    }));

    if (messagesToSave.length === 0) return;

    try {
      await request('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ messages: messagesToSave })
      });
    } catch (error) {
      console.error('保存消息失败:', error);
    }
  }, [userStore.userInfo?.id]);

  const loadMoreHistory = useCallback(async () => {
    if (loadingHistory || !hasMoreHistory || !oldestMsgIdRef.current || isLoadingHistoryRef.current) return;
    setLoadingHistory(true);
    isLoadingHistoryRef.current = true;

    const container = chatAreaRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;

    try {
      const response = await request(`/api/chat/messages?group_id=${encodeURIComponent(chatGroupIdRef.current)}&before=${oldestMsgIdRef.current}&limit=30`);
      const result = await response.json();
      if (result.success && result.data.messages.length > 0) {
        const historyMessages = result.data.messages.map((msg: any) => ({
          id: msg.id,
          sender: { id: msg.sender_id, name: msg.sender_name },
          content: msg.content,
          isAI: msg.sender_type === 'ai'
        }));
        setMessages(prev => [...historyMessages, ...prev]);
        oldestMsgIdRef.current = result.data.messages[0].id;
        setHasMoreHistory(result.data.hasMore);

        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          }
          isLoadingHistoryRef.current = false;
        });
      } else {
        setHasMoreHistory(false);
        isLoadingHistoryRef.current = false;
      }
    } catch (error) {
      console.error('加载历史消息失败:', error);
      isLoadingHistoryRef.current = false;
    }
    setLoadingHistory(false);
  }, [loadingHistory, hasMoreHistory]);

  // 监听滚动位置，判断用户是否在底部附近
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const threshold = 150; // 距离底部150px以内视为"在底部附近"
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;
    isNearBottomRef.current = isNearBottom;

    // 加载历史消息的逻辑
    if (target.scrollTop < 50 && hasMoreHistory && !loadingHistory) {
      loadMoreHistory();
    }
  }, [hasMoreHistory, loadingHistory, loadMoreHistory]);

  const handleSearch = useCallback(async () => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await request(`/api/chat/messages?group_id=${encodeURIComponent(chatGroupIdRef.current)}&keyword=${encodeURIComponent(searchKeyword)}&limit=50`);
      const result = await response.json();
      if (result.success) {
        setSearchResults(result.data.messages || []);
      }
    } catch (error) {
      console.error('搜索失败:', error);
    }
    setSearching(false);
  }, [searchKeyword]);

  const handleRemoveUser = (userId: number) => {
    setUsers(users.filter(user => user.id !== userId));
  };

  const handleToggleMute = (userId: string) => {
    setMutedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleShareChat = () => {
    setShowPoster(true);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // 5. 加载检查
  if (initError) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-50 via-green-50/70 to-green-100 dark:from-background dark:via-background dark:to-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🦞</div>
          <p className="text-lg font-medium text-foreground mb-2">{initError}</p>
          <p className="text-sm text-muted-foreground mb-6">请检查链接是否正确，或联系群主获取邀请</p>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-6 py-2 bg-[#ff6600] text-white rounded-lg hover:bg-[#e55c00] transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (isInitializing || (!isPrivateChat && !group)) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-50 via-green-50/70 to-green-100 dark:from-background dark:via-background dark:to-background flex items-center justify-center">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    // 如果正在AI回复中，中断当前回复循环，允许用户立即发送新消息
    if (isLoading) {
      pendingAbortRef.current = true;
      abortController.current.abort();
      abortController.current = new AbortController();
      setIsLoading(false);
      // 重置中断标志，让新消息的处理不受影响
      pendingAbortRef.current = false;
    }

    // 添加用户消息
    const userMessage = {
      id: messages.length + 1,
      sender: users[0],
      content: inputMessage,
      isAI: false
    };
    // 标记为用户消息，确保自动滚动到底部
    isUserMessageRef.current = true;
    setMessages(prev => [...prev, userMessage]);
    // 立即保存用户消息
    saveMessages([userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setPendingContent("");
    accumulatedContentRef.current = "";

    // 构建历史消息数组
    let messageHistory = messages.map(msg => ({
      role: msg.isAI ? 'assistant' : 'user',
      content: msg.sender.name == userStore.userInfo.nickname ? 'user：' + msg.content :  msg.sender.name + '：' + msg.content,
      name: msg.sender.name
    }));
    
    // 将当前用户消息添加到历史中
    messageHistory.push({
      role: 'user',
      content: 'user：' + inputMessage,
      name: userStore.userInfo.nickname
    });
    
    // 私聊模式：直接和单个角色对话
    if (isPrivateChat && privateChatCharacter) {
      const previousResponses: { name: string; content: string }[] = [];
      
      const aiMessage = {
        id: messages.length + Date.now(),
        sender: { id: privateChatCharacter.id, name: privateChatCharacter.name, avatar: privateChatCharacter.avatar },
        content: "",
        isAI: true
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      let completeResponse = '';
      
      try {
        const response = await request("/api/chat", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: privateChatCharacter.model,
            message: inputMessage,
            personality: privateChatCharacter.personality,
            history: messageHistory,
            index: 0,
            aiName: privateChatCharacter.name,
            custom_prompt: privateChatCharacter.description + "\n你正在和用户进行一对一的私密对话，请更加亲密和个性化地回复。",
            previousResponses: previousResponses,
            userName: userStore.userInfo?.nickname || '',
            userId: userStore.userInfo?.id || '',
            userBio: userStore.userInfo?.bio || '',
            userOccupation: userStore.userInfo?.occupation || '',
            userInterests: userStore.userInfo?.interests || ''
          }),
        });

        if (!response.ok) {
          throw new Error('请求失败');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('无法获取响应流');
        }

        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            if (completeResponse.trim() === "") {
              completeResponse = "对不起，我暂时无法回复，请稍后再试。";
              setMessages(prev => {
                const newMessages = [...prev];
                const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
                if (aiMessageIndex !== -1) {
                  newMessages[aiMessageIndex] = {
                    ...newMessages[aiMessageIndex],
                    content: completeResponse
                  };
                }
                return newMessages;
              });
            }
            // 私聊回复完成后立即保存该消息
            if (completeResponse.trim()) {
              saveMessages([{
                id: aiMessage.id,
                sender: { id: privateChatCharacter.id, name: privateChatCharacter.name, avatar: privateChatCharacter.avatar },
                content: completeResponse,
                isAI: true
              }]);
            }
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  completeResponse += data.content;
                  completeResponse = completeResponse.replace(new RegExp(`^(${allNames.join('|')})：`, 'i'), '');
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
                    if (aiMessageIndex !== -1) {
                      newMessages[aiMessageIndex] = {
                        ...newMessages[aiMessageIndex],
                        content: completeResponse
                      };
                    }
                    return newMessages;
                  });
                } 
              } catch (e) {
                console.error('解析响应数据失败:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error("发送消息失败:", error);
        setMessages(prev => {
          const newMessages = [...prev];
          const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
          if (aiMessageIndex !== -1) {
            newMessages[aiMessageIndex] = {
              ...newMessages[aiMessageIndex],
              content: "对不起，我暂时无法回复，请稍后再试。"
            };
          }
          return newMessages;
        });
      }

      setIsLoading(false);
      return;
    }
    
    // 群聊模式
    // 判断群的聊天模式
    const chatMode = group?.chatMode || 'interaction';
    
    let selectedGroupAiCharacters = groupAiCharacters;
    if (!isGroupDiscussionMode && chatMode === 'interaction') {
      const shedulerResponse = await request(`/api/scheduler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage, history: messageHistory, availableAIs: groupAiCharacters })
      });
      const shedulerData = await shedulerResponse.json();
      const selectedAIs = shedulerData.selectedAIs;
      selectedGroupAiCharacters = selectedAIs.map(ai => groupAiCharacters.find(c => c.id === ai));
    } else if (chatMode === 'user-centric') {
      // 以用户为中心模式：随机选3~5个角色，都围绕用户说话
      const shuffled = [...groupAiCharacters].filter(c => !mutedUsers.includes(c.id)).sort(() => Math.random() - 0.5);
      const count = Math.min(shuffled.length, 3 + Math.floor(Math.random() * 3)); // 3~5个
      selectedGroupAiCharacters = shuffled.slice(0, count);
    }
    
    // 收集已回复的角色和内容，用于避免重复
    const previousResponses: { name: string; content: string }[] = [];

    // 处理角色回复的函数
    const processAIResponse = async (character: any, currentHistory: any[], contextMessage?: string, isFollowUp?: boolean, triggerBy?: string) => {
      // 检查是否已被中断
      if (pendingAbortRef.current) return null;
      //禁言
      if (mutedUsers.includes(character.id)) {
        return null;
      }
      
      // 创建当前 AI 角色的消息
      const aiMessage = {
        id: messages.length + Date.now(),
        sender: { id: character.id, name: character.name, avatar: character.avatar },
        content: "",
        isAI: true
      };
      
      // 添加当前 AI 的消息
      setMessages(prev => [...prev, aiMessage]);
      let uri = "/api/chat";
      
      let completeResponse = '';
      
      try {
        const response = await request(uri, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortController.current.signal,
          body: JSON.stringify({
            model: character.model,
            message: contextMessage || inputMessage,
            query: contextMessage || inputMessage,
            personality: character.personality,
            history: currentHistory,
            index: 0,
            aiName: character.name,
            custom_prompt: group
              ? character.description.replace('#groupName#', group.name) + "\n" + group.description
              : character.description,
            previousResponses: previousResponses,
            isFollowUp: isFollowUp || false,
            triggerBy: triggerBy || '',
            userName: userStore.userInfo?.nickname || '',
            userId: userStore.userInfo?.id || '',
            userBio: userStore.userInfo?.bio || '',
            userOccupation: userStore.userInfo?.occupation || '',
            userInterests: userStore.userInfo?.interests || ''
          }),
        });

        if (!response.ok) {
          throw new Error('请求失败');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('无法获取响应流');
        }

        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            if (completeResponse.trim() === "") {
              completeResponse = "对不起，我还不够智能，服务又断开了。";
              setMessages(prev => {
                const newMessages = [...prev];
                const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
                if (aiMessageIndex !== -1) {
                  newMessages[aiMessageIndex] = {
                    ...newMessages[aiMessageIndex],
                    content: completeResponse
                  };
                }
                return newMessages;
              });
            }
            // 角色回复完成后立即保存该消息
            if (completeResponse.trim()) {
              saveMessages([{
                id: aiMessage.id,
                sender: { id: character.id, name: character.name, avatar: character.avatar },
                content: completeResponse,
                isAI: true
              }]);
            }
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  completeResponse += data.content;
                  completeResponse = completeResponse.replace(new RegExp(`^(${allNames.join('|')})：`, 'i'), '');
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
                    if (aiMessageIndex !== -1) {
                      newMessages[aiMessageIndex] = {
                        ...newMessages[aiMessageIndex],
                        content: completeResponse
                      };
                    }
                    return newMessages;
                  });
                } 
              } catch (e) {
                console.error('解析响应数据失败:', e);
              }
            }
          }
        }

        // 返回回复内容用于互动检查
        // 将回复添加到已回复列表，供后续角色参考
        previousResponses.push({ name: character.name, content: completeResponse });
        return { character, response: completeResponse };
        
      } catch (error: any) {
        if (error?.name === 'AbortError') return null;
        console.error("发送消息失败:", error);
        return { character, response: "对不起，我还不够智能，服务又断开了。", error: true };
      }
    };

    // 处理初始回复
    const responses = [];
    const selectedIds = new Set(selectedGroupAiCharacters.map(c => c.id));
    
    for (let i = 0; i < selectedGroupAiCharacters.length; i++) {
      if (pendingAbortRef.current) break;
      const character = selectedGroupAiCharacters[i];
      let contextMsg: string | undefined;
      let followUp = false;
      let triggerByName = '';

      // user-centric模式：后面的角色看到前面角色的夸奖，顺势叠加夸
      if (chatMode === 'user-centric' && i > 0) {
        const prev = responses[responses.length - 1];
        contextMsg = `${prev.character.name}说：${prev.response}`;
        followUp = true;
        triggerByName = prev.character.name;
      }

      const result = await processAIResponse(character, messageHistory, contextMsg, followUp, triggerByName);
      if (result) {
        responses.push(result);
        messageHistory.push({
          role: 'assistant',
          content: result.character.name + '：' + result.response,
          name: result.character.name
        });
        
        if (i < selectedGroupAiCharacters.length - 1) {
          await new Promise(resolve => setTimeout(resolve, chatMode === 'user-centric' ? 800 : 1000));
        }
      }
    }
    
    // 随机发言模式：让未被选中的角色也有概率发言（user-centric模式不需要）
    if (randomSpeakMode && !isGroupDiscussionMode && chatMode !== 'user-centric' && !pendingAbortRef.current) {
      const unselectedCharacters = groupAiCharacters.filter(c => 
        !selectedIds.has(c.id) && !mutedUsers.includes(c.id)
      );
      
      const randomSpeakProbability = 0.2;
      const randomSpeakers: any[] = [];
      
      for (const char of unselectedCharacters) {
        if (Math.random() < randomSpeakProbability) {
          randomSpeakers.push(char);
        }
      }
      
      const maxRandomSpeakers = Math.min(2, randomSpeakers.length);
      const selectedRandomSpeakers = randomSpeakers.slice(0, maxRandomSpeakers);
      
      for (const char of selectedRandomSpeakers) {
        if (pendingAbortRef.current) break;
        await new Promise(resolve => setTimeout(resolve, 1500));
        const lastResp = responses.length > 0 ? responses[responses.length - 1] : null;
        const ctx = lastResp ? `${lastResp.character.name}：${lastResp.response}` : inputMessage;
        const result = await processAIResponse(char, messageHistory, ctx, true, lastResp?.character.name || '');
        if (result) {
          messageHistory.push({
            role: 'assistant',
            content: result.character.name + '：' + result.response,
            name: result.character.name
          });
          responses.push(result);
        }
      }
    }
    
    // 角色间互动循环：让角色对其他角色的话自然接话，形成有来有回的群聊（user-centric模式跳过）
    if (!isGroupDiscussionMode && chatMode === 'interaction' && !pendingAbortRef.current) {
      const MAX_INTERACTION_ROUNDS = maxInteractionDepth;
      const speakersThisTurn = new Set(responses.map(r => r.character.id));
      
      for (let round = 0; round < MAX_INTERACTION_ROUNDS; round++) {
        if (pendingAbortRef.current) break;
        // 找到最近一条有互动价值的AI发言
        const recentAIResponses = responses.filter(r => !r.error && r.response.length > 10);
        if (recentAIResponses.length === 0) break;
        
        const lastAIResponse = recentAIResponses[recentAIResponses.length - 1];
        
        // 随机选择一个尚未发言或发言较少的角色来接话（排除刚说话的人，避免自言自语）
        const potentialResponders = groupAiCharacters.filter(c => 
          !mutedUsers.includes(c.id) && c.id !== lastAIResponse.character.id
        );
        
        if (potentialResponders.length === 0) break;
        
        // 用调度器决定谁该接话以及是否值得继续
        try {
          const shedulerResponse = await request(`/api/scheduler`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: `${lastAIResponse.character.name}说：${lastAIResponse.response}`, 
              history: messageHistory, 
              availableAIs: potentialResponders 
            })
          });
          const shedulerData = await shedulerResponse.json();
          
          if (!shedulerData.selectedAIs || shedulerData.selectedAIs.length === 0) break;
          
          // 只取第一个接话的人，让互动更自然
          const responderId = shedulerData.selectedAIs[0];
          const responder = potentialResponders.find(c => c.id === responderId);
          
          if (!responder) break;
          
          await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
          
          const ctx = `${lastAIResponse.character.name}：${lastAIResponse.response}`;
          const result = await processAIResponse(responder, messageHistory, ctx, true, lastAIResponse.character.name);
          
          if (result && result.response.length > 5) {
            messageHistory.push({
              role: 'assistant',
              content: result.character.name + '：' + result.response,
              name: result.character.name
            });
            responses.push(result);
            speakersThisTurn.add(result.character.id);
          } else {
            // 回复太短或失败，说明话题已经聊完了
            break;
          }
        } catch (error) {
          console.error('互动调度失败:', error);
          break;
        }
        
        // 30%概率在互动后继续一轮（模拟自然群聊的不确定性）
        if (Math.random() > 0.3) break;
      }
    }

    setIsLoading(false);
    pendingAbortRef.current = false;
  };

  const handleCancel = () => {
    abortController.current.abort();
  };

  // 处理群组选择
  const handleSelectGroup = (index: number) => {
    navigate(`/group/${index}`);
    return;
  };

  return (
    <>
      <KaTeXStyle />
      <div className="fixed inset-0 bg-gradient-to-br from-green-50 via-green-50/70 to-green-100 dark:from-background dark:via-background dark:to-background flex items-start md:items-center justify-center overflow-hidden">
        <div className="h-full flex bg-card w-full mx-auto relative shadow-xl md:max-w-5xl md:h-[96dvh] md:my-auto md:rounded-lg">
          {/* 传递 selectedGroupIndex 和 onSelectGroup 回调给 Sidebar */}
          <Sidebar 
            isOpen={sidebarOpen} 
            toggleSidebar={toggleSidebar} 
            selectedGroupIndex={selectedGroupIndex}
            onSelectGroup={handleSelectGroup}
            groups={groups}
          />
          
          {/* 聊天主界面 */}
          <div className="flex flex-col flex-1">
            {/* Header */}
            <header className="bg-card shadow dark:shadow-none dark:border-b flex-none md:rounded-t-lg">
              <div className="flex items-center justify-between px-0 py-1.5">
                {/* 左侧群组信息 */}
                <div className="flex items-center md:px-2.5">
                  {/* 返回按钮 */}
                  <button 
                    className="flex items-center justify-center m-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-1"
                    onClick={() => navigate('/')}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  <h1 className="font-medium text-base -ml-1">
                    {isPrivateChat && privateChatCharacter 
                      ? privateChatCharacter.name 
                      : group && `${group.name}(${users.length})`
                    }
                  </h1>
                </div>

                
                {/* 右侧头像组和按钮 */}
                <div className="flex items-center">
                {/* 广告位 手机端不展示 */}
                 <div className="hidden md:block">
                   <AdBanner show={showAd} closeAd={() => setShowAd(false)} />
                 </div>
                
                  {/* 私聊模式只显示角色头像 */}
                  {isPrivateChat && privateChatCharacter ? (
                    <Avatar className="w-7 h-7">
                      {privateChatCharacter.avatar ? (
                        <AvatarImage src={privateChatCharacter.avatar} />
                      ) : (
                        <AvatarFallback style={{ 
                          backgroundColor: getAvatarData(privateChatCharacter.name).backgroundColor,
                          color: 'white'
                        }}>
                          {privateChatCharacter.name[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  ) : (
                    <div className="flex -space-x-2 ">
                      {users.slice(0, 4).map((user) => {
                        const avatarData = getAvatarData(user.name);
                        return (
                          <TooltipProvider key={user.id}>
                            <Tooltip>
                              <TooltipTrigger>
                                <Avatar className="w-7 h-7 border-2 border-card">
                                  {'avatar' in user && user.avatar && user.avatar !== null ? (
                                    <AvatarImage src={user.avatar} />
                                  ) : (
                                    <AvatarFallback style={{ backgroundColor: avatarData.backgroundColor, color: 'white' }}>
                                      {avatarData.text}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{user.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                      {users.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-card">
                          +{users.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                  {!isPrivateChat && (
                    <Button variant="ghost" size="icon" onClick={() => setShowMembers(true)}>
                      <Settings2 className="w-5 h-5" />
                    </Button>
                  )}
                  {userStore.userInfo?.id && userStore.userInfo.id !== 0 && (
                    <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)} title="搜索聊天记录">
                      <Search className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>
              {/* 搜索栏 */}
              {showSearch && (
                <div className="px-2 pb-2 flex gap-2">
                  <Input
                    placeholder="搜索聊天记录..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button size="sm" onClick={handleSearch} disabled={searching}>
                    {searching ? (
                      <div className="w-3 h-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Search className="w-3 h-3" />
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowSearch(false); setSearchKeyword(""); setSearchResults([]); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </header>

            {/* Main Chat Area */}
            <div className="flex-1 overflow-hidden bg-muted">

              {/* 搜索结果面板 */}
              {showSearch && searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border-b bg-card px-3 py-2">
                  <div className="text-xs text-muted-foreground mb-2">搜索结果 ({searchResults.length}条)</div>
                  {searchResults.map((msg: any) => (
                    <div key={msg.id} className="py-1.5 border-b last:border-0">
                      <span className="text-xs font-medium text-muted-foreground">{msg.sender_name}</span>
                      <p className="text-sm line-clamp-2">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <div
                ref={chatAreaRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto overflow-x-hidden px-2 py-1"
              >
                <div className="md:hidden">
                  <AdBannerMobile show={showAd} closeAd={() => setShowAd(false)} />
                </div>
                {loadingHistory && (
                  <div className="flex justify-center py-2">
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
                  </div>
                )}
                {!hasMoreHistory && messages.length > 0 && userStore.userInfo?.id && userStore.userInfo.id !== 0 && (
                  <div className="text-center text-xs text-muted-foreground/50 py-2">没有更多消息了</div>
                )}
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} 
                      className={`flex items-start gap-2 ${message.sender.name === userStore.userInfo.nickname ? "justify-end" : ""}`}>
                      {message.sender.name !== userStore.userInfo.nickname && (
                        <Avatar className={message.isAI && message.sender.id ? "cursor-pointer" : ""} 
                          onClick={() => {
                            if (message.isAI && message.sender.id) {
                              navigate(`/chat/${message.sender.id}`);
                            }
                          }}
                        >
                          {'avatar' in message.sender && message.sender.avatar ? (
                            <AvatarImage src={message.sender.avatar} className="w-10 h-10" />
                          ) : (
                          <AvatarFallback style={{ backgroundColor: getAvatarData(message.sender.name).backgroundColor, color: 'white' }}>
                            {message.sender.name[0]}
                          </AvatarFallback>
                          )}
                        </Avatar>
                      )}
                      <div className={message.sender.name === userStore.userInfo.nickname ? "text-right" : ""}>
                        <div className={`text-sm text-muted-foreground ${message.isAI && message.sender.id ? "cursor-pointer hover:text-foreground" : ""}`}
                          onClick={() => {
                            if (message.isAI && message.sender.id) {
                              navigate(`/chat/${message.sender.id}`);
                            }
                          }}
                        >{message.sender.name}</div>
                        <div className={`mt-1 p-3 rounded-lg shadow-sm chat-message ${
                          message.sender.name === userStore.userInfo.nickname ? "bg-blue-500 text-white text-left" : "bg-card"
                        }`}>
                          {message.isAI && !message.content ? (
                            <div className="typing-dots">
                              <span></span><span></span><span></span>
                            </div>
                          ) : (
                            <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            className={`prose dark:prose-invert max-w-none ${
                              message.sender.name === userStore.userInfo.nickname ? "text-white [&_*]:text-white" : ""
                            }
                            [&_h2]:py-1
                            [&_h2]:m-0
                            [&_h3]:py-1.5
                            [&_h3]:m-0
                            [&_p]:m-0 
                            [&_pre]:bg-gray-900 
                            [&_pre]:p-2
                            [&_pre]:m-0 
                            [&_pre]:rounded-lg
                            [&_pre]:text-gray-100
                            [&_pre]:whitespace-pre-wrap
                            [&_pre]:break-words
                            [&_pre_code]:whitespace-pre-wrap
                            [&_pre_code]:break-words
                            [&_code]:text-sm
                            [&_code]:text-gray-400
                            [&_code:not(:where([class~="language-"]))]:text-pink-500
                            [&_code:not(:where([class~="language-"]))]:bg-transparent
                            [&_a]:text-blue-500
                            [&_a]:no-underline
                            [&_ul]:my-2
                            [&_ol]:my-2
                            [&_li]:my-1
                            [&_blockquote]:border-l-4
                            [&_blockquote]:border-border
                            [&_blockquote]:pl-4
                            [&_blockquote]:my-2
                            [&_blockquote]:italic`}
                          >
                            {message.content}
                          </ReactMarkdown>
                          )}
                        </div>
                      </div>
                      {message.sender.name === userStore.userInfo.nickname && (
                        <Avatar>
                         {'avatar' in message.sender && message.sender.avatar ? (
                            <AvatarImage src={message.sender.avatar} className="w-10 h-10" />
                          ) : (
                          <AvatarFallback style={{ backgroundColor: getAvatarData(message.sender.name).backgroundColor, color: 'white' }}>
                            {message.sender.name[0]}
                          </AvatarFallback>
                          )}
                        </Avatar>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                  {/* 添加一个二维码 */}
                  <div id="qrcode" className="flex flex-col items-center hidden">
                    <img src="/img/qr.png" alt="QR Code" className="w-24 h-24" />
                    <p className="text-sm text-muted-foreground mt-2 font-medium tracking-tight bg-muted px-3 py-1 rounded-full">扫码体验AI群聊</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="bg-card border-t py-3 px-2 md:rounded-b-lg">
              <div className="flex gap-1 pb-[env(safe-area-inset-bottom)]">
                {messages.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline"
                          size="icon"
                          onClick={handleShareChat}
                          className="px-3"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>分享聊天记录</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Input 
                  placeholder="输入消息..." 
                  className="flex-1"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button 
                  onClick={handleSendMessage}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Members Management Dialog */}
        <MembersManagement
          showMembers={showMembers}
          setShowMembers={setShowMembers}
          users={users}
          mutedUsers={mutedUsers}
          handleToggleMute={handleToggleMute}
          isGroupDiscussionMode={isGroupDiscussionMode}
          onToggleGroupDiscussion={() => setIsGroupDiscussionMode(!isGroupDiscussionMode)}
          getAvatarData={getAvatarData}
          groupId={group?.id}
          groupName={group?.name}
          allCharacters={groupAiCharacters}
          onMembersChange={() => {
            // 刷新页面以加载新成员
            window.location.reload();
          }}
          onGroupNameChange={(name) => {
            if (group) group.name = name;
          }}
          maxInteractionDepth={maxInteractionDepth}
          onInteractionDepthChange={setMaxInteractionDepth}
          randomSpeakMode={randomSpeakMode}
          onRandomSpeakModeChange={setRandomSpeakMode}
          autoSpeakMode={autoSpeakMode}
          onAutoSpeakModeChange={setAutoSpeakMode}
          isPrivateChat={isPrivateChat}
        />
      </div>

      {/* 添加 SharePoster 组件 */}
      <SharePoster 
        isOpen={showPoster}
        onClose={() => setShowPoster(false)}
        chatAreaRef={chatAreaRef}
      />
    </>
  );
};

export default ChatUI;