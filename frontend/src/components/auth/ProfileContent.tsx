'use client';
import { useFavorite } from '@/hooks/useFavorite';
import { useAuthStore } from '@/store/useAuthStore';
import { Error, Loading } from '../ui/common';
import { TeamResponse } from '@/types/api/responses';
import { Card } from '../ui/common/card';
import Image from 'next/image';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';
import { User, MessageCircle, LogOut, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
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
    playerId?: string;      // teamId 대신 playerId 사용
    teamName?: string;      // 팀 이름
    teamTla?: string;       // 팀 약어
    teamCrest?: string;     // 팀 로고
    userId: string;
    type?: 'favorite' | 'vote';
    createdAt: Timestamp;
}

type TabType = 'info' | 'teams' | 'cheers' | 'community';

export default function ProfileContent() {
    const { user, loading } = useAuthStore();
    const [activeTab, setActiveTab] = useState<TabType>('info');
    const router = useRouter();

    const handleLogout = async () => {
        try {
            if (auth) {
                await signOut(auth);
                router.push('/');
            }
        } catch (error) {
            console.error('로그아웃 실패:', error);
        }
    };

    if (loading) return <Loading />;
    if (!user) return <Error message="로그인이 필요합니다." />;

    return (
        <div className="space-y-6">
            {/* 프로필 정보 + 액션 버튼 */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
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
                    {/* 설정 & 로그아웃 버튼 */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push('/settings')}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
                            title="설정"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-medium">로그아웃</span>
                        </button>
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
                        ⭐ 내 팀
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
                {activeTab === 'cheers' && <UserCheersTab userId={user.uid} />}
                {activeTab === 'community' && (
                    <UserCommunityTab userId={user.uid} />
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
    const { user } = useAuthStore();
    // ✅ useFavorite 훅을 사용해서 DB에 저장된 '즐겨찾기 목록'을 직접 가져옵니다.
    const { favorites, removeFavorite } = useFavorite(user?.uid || '');

    // 'favorite' 타입인 항목만 필터링 (순수 즐겨찾기만 보여줌)
    const myTeams = favorites.filter(f => f.type === 'favorite');

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">내 팀</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {myTeams.length > 0 ? (
                    myTeams.map((fav) => (
                        <TeamCard
                            key={fav.id}
                            // ✅ 저장된 상세 정보(이름, 로고 등)를 꺼내서 TeamCard에 전달
                            team={{
                                id: parseInt(fav.playerId || '0'),
                                name: fav.teamName || '팀 이름 없음',
                                shortName: fav.teamName || '',
                                tla: fav.teamTla || '',
                                crest: fav.teamCrest || '',
                                // 필수값 채우기 (빈 값)
                                address: '',
                                website: '',
                                founded: 0,
                                clubColors: '',
                                venue: '',
                                squad: [],
                                competitionId: 'PL' // 기본값 혹은 저장된 값
                            }}
                            onClick={() => {
                                console.log('Team selected:', fav.playerId);
                            }}
                            competitionId="PL" 
                            isFavorite={true} // '내 팀' 탭이니까 하트는 항상 채워져 있음
                            onFavoriteClick={() => removeFavorite(fav.id)} // 여기서 하트 누르면 삭제됨
                        />
                    ))
                ) : (
                    <div className="col-span-full">
                        <Card className="p-8 text-center">
                            <p className="text-gray-500 mb-2">아직 선택한 팀이 없습니다.</p>
                            <p className="text-sm text-gray-400">FanPicker에서 좋아하는 팀을 추가해보세요!</p>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}

interface UserIdTabProps {
    userId: string;
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
