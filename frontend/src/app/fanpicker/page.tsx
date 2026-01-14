'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavorite } from '@/hooks/useFavorite';
import { CheerMessageBoard } from '@/components/FanPickStar/CheerMessageBoard';
import { useModalStore } from '@/store/useModalStore';
import { BackendApi } from '@/lib/client/api/backend';
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
    const backendApi = useMemo(() => new BackendApi(), []);

    // 경쟁 ID (리그 ID)
    const competitionId = 'PL'; // 예: Premier League

    // 팀 데이터 가져오기
    useEffect(() => {
        async function fetchTeams() {
            setIsLoading(true);
            setError(null);

            try {
                const response = await backendApi.getTeams(competitionId);

                if (response.success && response.data) {
                    // BackendApi.fetch()가 이미 data를 추출하므로 response.data를 직접 사용
                    const teamsData = response.data;
                    const fetchedTeams: TeamResponse[] = Array.isArray(teamsData)
                        ? teamsData.map((team: any) => ({
                              id: team.id || parseInt(team.team_id || '0'),
                              name: team.name || team.shortName || '',
                              shortName: team.shortName || team.name || '',
                              tla: team.tla || team.shortName?.substring(0, 3).toUpperCase() || '',
                              crest: team.crest || team.crestUrl || '',
                              address: team.address || '',
                              website: team.website || '',
                              founded: team.founded || 0,
                              clubColors: team.clubColors || '',
                              venue: team.venue || '',
                              squad: team.squad || [],
                              competitionId,
                          }))
                        : [];

                    setTeams(fetchedTeams);
                } else {
                    setError(response.error || '팀 데이터를 가져오지 못했습니다.');
                }
            } catch (err) {
                const error = err as Error;
                setError(`데이터를 가져오지 못했습니다: ${error.message}`);
                console.error('팀 데이터 가져오기 실패:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchTeams();
    }, [backendApi, competitionId]);

    // 즐겨찾기 처리
    const handleFavoriteClick = async (teamId: string) => {
        console.log('🔍 [FanPicker] handleFavoriteClick 호출됨!', { 
            teamId, 
            user: !!user,
            userId: user?.uid,
            timestamp: new Date().toISOString()
        });

        if (!user) {
            console.warn('❌ User not logged in');
            alert('로그인이 필요합니다.');
            return;
        }

        try {
            if (isFavorite(teamId)) {
                console.log('🗑️ Removing favorite:', teamId);
                const favoriteToRemove = favorites.find(
                    (f) => f.playerId === teamId
                );
                if (favoriteToRemove) {
                    const success = await removeFavorite(favoriteToRemove.id);
                    if (success) {
                        console.log('✅ Favorite removed successfully');
                    } else {
                        console.error('❌ Failed to remove favorite');
                        alert('즐겨찾기 제거에 실패했습니다.');
                    }
                }
            } else {
                console.log('⭐ Adding favorite:', teamId);
                const success = await addFavorite({
                    userId: user.uid,
                    playerId: teamId,
                    type: 'favorite',
                });
                if (success) {
                    console.log('✅ Favorite added successfully');
                } else {
                    console.error('❌ Failed to add favorite');
                    alert('즐겨찾기 추가에 실패했습니다.');
                }
            }
        } catch (error) {
            console.error('❌ handleFavoriteClick error:', error);
            alert('오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
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
