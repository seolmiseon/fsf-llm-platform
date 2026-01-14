'use client';

import '@/lib/firebase/config';
import { useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const setUser = useAuthStore((state) => state.setUser);
    const setLoading = useAuthStore((state) => state.setLoading);
    const updateActivityTime = useAuthStore((state) => state.updateActivityTime);
    const startInactivityTimer = useAuthStore((state) => state.startInactivityTimer);
    const checkSessionExpiry = useAuthStore((state) => state.checkSessionExpiry);

    const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const initialCheckDone = useRef(false);

    // 활동 추적 핸들러
    const handleActivity = useCallback(() => {
        updateActivityTime();
    }, [updateActivityTime]);

    // Auth 상태 변경 감지 - 한 번만 설정
    useEffect(() => {
        if (!auth) return;

        // 초기 로드 시 세션 만료 체크 (한 번만)
        if (!initialCheckDone.current) {
            checkSessionExpiry();
            initialCheckDone.current = true;
        }

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);

            // 로그인 시 타이머 시작
            if (firebaseUser) {
                startInactivityTimer();

                // 기존 인터벌 정리
                if (activityIntervalRef.current) {
                    clearInterval(activityIntervalRef.current);
                }
                if (sessionCheckIntervalRef.current) {
                    clearInterval(sessionCheckIntervalRef.current);
                }

                // 세션 만료 체크 (1시간마다)
                sessionCheckIntervalRef.current = setInterval(() => {
                    checkSessionExpiry();
                }, 60 * 60 * 1000); // 1시간
            } else {
                // 로그아웃 시 인터벌 정리
                if (activityIntervalRef.current) {
                    clearInterval(activityIntervalRef.current);
                    activityIntervalRef.current = null;
                }
                if (sessionCheckIntervalRef.current) {
                    clearInterval(sessionCheckIntervalRef.current);
                    sessionCheckIntervalRef.current = null;
                }
            }
        });

        return () => {
            unsubscribe();
            if (activityIntervalRef.current) {
                clearInterval(activityIntervalRef.current);
            }
            if (sessionCheckIntervalRef.current) {
                clearInterval(sessionCheckIntervalRef.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 빈 의존성 배열 - 마운트 시 한 번만 실행

    // 사용자 활동 추적 (이벤트 리스너)
    useEffect(() => {
        // 활동 이벤트들
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click',
        ];

        // 이벤트 리스너 등록
        events.forEach((event) => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // 초기 활동 시각 설정
        handleActivity();

        // cleanup
        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [handleActivity]);

    return <>{children}</>;
}
