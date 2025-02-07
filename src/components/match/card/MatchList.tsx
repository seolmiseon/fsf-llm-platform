'use client';

import { useState, useEffect } from 'react';
import { MatchResponse } from '@/types/api/responses';
import { MatchCard } from './MatchCard';

interface MatchListProps {
    selectedDate: Date;
}

export default function MatchList({ selectedDate }: MatchListProps) {
    const [matches, setMatches] = useState<MatchResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMatchesByDate = async () => {
            try {
                const dateStr = selectedDate.toISOString().split('T')[0];
                const response = await fetch(`/api/football-api?path=matches`);
                const data = await response.json();

                // 선택된 날짜의 경기만 필터링
                const filteredMatches = data.matches.filter(
                    (match: MatchResponse) =>
                        match.utcDate.split('T')[0] === dateStr
                );

                setMatches(filteredMatches);
            } catch (error) {
                console.error('Failed to fetch matches:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMatchesByDate();
    }, [selectedDate]);

    if (loading) {
        return <div className="flex justify-center p-4">Loading...</div>;
    }

    if (matches.length === 0) {
        return (
            <div className="text-gray-500 p-4 text-center">
                이 날짜에는 경기가 없습니다.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((match) => (
                <MatchCard
                    key={match.id}
                    match={match}
                    isActive={
                        match.utcDate.split('T')[0] ===
                        selectedDate.toISOString().split('T')[0]
                    }
                />
            ))}
        </div>
    );
}
