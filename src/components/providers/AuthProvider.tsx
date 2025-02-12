'use client';

import '@/lib/firebase/config';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setUser, setLoading } = useAuthStore();

    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('Auth 상태 변경:', user);
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [setUser, setLoading]);

    return <>{children}</>;
}
