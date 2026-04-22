import { create } from 'zustand'

interface InitData {
  groups: any[];
  characters: any[];
  user: any;
}

interface InitStore {
  initData: InitData | null;
  loading: boolean;
  setInitData: (data: InitData) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useInitStore = create<InitStore>((set) => ({
  initData: null,
  loading: false,
  setInitData: (data) => set({ initData: data, loading: false }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ initData: null, loading: false }),
}))
