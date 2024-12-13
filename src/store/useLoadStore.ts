import { create } from 'zustand';

interface IUseLoadStore {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
}

export const useLoadStore = create<IUseLoadStore>((set) => ({
    isLoading: false,
    setIsLoading: (loading) => set(() => ({ isLoading: loading })),
}));
