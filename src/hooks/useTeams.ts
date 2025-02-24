import { useState, useEffect, useCallback } from 'react';
import { FootballDataApi } from '@/lib/client/api/football-data';
import { TeamResponse } from '@/types/api/responses';

export const useTeams = (competitionId: string) => {
    const [teams, setTeams] = useState<TeamResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTeams = useCallback(async () => {
        try {
            if (!competitionId) {
                setError('Competition ID is required');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            const api = new FootballDataApi();
            const result = await api.getTeamsByCompetition(competitionId);

            console.log('Teams data structure:', {
                success: result.success,
                data: result.success ? result.data : null,
                error: 'error' in result ? result.error : null,
            });

            if (result.success) {
                console.log('Setting teams:', result.data);
                setTeams(result.data);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to load teams'
            );
        } finally {
            setLoading(false);
        }
    }, [competitionId]);

    useEffect(() => {
        loadTeams();
    }, [loadTeams]);

    return {
        teams,
        loading,
        error,
        refresh: loadTeams,
    };
};
