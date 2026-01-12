import { create } from 'zustand';

type AuthStore = {
    user: any | null;
    loading: boolean;
    lastActivityTime: number | null; // 마지막 활동 시각 (timestamp)
    loginTime: number | null; // 로그인 시각 (timestamp) - 절대 시간 기반 만료용
    setUser: (user: any) => void;
    setLoading: (loading: boolean) => void;
    clearUser: () => void; // 로그아웃 시 사용할 함수 추가
    updateActivityTime: () => void; // 활동 시각 업데이트
    resetActivityTimer: () => void; // 타이머 리셋
    startInactivityTimer: () => void; // 타이머 시작
    checkSessionExpiry: () => Promise<void>; // 세션 만료 체크
};

// 비활성 타임아웃 설정 (밀리초)
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2시간
// 절대 시간 기반 세션 만료 (밀리초) - 7일
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7일

// 전역 타이머 참조 (한 번만 실행되도록)
let inactivityTimer: NodeJS.Timeout | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
    user: null,
    loading: true,
    lastActivityTime: null,
    loginTime: null,
    
    setUser: (user) => {
        set({ user });
        // 사용자 로그인 시 활동 시각 및 로그인 시각 초기화
        if (user) {
            const now = Date.now();
            set({ loginTime: now }); // 로그인 시각 저장
            get().updateActivityTime();
        } else {
            set({ loginTime: null });
            get().resetActivityTimer();
        }
    },
    
    setLoading: (loading) => set({ loading }),
    
    clearUser: () => {
        set({ user: null, loading: false, lastActivityTime: null, loginTime: null });
        get().resetActivityTimer();
    },
    
    updateActivityTime: () => {
        const now = Date.now();
        set({ lastActivityTime: now });
        
        // 타이머 리셋
        get().resetActivityTimer();
        get().startInactivityTimer();
    },
    
    resetActivityTimer: () => {
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
    },
    
    startInactivityTimer: () => {
        // 기존 타이머 정리
        get().resetActivityTimer();
        
        const { user } = get();
        if (!user) return;
        
        // 새 타이머 시작
        inactivityTimer = setTimeout(() => {
            const { user: currentUser, lastActivityTime } = get();
            
            // 사용자가 여전히 로그인되어 있고, 타임아웃이 지났는지 확인
            if (currentUser && lastActivityTime) {
                const elapsed = Date.now() - lastActivityTime;
                
                if (elapsed >= INACTIVITY_TIMEOUT_MS) {
                    console.log('⏰ 비활성 타임아웃: 자동 로그아웃');
                    
                    // Firebase 로그아웃
                    import('firebase/auth').then(({ signOut, getAuth }) => {
                        const auth = getAuth();
                        signOut(auth).catch((err) => {
                            console.error('자동 로그아웃 실패:', err);
                        });
                    });
                    
                    // 스토어 초기화
                    get().clearUser();
                }
            }
        }, INACTIVITY_TIMEOUT_MS);
    },
    
    checkSessionExpiry: async () => {
        const { user, loginTime } = get();
        
        if (!user || !loginTime) return;
        
        // 1. 절대 시간 기반 만료 체크 (7일)
        const elapsed = Date.now() - loginTime;
        if (elapsed >= SESSION_MAX_AGE_MS) {
            console.log('⏰ 세션 만료: 7일 경과로 자동 로그아웃');
            const { signOut, getAuth } = await import('firebase/auth');
            const auth = getAuth();
            await signOut(auth).catch((err) => {
                console.error('자동 로그아웃 실패:', err);
            });
            get().clearUser();
            return;
        }
        
        // 2. 토큰 만료 체크
        try {
            const tokenResult = await user.getIdTokenResult();
            const expirationTime = tokenResult.expirationTime ? new Date(tokenResult.expirationTime).getTime() : null;
            
            if (expirationTime && expirationTime < Date.now()) {
                console.log('⏰ 토큰 만료: 자동 로그아웃');
                const { signOut, getAuth } = await import('firebase/auth');
                const auth = getAuth();
                await signOut(auth).catch((err) => {
                    console.error('자동 로그아웃 실패:', err);
                });
                get().clearUser();
                return;
            }
        } catch (error) {
            console.error('토큰 확인 실패:', error);
            // 토큰 확인 실패 시에도 로그아웃 (보안상 안전)
            const { signOut, getAuth } = await import('firebase/auth');
            const auth = getAuth();
            await signOut(auth).catch(() => {});
            get().clearUser();
        }
    },
}));
