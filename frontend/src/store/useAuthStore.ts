import { create } from 'zustand';

type AuthStore = {
    user: any | null;
    loading: boolean;
    setUser: (user: any) => void;
    setLoading: (loading: boolean) => void;
    clearUser: () => void; // 로그아웃 시 사용할 함수 추가
};

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    loading: true,
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ loading }),
    clearUser: () => set({ user: null, loading: false }),
}));
