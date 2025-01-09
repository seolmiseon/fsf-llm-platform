'use client';
import { TeamDetailModal } from '@/components/client-components/league/team/modals/teamDetailModal/TeamDetailModal';
import { TeamCard } from '@/components/client-components/league/team/teamCard/TeamCard';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FootballDataApi } from '@/lib/server/api/football-data';
import { TeamResponse } from '@/types/api/responses';
import { useEffect, useState } from 'react';

export default function LeaguePage({ params }: { params: { id: string } }) {
    const [open, setOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [teams, setTeams] = useState<TeamResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadTeams = async () => {
            try {
                const footballApi = new FootballDataApi();
                const teamsData = await footballApi.getTeamsByCompetition(
                    params.id
                );
                setTeams(teamsData);
            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load teams'
                );
            } finally {
                setLoading(false);
            }
        };

        loadTeams();
    }, [params.id]);

    const handleTeamClick = (team: TeamResponse) => {
        setSelectedTeam(team.id.toString());
        setOpen(true);
    };

    if (loading) {
        return <div>Loading teams...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {teams.map((team) => (
                    <TeamCard
                        key={team.id}
                        team={team}
                        competitionId={params.id}
                        onClick={() => handleTeamClick(team)}
                    />
                ))}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    {selectedTeam && (
                        <TeamDetailModal
                            teamId={selectedTeam}
                            competitionId={params.id}
                            onClose={() => setOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
