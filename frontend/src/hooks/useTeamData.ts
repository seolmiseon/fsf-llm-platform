// hooks/useTeamData.ts
import { useState, useEffect } from 'react';
import { TeamData } from '@/lib/client/api/TeamData';

import { TeamResponse } from '@/types/api/responses';
import { SportsDBApi } from '@/lib/client/api/sportsDB';

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

                const sportsDBApi = new SportsDBApi();

                const enrichedSquad = await Promise.all(
                    data.squad.map(async (player) => {
                        const imageResult = await sportsDBApi.getPlayerImage(
                            player.name
                        );
                        return {
                            ...player,
                            image: imageResult.success
                                ? imageResult.data
                                : player.image || '',
                        };
                    })
                );

                let enrichedCoach = data.coach;
                if (enrichedCoach) {
                    const coachImageResult = await sportsDBApi.getManagerImage(
                        enrichedCoach.name
                    );
                    enrichedCoach = {
                        ...enrichedCoach,
                        image: coachImageResult.success
                            ? coachImageResult.data
                            : undefined,
                    };
                }

                setTeamData({
                    ...data,
                    squad: enrichedSquad,
                    coach: enrichedCoach,
                });
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
