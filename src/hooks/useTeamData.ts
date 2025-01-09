// hooks/useTeamData.ts
import { useState, useEffect } from 'react';
import { TeamData } from '@/lib/server/api/TeamData';

import { TeamResponse } from '@/types/api/responses';

export function useTeamData(teamId: string, competitionId: string) {
    const [teamData, setTeamData] = useState<TeamResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchTeamData = async () => {
            try {
                setLoading(true);
                const teamDataService = new TeamData();
                const data = await teamDataService.getTeamDetailedInfo(
                    competitionId,
                    teamId
                );
                setTeamData(data);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err
                        : new Error('Failed to fetch team data')
                );
            } finally {
                setLoading(false);
            }
        };

        fetchTeamData();
    }, [teamId, competitionId]);

    return { teamData, loading, error };
}
