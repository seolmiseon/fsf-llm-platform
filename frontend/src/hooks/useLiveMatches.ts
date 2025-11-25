import { useState, useEffect, useCallback } from 'react';
import { MatchResponse } from '@/types/api/responses';
import { FootballDataApi } from '@/lib/client/api/football-data';

export const useLiveMatches = () => {
    const [matches, setMatches] = useState<MatchResponse[]>(() => {
        if (typeof window !== 'undefined') {
            const cachedData = localStorage.getItem('liveMatches');
            return cachedData ? JSON.parse(cachedData) : [];
        }
        return [];
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadLiveMatches = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const api = new FootballDataApi();
            const result = await api.getLiveMatches();

            if (!result.success) {
                setError(result.error);
                return;
            }

            console.log('useLiveMatches - API result:', {
                success: result.success,
                dataType: typeof result.data,
                isArray: Array.isArray(result.data),
                data: result.data,
            });

            if (!Array.isArray(result.data)) {
                console.error('Invalid data format:', result.data);
                setError('Invalid data format received');
                return;
            }

            const sortedMatches = result.data.sort(
                (a, b) =>
                    new Date(b.utcDate).getTime() -
                    new Date(a.utcDate).getTime()
            );

            setMatches(sortedMatches);
            if (typeof window !== 'undefined') {
                localStorage.setItem('liveMatches', JSON.stringify(sortedMatches));
            }
        } catch (error) {
            console.error('Error:', error);
            setError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLiveMatches();

        // 10초마다 실시간 업데이트 (Live Matches용)
        const interval = setInterval(loadLiveMatches, 10 * 1000);
        return () => clearInterval(interval);
    }, [loadLiveMatches]);

    return { matches, loading, error, refetch: loadLiveMatches };
};
