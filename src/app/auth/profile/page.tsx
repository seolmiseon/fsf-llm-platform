'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { Card } from '@/components/ui/common/card';
import { Loading } from '@/components/ui/common/loading';
import { Error } from '@/components/ui/common/error';
import { User } from 'lucide-react';
import { TeamCard } from '@/components/league/team/teamCard/TeamCard';
import { TeamResponse } from '@/types/api/responses';
import Image from 'next/image';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';

// interface ProfileData {
//     name: string;
//     email: string;
//     image?: string;
// }

export default function ProfilePage() {
    const { user, loading } = useAuthStore();

    if (loading) return <Loading />;

    if (!user) return <Error message="로그인이 필요합니다." />;

    // 프로필 데이터 안전하게 추출
    const userTeams = (user.teams as TeamResponse[]) || [];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">내 프로필</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 프로필 정보 */}
                <Card className="p-6">
                    <div className="flex items-center space-x-4">
                        {user?.image ? (
                            <Image
                                src={
                                    user.image ||
                                    getPlaceholderImageUrl('league')
                                }
                                alt="Profile"
                                className="rounded-full"
                                sizes="(max-width: 768px) 16px, 16px"
                                onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.src = getPlaceholderImageUrl('league');
                                }}
                            />
                        ) : (
                            <User className="w-16 h-16" />
                        )}
                        <div>
                            <h2 className="text-xl font-semibold">
                                {user?.name || '사용자'}
                            </h2>
                            <p className="text-gray-600">{user?.email}</p>
                        </div>
                    </div>
                </Card>

                {/* 내 팀 - TeamCard 컴포넌트 활용 */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">내 팀</h2>
                    <div className="grid gap-4">
                        {userTeams.map((team) => (
                            <TeamCard
                                key={team.id}
                                team={team}
                                onClick={() => {
                                    // 팀 선택 시 처리할 로직
                                    console.log('Team selected:', team.id);
                                }}
                                competitionId={team.competitionId}
                            />
                        ))}
                    </div>
                </div>

                {/* 활동 내역 */}
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">최근 활동</h2>
                    {/* 활동 내역 컴포넌트 */}
                </Card>
            </div>
        </div>
    );
}
