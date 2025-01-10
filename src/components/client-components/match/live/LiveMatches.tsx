'use client';

import { useState, useEffect } from 'react';
import { FootballDataApi } from '@/lib/server/api/football-data';
import { MatchResponse } from '@/types/api/responses';
import { Card } from '@/components/ui/common/card';
import { Loading, Error, Empty } from '@/components/ui/common';

export function LiveMatches() {
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
        } catch (error: any) {
            setError(error.message || 'Failed to load live matches');
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

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, index) => (
                    <div
                        key={index}
                        className="bg-gray-100 animate-pulse rounded-lg h-32"
                    />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <Error
                message={error}
                retry={loadLiveMatches}
                className="text-center"
            />
        );
    }

    if (!matches.length) {
        return <Empty message="No live matches at the moment" />;
    }

    const getMatchStatus = (match: MatchResponse) => {
        switch (match.status) {
            case 'FINISHED':
                return 'Full Time';
            case 'IN_PLAY':
                return 'Live';
            case 'PAUSED':
                return 'Half Time';
            default:
                return match.status;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((match) => (
                <Card
                    key={match.id}
                    className="p-4 hover:shadow-lg transition-shadow"
                >
                    <div className="flex justify-between items-center">
                        <div className="flex-1 text-right">
                            <p className="font-semibold">
                                {match.homeTeam.name}
                            </p>
                            <p className="text-xl font-bold">
                                {match.score.fullTime.home}
                            </p>
                        </div>
                        <div className="mx-4 text-gray-500">vs</div>
                        <div className="flex-1 text-left">
                            <p className="font-semibold">
                                {match.awayTeam.name}
                            </p>
                            <p className="text-xl font-bold">
                                {match.score.fullTime.away}
                            </p>
                        </div>
                    </div>
                    <div className="mt-2 text-center text-sm text-gray-500">
                        {getMatchStatus(match)}
                    </div>
                </Card>
            ))}
        </div>
    );
}
