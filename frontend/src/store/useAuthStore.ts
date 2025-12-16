import { create } from 'zustand';

type AuthStore = {
    user: any | null;
    loading: boolean;
    lastActivityTime: number | null; // 마지막 활동 시각 (timestamp)
    setUser: (user: any) => void;
    setLoading: (loading: boolean) => void;
    clearUser: () => void; // 로그아웃 시 사용할 함수 추가
    updateActivityTime: () => void; // 활동 시각 업데이트
    resetActivityTimer: () => void; // 타이머 리셋
    startInactivityTimer: () => void; // 타이머 시작
};

// 비활성 타임아웃 설정 (밀리초)
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2시간

// 전역 타이머 참조 (한 번만 실행되도록)
let inactivityTimer: NodeJS.Timeout | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
    user: null,
    loading: true,
    lastActivityTime: null,
    
    setUser: (user) => {
        set({ user });
        // 사용자 로그인 시 활동 시각 초기화
        if (user) {
            get().updateActivityTime();
        } else {
            get().resetActivityTimer();
        }
    },
    
    setLoading: (loading) => set({ loading }),
    
    clearUser: () => {
        set({ user: null, loading: false, lastActivityTime: null });
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
}));
