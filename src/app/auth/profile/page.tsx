'use client';

import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/common/card';
import { Loading, Error } from '@/components/ui/common/';
import { User } from 'lucide-react';
import { TeamCard } from '@/components/league/team/teamCard/TeamCard';
import { TeamResponse } from '@/types/api/responses';

interface ProfileData {
    name: string;
    email: string;
    image?: string;
}

export default function ProfilePage() {
    const { data: session, status } = useSession({
        required: true, // 페이지에 인증 필수 설정
        onUnauthenticated() {
            // 인증되지 않은 경우의 처리를 커스터마이즈 할 수 있습니다
            return (
                <Error message="로그인이 필요한 페이지입니다. 로그인 후 이용해주세요." />
            );
        },
    });

    if (status === 'loading') {
        return <Loading />;
    }

    if (!session?.user) {
        return <Error message="사용자 정보를 불러올 수 없습니다." />;
    }

    // 프로필 데이터 안전하게 추출
    const userTeams = (session.user.teams as TeamResponse[]) || [];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">내 프로필</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 프로필 정보 */}
                <Card className="p-6">
                    <div className="flex items-center space-x-4">
                        {session.user?.image ? (
                            <img
                                src={session.user.image}
                                alt="Profile"
                                className="w-16 h-16 rounded-full"
                            />
                        ) : (
                            <User className="w-16 h-16" />
                        )}
                        <div>
                            <h2 className="text-xl font-semibold">
                                {session.user?.name || '사용자'}
                            </h2>
                            <p className="text-gray-600">
                                {session.user?.email}
                            </p>
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
