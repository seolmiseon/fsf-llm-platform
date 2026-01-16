import { useEffect, useRef } from 'react';
import { useLiveMatchesStore } from '@/store/useLiveMatchesStore';

export const useLiveMatches = () => {
    const { matches, loading, error, fetchMatches, clearError } = useLiveMatchesStore();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // 컴포넌트 마운트 시 데이터 fetch
        fetchMatches();

        // 5분마다 업데이트 (API rate limit 방지)
        intervalRef.current = setInterval(() => {
            fetchMatches();
        }, 5 * 60 * 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchMatches]);

    return {
        matches,
        loading,
        error,
        refetch: fetchMatches,
        clearError
    };
};
