// app/leagues/[leagueId]/page.tsx
import { TeamCard } from '@/components/client-components/league/teamCard/TeamCard';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useState } from 'react';

interface Team {
    id: string;
    name: string;
    badge: string;
    rank: number;
    // 필요한 다른 속성들
}

export default async function LeaguePage({}) {
    const [open, setOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);

    const handleTeamClick = (team: Team) => {
        setSelectedTeam(team);
        setOpen(true);
    };

    return (
        <>
            <div>
                {teams.map((team: Team) => (
                    <TeamCard
                        key={team.id}
                        team={team}
                        onClick={() => handleTeamClick(team)}
                    />
                ))}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    {selectedTeam && <TeamDetailModal team={selectedTeam} />}
                </DialogContent>
            </Dialog>
        </>
    );
}
