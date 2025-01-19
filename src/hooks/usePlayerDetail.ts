import { useState, useEffect } from 'react';
import { PlayerDetailedInfo } from '@/types/api/responses';

export const usePlayerDetail = (playerId: number, teamId: string) => {
    const [playerDetail, setPlayerDetail] = useState<PlayerDetailedInfo | null>(
        null
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlayerDetail = async () => {
            setLoading(true);
            try {
                // TheSportsDB API 엔드포인트로 요청
                const response = await fetch(
                    `/api/sports-db?platerId=${playerId}/&teamId=${teamId}`
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch player details');
                }

                const data = await response.json();
                setPlayerDetail(data);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to fetch player details'
                );
            } finally {
                setLoading(false);
            }
        };

        if (playerId) {
            fetchPlayerDetail();
        }
    }, [playerId, teamId]);

    return { playerDetail, loading, error };
};
