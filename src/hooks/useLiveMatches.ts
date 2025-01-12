import { useState, useEffect } from 'react';
import { MatchResponse } from '@/types/api/responses';
import { FootballDataApi } from '@/lib/server/api/football-data';

export const useLiveMatches = () => {
    const [matches, setMatches] = useState<MatchResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadLiveMatches = async () => {
        try {
            const api = new FootballDataApi();
            const result = await api.getLiveMatches();

            if (!result.success) {
                setError(result.error);
                return;
            }

            setMatches(result.data);
        } catch (error) {
            setError('Failed to fetch live matches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLiveMatches();
        // 5분마다 업데이트
        const interval = setInterval(loadLiveMatches, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return { matches, loading, error, refetch: loadLiveMatches };
};
