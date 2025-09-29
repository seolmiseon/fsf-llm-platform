'use client';

import { useThemeStore } from '@/store/useThemeStore';
import React, { useEffect } from 'react';

interface ProviderProps {
    children: React.ReactNode;
}

export function ThemeProvider({ children }: ProviderProps) {
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);

    useEffect(() => {
        const prefersDark = window.matchMedia(
            '(prefers-color-scheme: dark)'
        ).matches;

        if (!theme) {
            setTheme(prefersDark ? 'dark' : 'light');
        }

        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
    }, [theme, setTheme]);

    return <>{children}</>;
}
