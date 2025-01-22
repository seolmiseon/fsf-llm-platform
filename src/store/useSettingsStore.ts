import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
    language: string;
    notifications: boolean;
    fontSize: 'small' | 'medium' | 'large';
    autoplay: boolean;
    theme: 'light' | 'dark' | 'system';
}

interface SettingsStore extends Settings {
    updateSettings: (settings: Partial<Settings>) => void;
    resetSettings: () => void;
}

const defaultSettings: Settings = {
    language: 'ko',
    notifications: true,
    fontSize: 'medium',
    autoplay: false,
    theme: 'system',
};

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            ...defaultSettings,
            updateSettings: (newSettings) =>
                set((state) => ({ ...state, ...newSettings })),
            resetSettings: () => set(defaultSettings),
        }),
        {
            name: 'user-settings',
        }
    )
);
