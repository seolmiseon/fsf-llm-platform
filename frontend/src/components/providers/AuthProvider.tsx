'use client';

import '@/lib/firebase/config';
import { useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import { BackendApi } from '@/lib/client/api/backend';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setUser, setLoading, updateActivityTime, startInactivityTimer, checkSessionExpiry, user } = useAuthStore();
    const backendApi = useRef(new BackendApi()).current;
    const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 활동 추적 핸들러
    const handleActivity = useCallback(() => {
        updateActivityTime();
    }, [updateActivityTime]);

    // 서버에 활동 시각 업데이트 (선택적, 비용 절감을 위해 비활성화 가능)
    // 주의: 이 기능을 활성화하면 5분마다 서버 요청이 발생합니다.
    const ENABLE_SERVER_ACTIVITY_UPDATE = false; // true로 변경하면 활성화
    
    const updateServerActivity = useCallback(async () => {
        if (!ENABLE_SERVER_ACTIVITY_UPDATE || !user) return;
        
        try {
            await fetch('/api/auth/activity', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${await user.getIdToken()}`,
                    'Content-Type': 'application/json',
                },
            }).catch(() => {
                // 실패해도 무시 (선택적 기능)
            });
        } catch (error) {
            // 조용히 실패 (선택적 기능)
        }
    }, [user]);

    useEffect(() => {
        if (!auth) return;
        
        // 초기 로드 시 세션 만료 체크
        checkSessionExpiry();
        
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('Auth 상태 변경:', user);
            setUser(user);
            setLoading(false);
            
            // 로그인 시 타이머 시작
            if (user) {
                startInactivityTimer();
                
                // 서버 활동 업데이트 주기적 호출 (5분마다)
                activityIntervalRef.current = setInterval(() => {
                    updateServerActivity();
                }, 5 * 60 * 1000); // 5분
                
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
    }, [setUser, setLoading, startInactivityTimer, updateServerActivity, checkSessionExpiry]);
    
    // 페이지 로드 시 세션 만료 체크
    useEffect(() => {
        if (user) {
            checkSessionExpiry();
        }
    }, [user, checkSessionExpiry]);

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
