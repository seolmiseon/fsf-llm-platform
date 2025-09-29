'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavorite } from '@/hooks/useFavorite';
import { CheerMessageBoard } from '@/components/FanPickStar/CheerMessageBoard';
import { useModalStore } from '@/store/useModalStore';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TeamResponse } from '@/types/api/responses';
import { Loading } from '@/components/ui/common';
import { TeamCard } from '@/components/league/team/teamCard/TeamCard';

export default function FanPickerPage() {
    const { user } = useAuthStore();
    const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorite(
        user?.uid || ''
    );
    const [teams, setTeams] = useState<TeamResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { open } = useModalStore();

    // 경쟁 ID (리그 ID)
    const competitionId = 'PL'; // 예: Premier League

    // 팀 데이터 가져오기
    useEffect(() => {
        async function fetchTeams() {
            if (!db) return;

            setIsLoading(true);
            setError(null);

            try {
                const teamsRef = collection(db, 'teams');
                const teamsQuery = query(teamsRef, orderBy('name'));
                const snapshot = await getDocs(teamsQuery);

                const fetchedTeams: TeamResponse[] = [];

                snapshot.forEach((doc) => {
                    const teamData = doc.data() as TeamResponse;
                    fetchedTeams.push({
                        ...teamData,
                        id: parseInt(doc.id),
                        competitionId,
                    });
                });

                setTeams(fetchedTeams);
                setIsLoading(false);
            } catch (err) {
                const error = err as Error;
                setError(`데이터를 가져오지 못했습니다: ${error.message}`);
                setIsLoading(false);
                console.error('팀 데이터 가져오기 실패:', error);
            }
        }

        fetchTeams();
    }, []);

    // 즐겨찾기 처리
    const handleFavoriteClick = async (teamId: string) => {
        if (!user) return;

        if (isFavorite(teamId)) {
            const favoriteToRemove = favorites.find(
                (f) => f.playerId === teamId
            );
            if (favoriteToRemove) {
                await removeFavorite(favoriteToRemove.id);
            }
        } else {
            await addFavorite({
                userId: user.uid,
                playerId: teamId,
                type: 'favorite',
            });
        }
    };

    // 팀 카드 클릭 핸들러
    const handleTeamClick = (teamId: number) => {
        open('teamDetail', {
            kind: 'team',
            teamId: teamId.toString(),
            competitionId,
        });
    };

    // 로딩 상태 처리
    if (isLoading) return <Loading />;

    // 오류 상태 처리
    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                    <p>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Fan Picker</h1>

            {/* 팀 목록 */}
            <div className="mb-12">
                <h2 className="text-2xl font-bold mb-4">팀 선택</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {teams.map((team) => (
                        <TeamCard
                            key={team.id}
                            team={team}
                            onClick={() => handleTeamClick(team.id)}
                            competitionId={competitionId}
                            onFavoriteClick={() =>
                                handleFavoriteClick(team.id.toString())
                            } // 추가된 부분
                            isFavorite={isFavorite(team.id.toString())} // 추가된 부분
                        />
                    ))}
                </div>
            </div>

            {/* 즐겨찾기 목록 */}
            {favorites.length > 0 && (
                <div className="mt-12 bg-gray-50 p-6 rounded-lg">
                    <h2 className="text-2xl font-bold mb-4">나의 픽</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {favorites.map((favorite) => {
                            const team = teams.find(
                                (t) => t.id.toString() === favorite.playerId
                            );
                            if (!team) return null;

                            return (
                                <TeamCard
                                    key={favorite.id}
                                    team={team}
                                    onClick={() => handleTeamClick(team.id)}
                                    competitionId={competitionId}
                                    onFavoriteClick={() =>
                                        handleFavoriteClick(team.id.toString())
                                    } // 추가된 부분
                                    isFavorite={isFavorite(team.id.toString())} // 추가된 부분
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 응원 메시지 보드 */}
            <div className="mt-16">
                <h2 className="text-2xl font-bold mb-6">응원 메시지</h2>
                <CheerMessageBoard />
            </div>
        </div>
    );
}
