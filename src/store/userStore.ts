import { create } from 'zustand'

interface UserInfo {
  id: number;
  phone: string;
  nickname: string;
  avatar_url: string | null;
  status: number;
  bio?: string;           // 个人简介
  occupation?: string;    // 职业
  interests?: string;     // 兴趣爱好
}

interface UserStore {
  userInfo: UserInfo;
  setUserInfo: (userInfo: UserInfo) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  userInfo: {
    id: 0,
    phone: '',
    nickname: '',
    avatar_url: null,
    status: 0,
    bio: '',
    occupation: '',
    interests: ''
  },
  setUserInfo: (userInfo: UserInfo) => set({ userInfo })
})); 