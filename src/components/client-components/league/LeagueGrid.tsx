'use client';

import { useState, useEffect } from 'react';
import { LeagueCard } from './LeagueCard';
import { FootballDataApi } from '@/lib/server/api/football-data';
import type { Competition } from '@/types/api-responses';

export function LeagueGrid() {
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadCompetitions = async () => {
            try {
                const footballApi = new FootballDataApi();
                const data = await footballApi.getCompetitions();

                const majorLeagues = data.filter(
                    (comp) =>
                        comp.type === 'LEAGUE' &&
                        [
                            'PL',
                            'BL1',
                            'SA',
                            'PD',
                            'FL1',
                            'CL',
                            'KL1',
                            'KL2',
                        ].includes(comp.code)
                );
                setCompetitions(majorLeagues);
            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load competitions'
                );
            } finally {
                setLoading(false);
            }
        };
    });
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {competitions.map((competition) => (
                <LeagueCard key={competition.id} competition={competition} />
            ))}
        </div>
    );
}
