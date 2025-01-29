import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthStore = {
    user: any | null;
    loading: boolean;
    setUser: (user: any) => void;
    setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null,
            loading: true,
            setUser: (user) => set({ user }),
            setLoading: (loading) => set({ loading }),
        }),
        {
            name: 'auth-storage',
        }
    )
);
