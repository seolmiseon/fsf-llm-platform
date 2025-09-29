'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { Error, Loading } from '../ui/common';
import { TeamResponse } from '@/types/api/responses';
import { Card } from '../ui/common/card';
import Image from 'next/image';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';
import { Star, User, MessageCircle } from 'lucide-react';
import { TeamCard } from '../league/team/teamCard/TeamCard';
import {
    collection,
    getDocs,
    query,
    Timestamp,
    where,
    limit,
    orderBy,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';

interface FavoriteTeam {
    id: string;
    teamId: string;
    userId: string;
    createdAt: Timestamp;
}

type TabType = 'info' | 'teams' | 'favorites' | 'cheers' | 'community';

export default function ProfileContent() {
    const { user, loading } = useAuthStore();
    const [activeTab, setActiveTab] = useState<TabType>('info');

    if (loading) return <Loading />;
    if (!user) return <Error message="로그인이 필요합니다." />;

    return (
        <div className="space-y-6">
            {/* 프로필 정보 */}
            <Card className="p-6">
                <div className="flex items-center space-x-4">
                    {user?.image ? (
                        <Image
                            src={user.image || getPlaceholderImageUrl('league')}
                            alt="Profile"
                            width={64}
                            height={64}
                            className="rounded-full"
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

            {/* 탭 메뉴 */}
            <div className="border-b">
                <div className="flex space-x-2 overflow-x-auto">
                    <TabButton
                        active={activeTab === 'info'}
                        onClick={() => setActiveTab('info')}
                    >
                        정보
                    </TabButton>
                    <TabButton
                        active={activeTab === 'teams'}
                        onClick={() => setActiveTab('teams')}
                    >
                        내 팀
                    </TabButton>
                    <TabButton
                        active={activeTab === 'favorites'}
                        onClick={() => setActiveTab('favorites')}
                    >
                        즐겨찾기
                    </TabButton>
                    <TabButton
                        active={activeTab === 'cheers'}
                        onClick={() => setActiveTab('cheers')}
                    >
                        응원 메시지
                    </TabButton>
                    <TabButton
                        active={activeTab === 'community'}
                        onClick={() => setActiveTab('community')}
                    >
                        커뮤니티
                    </TabButton>
                </div>
            </div>

            {/* 탭 콘텐츠 */}
            <div className="mt-6">
                {activeTab === 'info' && <UserInfoTab user={user} />}
                {activeTab === 'teams' && <UserTeamsTab />}
                {activeTab === 'favorites' && (
                    <UserFavoritesTab userId={user.id} />
                )}
                {activeTab === 'cheers' && <UserCheersTab userId={user.id} />}
                {activeTab === 'community' && (
                    <UserCommunityTab userId={user.id} />
                )}
            </div>
        </div>
    );
}

// 탭 버튼 컴포넌트 타입 지정
interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
    return (
        <button
            className={`px-4 py-2 font-medium border-b-2 ${
                active
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

interface UserTabProps {
    user: any;
}

function UserInfoTab({ user }: UserTabProps) {
    return (
        <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">기본 정보</h2>
            <div className="space-y-3">
                <div>
                    <p className="text-sm text-gray-500">이름</p>
                    <p>{user?.name || '정보 없음'}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">이메일</p>
                    <p>{user?.email || '정보 없음'}</p>
                </div>
                {/* 추가 사용자 정보 */}
            </div>
        </Card>
    );
}

function UserTeamsTab() {
    const { user } = useAuthStore(); // 또는 props로 user 객체 전체를 전달할 수도 있습니다
    const userTeams = (user?.teams as TeamResponse[]) || [];

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">내 팀</h2>
            <div className="grid gap-4">
                {userTeams.length > 0 ? (
                    userTeams.map((team) => (
                        <TeamCard
                            key={team.id}
                            team={team}
                            onClick={() => {
                                // 팀 선택 시 처리할 로직
                                console.log('Team selected:', team.id);
                            }}
                            competitionId={team.competitionId}
                        />
                    ))
                ) : (
                    <Card className="p-4 text-center">
                        <p className="text-gray-500">등록된 팀이 없습니다.</p>
                    </Card>
                )}
            </div>
        </div>
    );
}
interface UserIdTabProps {
    userId: string;
}

function UserFavoritesTab({ userId }: UserIdTabProps) {
    const [favoriteTeams, setFavoriteTeams] = useState<FavoriteTeam[]>([]);
    const [favoritesLoading, setFavoritesLoading] = useState(true);

    // 사용자의 즐겨찾기 팀 불러오기
    useEffect(() => {
        const fetchFavoriteTeams = async () => {
            if (!db || !userId) return;

            try {
                // 'favorites' 컬렉션에서 현재 사용자의 즐겨찾기 팀 조회
                const favoritesRef = collection(db, 'favorites');
                const q = query(favoritesRef, where('userId', '==', userId));
                const querySnapshot = await getDocs(q);

                const teams: FavoriteTeam[] = [];
                querySnapshot.forEach((doc) => {
                    teams.push({ id: doc.id, ...doc.data() } as FavoriteTeam);
                });

                setFavoriteTeams(teams);
            } catch (error) {
                console.error('Error fetching favorite teams:', error);
            } finally {
                setFavoritesLoading(false);
            }
        };

        fetchFavoriteTeams();
    }, [userId]);

    if (favoritesLoading) return <Loading />;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                즐겨찾기한 팀
            </h2>
            <div className="grid gap-4">
                {favoriteTeams.length > 0 ? (
                    favoriteTeams.map((team) => (
                        <Card
                            key={team.id}
                            className="p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-medium">
                                        {team.teamId}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {team.createdAt
                                            ?.toDate()
                                            .toLocaleDateString() ||
                                            '날짜 정보 없음'}
                                        에 추가됨
                                    </p>
                                </div>
                                <button
                                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
                                    onClick={() => {
                                        console.log(
                                            '팀 상세보기:',
                                            team.teamId
                                        );
                                    }}
                                >
                                    상세보기
                                </button>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="p-4 text-center">
                        <p className="text-gray-500">
                            즐겨찾기한 팀이 없습니다.
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
}

function UserCheersTab({ userId }: UserIdTabProps) {
    const [cheerMessages, setCheerMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCheerMessages = async () => {
            if (!db || !userId) return;

            try {
                const cheersRef = collection(db, 'cheer_messages');
                const q = query(
                    cheersRef,
                    where('userId', '==', userId),
                    orderBy('createdAt', 'desc'),
                    limit(10)
                );
                const querySnapshot = await getDocs(q);

                const messages: any[] = [];
                querySnapshot.forEach((doc) => {
                    messages.push({ id: doc.id, ...doc.data() });
                });

                setCheerMessages(messages);
            } catch (error) {
                console.error('Error fetching cheer messages:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCheerMessages();
    }, [userId]);

    if (loading) return <Loading />;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-green-500" />내 응원
                메시지
            </h2>
            <div className="grid gap-4">
                {cheerMessages.length > 0 ? (
                    cheerMessages.map((message) => (
                        <Card
                            key={message.id}
                            className="p-4 hover:shadow-md transition-shadow"
                        >
                            <p className="font-medium text-gray-800">
                                {message.message}
                            </p>
                            <div className="flex justify-between mt-2">
                                <p className="text-sm text-gray-500">
                                    {message.createdAt
                                        ?.toDate()
                                        .toLocaleDateString() ||
                                        '날짜 정보 없음'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    좋아요: {message.likes || 0}
                                </p>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="p-4 text-center">
                        <p className="text-gray-500">
                            작성한 응원 메시지가 없습니다.
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
}

function UserCommunityTab({ userId }: UserIdTabProps) {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCommunityPosts = async () => {
            if (!db || !userId) return;

            try {
                const postsRef = collection(db, 'community');
                const q = query(
                    postsRef,
                    where('userId', '==', userId),
                    orderBy('createdAt', 'desc'),
                    limit(10)
                );
                const querySnapshot = await getDocs(q);

                const fetchedPosts: any[] = [];
                querySnapshot.forEach((doc) => {
                    fetchedPosts.push({ id: doc.id, ...doc.data() });
                });

                setPosts(fetchedPosts);
            } catch (error) {
                console.error('Error fetching community posts:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCommunityPosts();
    }, [userId]);

    if (loading) return <Loading />;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">내 커뮤니티 게시글</h2>
            <div className="grid gap-4">
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <Card
                            key={post.id}
                            className="p-4 hover:shadow-md transition-shadow"
                        >
                            <h3 className="font-medium text-lg">
                                {post.title || '제목 없음'}
                            </h3>
                            <p className="text-gray-700 mt-1 line-clamp-2">
                                {post.content}
                            </p>
                            <div className="flex justify-between mt-2">
                                <p className="text-sm text-gray-500">
                                    {post.createdAt
                                        ?.toDate()
                                        .toLocaleDateString() ||
                                        '날짜 정보 없음'}
                                </p>
                                <div className="flex space-x-2">
                                    <p className="text-sm text-gray-500">
                                        댓글: {post.commentCount || 0}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        좋아요: {post.likeCount || 0}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="p-4 text-center">
                        <p className="text-gray-500">
                            작성한 게시글이 없습니다.
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
}
