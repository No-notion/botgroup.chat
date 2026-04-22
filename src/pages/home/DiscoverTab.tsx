import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAvatarData } from '@/utils/avatar';
import { Camera, ThumbsUp, MessageCircle, ChevronRight } from 'lucide-react';
import type { AICharacter } from "@/config/aiCharacters";

interface DiscoverTabProps {
  characters: AICharacter[];
  onCharacterClick: (id: string) => void;
}

// Generate mock moments for characters
const generateMoments = (characters: AICharacter[]) => {
  const templates = [
    { text: '今天心情不错，来聊聊天吧~', likes: 3 },
    { text: '刚看了一部好电影，强烈推荐！', likes: 7 },
    { text: '周末终于可以休息了 🎉', likes: 12 },
    { text: '分享一个人生经验：不要给自己太多压力', likes: 5 },
    { text: '今天遇到一件特别有意思的事...', likes: 8 },
    { text: '有没有人想一起探讨下这个话题？', likes: 2 },
    { text: '生活不止眼前的苟且，还有诗和远方', likes: 15 },
    { text: '深夜感慨一下，人生真的好奇妙', likes: 6 },
    { text: '新学了一个技能，感觉打开了新世界的大门', likes: 4 },
    { text: '今天天气真好，适合出门走走', likes: 9 },
  ];

  const times = ['刚刚', '5分钟前', '半小时前', '1小时前', '2小时前', '3小时前', '今天', '昨天', '2天前', '3天前'];
  
  // Pick a subset of characters for moments
  const momentChars = characters.filter(c => c.tags && c.tags.length > 0).slice(0, 10);
  
  return momentChars.map((char, i) => {
    const template = templates[i % templates.length];
    const time = times[Math.min(i, times.length - 1)];
    return {
      id: char.id,
      character: char,
      text: template.text,
      likes: template.likes,
      liked: false,
      comments: i % 3 === 0 ? [{ from: characters[(i + 1) % characters.length]?.name || '群友', text: '说得对！' }] : [],
      time,
    };
  });
};

export default function DiscoverTab({ characters, onCharacterClick }: DiscoverTabProps) {
  const [moments, setMoments] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  useEffect(() => {
    if (characters.length > 0) {
      setMoments(generateMoments(characters));
    }
  }, [characters]);

  // If viewing moments detail
  if (selectedSection === 'moments') {
    return (
      <div className="h-full flex flex-col bg-[#ededed] dark:bg-background">
        {/* Moments header */}
        <div className="flex-none bg-white dark:bg-card px-4 py-3 flex items-center border-b border-gray-100 dark:border-gray-800">
          <button onClick={() => setSelectedSection(null)} className="text-green-600 dark:text-green-400 text-sm">返回</button>
          <span className="flex-1 text-center text-sm font-medium">朋友圈</span>
          <Camera className="w-5 h-5 text-green-600 dark:text-green-400 cursor-pointer" />
        </div>

        {/* Cover area */}
        <div className="relative h-48 bg-gradient-to-br from-green-400 via-blue-400 to-purple-500 flex-none">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-3 right-4 flex items-center gap-2">
            <span className="text-white text-sm font-medium drop-shadow">{characters[0]?.name || '我'}</span>
            <Avatar className="w-16 h-16 border-2 border-white">
              <AvatarFallback className="bg-green-500 text-white text-lg">我</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Moments feed */}
        <ScrollArea className="flex-1">
          <div className="bg-white dark:bg-card">
            {moments.map(moment => {
              const char = moment.character;
              return (
                <div key={moment.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex gap-3">
                    <Avatar className="w-10 h-10 flex-none cursor-pointer" onClick={() => onCharacterClick(char.id)}>
                      {char.avatar ? (
                        <AvatarImage src={char.avatar} />
                      ) : null}
                      <AvatarFallback style={{ backgroundColor: getAvatarData(char.name).backgroundColor, color: 'white' }}>
                        {char.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">{char.name}</span>
                      <p className="text-sm text-foreground mt-1">{moment.text}</p>
                      
                      {/* Interactions */}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] text-muted-foreground">{moment.time}</span>
                      </div>
                      
                      {/* Like & comment bar */}
                      <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded px-2.5 py-1.5">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setMoments(prev => prev.map(m => 
                                m.id === moment.id ? { ...m, liked: !m.liked, likes: m.liked ? m.likes - 1 : m.likes + 1 } : m
                              ));
                            }}
                            className="flex items-center gap-1"
                          >
                            <ThumbsUp className={`w-3 h-3 ${moment.liked ? 'text-green-500 fill-green-500' : 'text-gray-400'}`} />
                            <span className="text-[10px] text-muted-foreground">{moment.likes}</span>
                          </button>
                          <button className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-gray-400" />
                            <span className="text-[10px] text-muted-foreground">{moment.comments.length}</span>
                          </button>
                        </div>
                        
                        {/* Comments */}
                        {moment.comments.length > 0 && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-700">
                            {moment.comments.map((comment: any, idx: number) => (
                              <p key={idx} className="text-[11px]">
                                <span className="text-green-600 dark:text-green-400">{comment.from}</span>
                                <span className="text-muted-foreground">：{comment.text}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Default: Discover main page
  return (
    <ScrollArea className="h-full">
      <div className="bg-white dark:bg-card">
        {/* Moments */}
        <div
          onClick={() => setSelectedSection('moments')}
          className="flex items-center px-4 py-3.5 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 border-b border-gray-100 dark:border-gray-800"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-none">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <span className="ml-3 flex-1 text-sm">朋友圈</span>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {characters.slice(0, 3).map(char => (
                <Avatar key={char.id} className="w-5 h-5 border border-white dark:border-gray-800">
                  {char.avatar ? <AvatarImage src={char.avatar} /> : null}
                  <AvatarFallback className="text-[6px]" style={{ backgroundColor: getAvatarData(char.name).backgroundColor, color: 'white' }}>
                    {char.name[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </div>
        </div>

        {/* Scan */}
        <div className="flex items-center px-4 py-3.5 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center flex-none">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="ml-3 flex-1 text-sm">扫一扫</span>
          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
        </div>

        {/* Mini Programs */}
        <div className="mt-2 flex items-center px-4 py-3.5 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center flex-none">
            <ThumbsUp className="w-5 h-5 text-white" />
          </div>
          <span className="ml-3 flex-1 text-sm">小程序</span>
          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
        </div>
      </div>
    </ScrollArea>
  );
}
