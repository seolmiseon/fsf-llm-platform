import { create } from 'zustand';
import { MatchResponse } from '@/types/api/responses';
import { FootballDataApi } from '@/lib/client/api/football-data';

interface LiveMatchesStore {
    matches: MatchResponse[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
    fetchMatches: () => Promise<void>;
    clearError: () => void;
}

// 캐시 유효 시간: 5분
const CACHE_DURATION = 5 * 60 * 1000;

export const useLiveMatchesStore = create<LiveMatchesStore>((set, get) => ({
    matches: [],
    loading: false,
    error: null,
    lastFetched: null,

    fetchMatches: async () => {
        const { lastFetched, loading } = get();

        // 이미 로딩 중이면 중복 호출 방지
        if (loading) return;

        // 캐시가 유효하면 API 호출 안 함
        if (lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
            return;
        }

        set({ loading: true, error: null });

        try {
            const api = new FootballDataApi();
            const result = await api.getLiveMatches();

            if (!result.success) {
                set({
                    error: result.error || '라이브 매치를 불러오는데 실패했습니다.',
                    loading: false
                });
                return;
            }

            if (!Array.isArray(result.data)) {
                set({ error: 'Invalid data format', loading: false });
                return;
            }

            const sortedMatches = result.data.sort(
                (a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
            );

            set({
                matches: sortedMatches,
                loading: false,
                lastFetched: Date.now()
            });

            // localStorage에도 캐시
            if (typeof window !== 'undefined') {
                localStorage.setItem('liveMatches', JSON.stringify(sortedMatches));
            }
        } catch (err) {
            console.error('Live matches fetch error:', err);
            set({
                error: err instanceof Error ? err.message : 'Unknown error',
                loading: false
            });
        }
    },

    clearError: () => set({ error: null }),
}));

// 초기 로드 시 localStorage에서 캐시 복원
if (typeof window !== 'undefined') {
    const cachedData = localStorage.getItem('liveMatches');
    if (cachedData) {
        try {
            const matches = JSON.parse(cachedData);
            useLiveMatchesStore.setState({ matches });
        } catch (e) {
            // 파싱 실패 시 무시
        }
    }
}
