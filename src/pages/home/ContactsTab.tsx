import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAvatarData } from '@/utils/avatar';
import { ChevronRight, Search, Users } from 'lucide-react';
import type { AICharacter } from "@/config/aiCharacters";

interface ContactsTabProps {
  characters: AICharacter[];
  onCharacterClick: (id: string) => void;
}

// Group characters by their first tag for categorization
const groupByTag = (characters: AICharacter[]) => {
  const groups: { letter: string; chars: AICharacter[] }[] = [];
  const tagMap = new Map<string, AICharacter[]>();

  characters.forEach(char => {
    const tag = char.tags?.[0] || '其他';
    if (!tagMap.has(tag)) tagMap.set(tag, []);
    tagMap.get(tag)!.push(char);
  });

  const sorted = Array.from(tagMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  sorted.forEach(([tag, chars]) => {
    groups.push({ letter: tag, chars });
  });

  return groups;
};

export default function ContactsTab({ characters, onCharacterClick }: ContactsTabProps) {
  const [searchText, setSearchText] = useState('');
  const groups = groupByTag(
    characters.filter(c => !searchText || c.name.includes(searchText))
  );

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <div className="px-3 py-2 bg-[#ededed] dark:bg-background flex-none">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full bg-white dark:bg-gray-800 rounded-md py-1.5 pl-8 pr-3 text-sm placeholder:text-gray-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Character list */}
      <ScrollArea className="flex-1">
        <div className="bg-white dark:bg-card">
          {/* Quick actions */}
          <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="ml-3 text-sm">新的朋友</span>
          </div>

          {/* Grouped contacts */}
          {groups.map(group => (
            <div key={group.letter}>
              {/* Section header */}
              <div className="px-4 py-1 bg-[#ededed] dark:bg-gray-900 sticky top-0 z-10">
                <span className="text-xs text-muted-foreground font-medium">{group.letter}</span>
              </div>
              {/* Contacts in this section */}
              {group.chars.map(char => (
                <div
                  key={char.id}
                  onClick={() => onCharacterClick(char.id)}
                  className="flex items-center px-4 py-2.5 cursor-pointer active:bg-gray-100 dark:active:bg-gray-800 border-b border-gray-50 dark:border-gray-800"
                >
                  {char.avatar ? (
                    <Avatar className="w-10 h-10 flex-none">
                      <AvatarImage src={char.avatar} />
                      <AvatarFallback style={{ backgroundColor: getAvatarData(char.name).backgroundColor, color: 'white' }}>
                        {char.name[0]}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="w-10 h-10 flex-none">
                      <AvatarFallback style={{ backgroundColor: getAvatarData(char.name).backgroundColor, color: 'white' }}>
                        {char.name[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="ml-3 flex-1 min-w-0">
                    <span className="text-sm text-foreground">{char.name}</span>
                    {char.tags && char.tags.length > 0 && (
                      <p className="text-[10px] text-muted-foreground truncate">{char.tags.slice(0, 3).join(' · ')}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-none" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
