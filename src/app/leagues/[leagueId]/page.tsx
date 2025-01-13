'use client';
import { TeamDetailModal } from '@/components/client-components/league/team/modals/teamDetailModal/TeamDetailModal';
import { TeamCard } from '@/components/client-components/league/team/teamCard/TeamCard';
import { Dialog, DialogContent } from '@/components/ui/common/dialog';
import { Loading, Error, Empty } from '@/components/ui/common/index';
import { TeamResponse } from '@/types/api/responses';
import { useTeams } from '@/hooks/useTeams';
import { useState } from 'react';

export async function generateStaticParams() {
    return [
        { id: 'PL' }, // Premier League
        { id: 'PD' }, // La Liga
        { id: 'SA' }, // Serie A
        { id: 'BL1' }, // Bundesliga
        { id: 'FL1' }, // Ligue 1
    ];
}

export default function LeaguePage({ params }: { params: { id: string } }) {
    const [open, setOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const { teams, loading, error, refresh } = useTeams(params.id);

    const handleTeamClick = (team: TeamResponse) => {
        setSelectedTeam(team.id.toString());
        setOpen(true);
    };

    if (loading) {
        return <Loading type="cards" count={6} />;
    }

    if (error) {
        return <Error message={error} retry={refresh} />;
    }

    if (!teams.length) {
        return <Empty message="No teams found for this league" />;
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
