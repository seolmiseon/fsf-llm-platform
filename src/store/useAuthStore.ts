import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

type AuthStore = {
    user: any | null;
    loading: boolean;
    setUser: (user: any) => void;
    setLoading: (loading: boolean) => void;
    initialize: () => void;
};

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null,
            loading: true,
            setUser: (user) => set({ user }),
            setLoading: (loading) => set({ loading }),
            initialize: () => {
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    set({ user, loading: false });
                    console.log('Auth 상태 변경:', user?.email);
                });
                return unsubscribe;
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);

// 초기화 실행
useAuthStore.getState().initialize();
