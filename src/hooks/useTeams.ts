import { useState, useEffect, useCallback } from 'react';
import { FootballDataApi } from '@/lib/server/api/football-data';
import { TeamResponse } from '@/types/api/responses';

export const useTeams = (competitionId: string) => {
    const [teams, setTeams] = useState<TeamResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTeams = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const api = new FootballDataApi();
            const result = await api.getTeamsByCompetition(competitionId);

            if (result.success) {
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
