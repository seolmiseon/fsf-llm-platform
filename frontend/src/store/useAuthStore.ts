import { create } from 'zustand';
import { FirebaseUser } from '@/types/auth/auth';

type AuthStore = {
    user: FirebaseUser | null;
    loading: boolean;
    lastActivityTime: number | null;
    setUser: (user: FirebaseUser | null) => void;
    setLoading: (loading: boolean) => void;
    clearUser: () => void;
    updateActivityTime: () => void;
    resetActivityTimer: () => void;
    startInactivityTimer: () => void;
    checkSessionExpiry: () => Promise<void>;
    getLoginTime: () => number | null;
    setLoginTime: (time: number) => void;
    clearLoginTime: () => void;
};

// 비활성 타임아웃 설정 (밀리초)
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2시간
// 절대 시간 기반 세션 만료 (밀리초) - 7일
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7일

// localStorage 키
const LOGIN_TIME_KEY = 'fsf_login_time';

// 전역 타이머 참조 (한 번만 실행되도록)
let inactivityTimer: NodeJS.Timeout | null = null;

// localStorage 헬퍼 함수 (SSR 안전)
const getStoredLoginTime = (): number | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(LOGIN_TIME_KEY);
    return stored ? parseInt(stored, 10) : null;
};

const setStoredLoginTime = (time: number): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOGIN_TIME_KEY, time.toString());
};

const clearStoredLoginTime = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(LOGIN_TIME_KEY);
};

export const useAuthStore = create<AuthStore>((set, get) => ({
    user: null,
    loading: true,
    lastActivityTime: null,

    // localStorage 기반 loginTime 관리
    getLoginTime: () => getStoredLoginTime(),
    setLoginTime: (time: number) => setStoredLoginTime(time),
    clearLoginTime: () => clearStoredLoginTime(),

    setUser: (user) => {
        set({ user });
        // 사용자 로그인 시 활동 시각 및 로그인 시각 초기화
        if (user) {
            // 기존 loginTime이 없을 때만 새로 저장 (새로고침 시 유지)
            if (!get().getLoginTime()) {
                get().setLoginTime(Date.now());
            }
            get().updateActivityTime();
        } else {
            get().clearLoginTime();
            get().resetActivityTimer();
        }
    },

    setLoading: (loading) => set({ loading }),

    clearUser: () => {
        set({ user: null, loading: false, lastActivityTime: null });
        get().clearLoginTime();
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
        const { user } = get();
        const loginTime = get().getLoginTime();

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
