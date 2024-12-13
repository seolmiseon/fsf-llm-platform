import { create } from 'zustand';

interface IUserStore {
    user: any;
    accessToken: string | null;
    userLoggedInStatus: boolean;
    setUser: (user: any, accessToken: string) => void;
    updateAccessToken: (newToken: string) => void;
    logout: () => void;
}

export const userStore = create<IUserStore>((set) => ({
    user: null,
    accessToken: null,
    userLoggedInStatus: false,
    setUser: (user, accessToken) =>
        set({
            user,
            accessToken,
            userLoggedInStatus: !!user && !!accessToken,
        }),
    updateAccessToken: (newToken) =>
        set((state) => ({
            accessToken: newToken,
            userLoggedInStatus: !!state.user && !!newToken,
        })),
    logout: () =>
        set({ user: null, accessToken: null, userLoggedInStatus: false }),
}));

export const checkLoginStatus = () =>
    !!userStore.getState().user && !!userStore.getState().accessToken;
